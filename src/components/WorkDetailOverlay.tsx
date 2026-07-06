import { Fragment, useEffect } from 'react';
import { motion, usePresence, useReducedMotion, type Variants } from 'framer-motion';
import { Work } from '../data/works';

// DOM overlay for the "detail" state: a right-hand panel with the work's metadata
// and external links (YouTube / Vimeo). The 3D tile expansion, background spotlight,
// and the play affordance all live in the WebGL scene (see WorksSpiral3D); this is
// just the chrome on top of the canvas.
//
// Reveal language: the title does a cinematic clip-wipe; every text field below it
// (meta, client, description, links) shares ONE calm treatment — words fade + drift
// + sharpen (de-blur) in a gentle left-to-right stagger, cascading down the panel.

// Per-word enter/exit used by every text field, so the panel reads as one motion.
function wordVariants(reduce: boolean): Variants {
  return {
    hide: {
      opacity: 0,
      y: reduce ? 0 : 6,
      filter: reduce ? 'blur(0px)' : 'blur(4px)',
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };
}

// A line/paragraph whose words stagger in (and reverse on exit). Words stay
// inline-block units separated by real spaces so long text still wraps. `delayMs`
// holds the whole field before its words begin, letting fields cascade in order.
function WordReveal({
  as = 'p',
  text,
  className,
  active,
  delayMs = 0,
}: {
  as?: 'p' | 'span';
  text: string;
  className?: string;
  active: boolean;
  delayMs?: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const words = text.split(' ');

  const container: Variants = {
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.018, delayChildren: delayMs / 1000 },
    },
    hide: {
      transition: { staggerChildren: 0.006, staggerDirection: -1 },
    },
  };
  const word = wordVariants(reduce);
  const Tag = as === 'span' ? motion.span : motion.p;

  return (
    <Tag className={className} variants={container} initial="hide" animate={active ? 'show' : 'hide'}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <motion.span className="word" variants={word}>
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  );
}

export function WorkDetailOverlay({
  work,
  onClose,
  onPlay,
}: {
  work: Work;
  onClose: () => void;
  onPlay: () => void;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const active = isPresent;
  const reduce = useReducedMotion() ?? false;

  const meta = `${work.location} · ${work.year}`;

  // Cascade delays (ms) — each field waits a beat longer than the one above it so
  // the panel assembles top-to-bottom: title wipe → meta → client → links.
  const metaDelay = 200;
  const clientDelay = 340;
  const linkDelay = (work.client ? clientDelay : metaDelay) + 500;

  // On exit, keep the overlay mounted long enough for every field to fade back out
  // before it's released.
  useEffect(() => {
    if (isPresent) return;
    const id = window.setTimeout(() => safeToRemove?.(), linkDelay + 120);
    return () => window.clearTimeout(id);
  }, [isPresent, linkDelay, safeToRemove]);

  const link = wordVariants(reduce);

  return (
    <>
      {/* Close lives OUTSIDE .detail-overlay's stacking context (and its scroll
          clip) so it can sit above the dev tuning panels — otherwise, in `npm run
          dev`, RibbonControls (z 1000, top-right) covers it and eats the click. */}
      <button
        className="detail-close"
        onClick={onClose}
        aria-label="Close"
        style={{ opacity: active ? 1 : 0, transition: 'opacity 200ms ease' }}
      >
        ✕
      </button>
      <motion.div className="detail-overlay">
      {/* Right-hand metadata panel. The play affordance now lives in the 3D scene,
          pinned to the curved tile (see WorksSpiral3D). */}
      <motion.aside
        className="detail-panel"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
      >
        {/* Title: cinematic clip-wipe reveal (no scramble — a proportional display
            face jitters horizontally under scramble; the wipe also draws in the
            hairline rule as it lands). */}
        <motion.h2
          className="detail-title"
          initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0, y: 10 }}
          animate={
            active
              ? { clipPath: 'inset(0 0 0% 0)', opacity: 1, y: 0 }
              : { clipPath: 'inset(0 0 100% 0)', opacity: 0, y: 10 }
          }
          transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1], delay: active ? 0.12 : 0 }}
        >
          {work.title}
        </motion.h2>
        <WordReveal className="detail-meta" text={meta} active={active} delayMs={metaDelay} />
        {work.client && (
          <WordReveal className="detail-meta detail-client" text={work.client} active={active} delayMs={clientDelay} />
        )}
        <div className="detail-actions">
          <motion.button
            type="button"
            className="detail-link"
            onClick={onPlay}
            variants={link}
            initial="hide"
            animate={active ? 'show' : 'hide'}
            transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay: active ? (linkDelay - 90) / 1000 : 0 }}
          >
            Player ▶
          </motion.button>
          {work.youtubeUrl && (
            <motion.a
              className="detail-link"
              href={work.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              variants={link}
              initial="hide"
              animate={active ? 'show' : 'hide'}
              transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay: active ? linkDelay / 1000 : 0 }}
            >
              YouTube ↗
            </motion.a>
          )}
          {work.vimeoUrl && (
            <motion.a
              className="detail-link"
              href={work.vimeoUrl}
              target="_blank"
              rel="noreferrer"
              variants={link}
              initial="hide"
              animate={active ? 'show' : 'hide'}
              transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay: active ? (linkDelay + 90) / 1000 : 0 }}
            >
              Vimeo ↗
            </motion.a>
          )}
        </div>
      </motion.aside>
      </motion.div>
    </>
  );
}
