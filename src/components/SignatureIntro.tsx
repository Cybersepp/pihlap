import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// The intro flourish: "Martin Pihlap" is drawn on over the blank desktop while the
// 3D bundle + GLB stream in, then settles to a faint backdrop with the 3D figure in
// front (z-figure is 1; this layer sits at 0). Desktop only — App skips it on mobile.
//
// Loads public/assets/signature.svg and adapts to what it finds:
//   • filled paths present  → MASK mode: the filled letters are the picture and the
//     thick "wiper" strokes drive a <mask> that uncovers them in writing order.
//   • stroke-only           → STROKE mode: the strokes are drawn directly (the plain
//     centerline look), animated the same way.
// Swap the SVG to switch modes; signature.brush.svg holds the filled+wiper version.

const SIGNATURE_URL = `${import.meta.env.BASE_URL}assets/signature.svg`;

// A beat of blank desktop before the first stroke lands.
const START_DELAY_MS = 450;
// Total pen time across all strokes. Doubles as the guaranteed-minimum display time.
const MIN_DRAW_MS = 2200;
// A short lift of the pen between strokes so it reads as written, not one sweep.
const STROKE_GAP_MS = 30;
// How fast the ink retracts when the signature is dismissed (quick un-write).
const ERASE_MS = 180;
// How faint the name sits once it settles behind the figure.
const BACKDROP_OPACITY = 0.5;
// Ink-bleed (gooey) filter strength: blur radius spreads the ink, then the alpha
// threshold re-sharpens it into wet, fused blobs where strokes meet.
const INK_BLEED = 3;
const INK_THRESHOLD = 14;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Stroke = { d: string; width: number };
type SigData = { viewBox: string; filled: string[]; strokes: Stroke[] };

export function SignatureIntro({ modelReady, dismissed }: { modelReady: boolean; dismissed: boolean }) {
  const [data, setData] = useState<SigData | null>(null);
  const strokeRefs = useRef<(SVGPathElement | null)[]>([]);
  // Per-stroke {delay, duration} in seconds, from measured path lengths.
  const [timings, setTimings] = useState<{ delay: number; duration: number }[] | null>(null);
  const [drawComplete, setDrawComplete] = useState(false);
  const [settled, setSettled] = useState(false);

  // Load the artwork and split it into filled (picture) and stroked paths.
  useEffect(() => {
    let cancelled = false;
    fetch(SIGNATURE_URL)
      .then((r) => r.text())
      .then((txt) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return;
        const viewBox = svg.getAttribute('viewBox') ?? '0 0 394 189';
        const paths = Array.from(doc.querySelectorAll('path'));
        const filled = paths
          .filter((p) => (p.getAttribute('fill') ?? '').toLowerCase() === 'black')
          .map((p) => p.getAttribute('d') ?? '');
        const strokes = paths
          .filter((p) => (p.getAttribute('stroke') ?? '').toLowerCase() === 'black')
          .map((p) => ({
            d: p.getAttribute('d') ?? '',
            width: parseFloat(p.getAttribute('stroke-width') ?? '10'),
          }));
        setData({ viewBox, filled, strokes });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Once the strokes are in the DOM, measure each so draw time is proportional to
  // length (constant pen speed across long and short strokes).
  useLayoutEffect(() => {
    if (!data || timings) return;
    const lengths = strokeRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    const gaps = Math.max(lengths.length - 1, 0) * STROKE_GAP_MS;
    const drawMs = prefersReducedMotion ? 0 : Math.max(MIN_DRAW_MS - gaps, 600);

    const startMs = prefersReducedMotion ? 0 : START_DELAY_MS;
    let acc = 0;
    const t = lengths.map((len, i) => {
      const duration = (len / total) * drawMs;
      const delay = startMs + acc + i * STROKE_GAP_MS;
      acc += duration;
      return { delay: delay / 1000, duration: duration / 1000 };
    });
    setTimings(t);

    // Mark the draw complete off a deterministic timer (the last stroke's finish).
    const last = t[t.length - 1];
    const totalMs = last ? (last.delay + last.duration) * 1000 : 0;
    const id = window.setTimeout(() => setDrawComplete(true), prefersReducedMotion ? 0 : totalMs);
    return () => window.clearTimeout(id);
  }, [data, timings]);

  // Settle to the backdrop only once the draw has finished *and* the figure is ready;
  // if the model is still loading, the finished name holds until it arrives.
  useEffect(() => {
    if (drawComplete && modelReady) setSettled(true);
  }, [drawComplete, modelReady]);

  // An animated stroke (shared by both modes — black & visible in STROKE mode, white
  // inside the <mask> in MASK mode). Opacity is gated to the stroke's start so the
  // zero-length-dash round cap doesn't flash a dot before the pen touches down.
  const renderStroke = (s: Stroke, i: number, color: string): ReactNode => (
    <motion.path
      key={i}
      ref={(el) => (strokeRefs.current[i] = el)}
      d={s.d}
      stroke={color}
      strokeWidth={s.width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={
        dismissed
          ? { pathLength: 0, opacity: 0 }
          : timings
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
      }
      transition={
        dismissed
          ? {
              pathLength: { duration: ERASE_MS / 1000, ease: 'easeIn' },
              opacity: { delay: (ERASE_MS / 1000) * 0.8, duration: 0.001 },
            }
          : timings
            ? {
                pathLength: { delay: timings[i].delay, duration: timings[i].duration, ease: 'linear' },
                opacity: { delay: timings[i].delay, duration: 0.001 },
              }
            : undefined
      }
    />
  );

  const useMask = !!data && data.filled.length > 0;

  return (
    <motion.div
      className="signature-intro"
      aria-hidden="true"
      animate={{ opacity: settled ? BACKDROP_OPACITY : 1 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      {data && (
        <svg viewBox={data.viewBox} className="signature-intro__svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Ink bleed: blur the line, then crank alpha contrast so the soft halo
                snaps back into a wet, rounded edge that fuses where strokes overlap. */}
            <filter id="sig-ink" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={INK_BLEED} result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${INK_THRESHOLD} -${INK_THRESHOLD / 2}`}
              />
            </filter>
            {useMask && (
              <mask id="sig-reveal">{data.strokes.map((s, i) => renderStroke(s, i, 'white'))}</mask>
            )}
          </defs>
          {useMask ? (
            <g mask="url(#sig-reveal)" filter="url(#sig-ink)">
              {data.filled.map((d, i) => (
                <path key={i} d={d} fill="black" />
              ))}
            </g>
          ) : (
            <g filter="url(#sig-ink)">
              {data.strokes.map((s, i) => renderStroke(s, i, 'black'))}
            </g>
          )}
        </svg>
      )}
    </motion.div>
  );
}
