import { useEffect, useState } from 'react';
import { motion, usePresence } from 'framer-motion';
import { Work } from '../data/works';
import { useScramble } from '../lib/scramble';

// A run of text that scrambles itself in on mount and back out when `active`
// flips false, matching the spiral title's scramble language. Different speeds
// per field give a staggered decode/encode. `delayMs` holds the field fully
// scrambled before it starts decoding, so it can reveal after earlier fields.
function Scramble({
  as: Tag = 'span',
  text,
  className,
  charsPerSec,
  active = true,
  href,
  delayMs = 0,
}: {
  as?: 'span' | 'p' | 'h2' | 'a';
  text: string;
  className?: string;
  charsPerSec?: number;
  active?: boolean;
  href?: string;
  delayMs?: number;
}) {
  // Gate the decode start; on exit (active false) scramble out immediately.
  const [started, setStarted] = useState(delayMs === 0);
  useEffect(() => {
    if (!active || started) return;
    const id = window.setTimeout(() => setStarted(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, started, delayMs]);
  const decoded = useScramble(text, active && started, charsPerSec, true);
  if (Tag === 'a') {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {decoded}
      </a>
    );
  }
  return <Tag className={className}>{decoded}</Tag>;
}

// DOM overlay for the "detail" state: a right-hand panel with the work's metadata
// and external links (YouTube / Vimeo). The 3D tile expansion, background spotlight,
// and the play affordance all live in the WebGL scene (see WorksSpiral3D); this is
// just the chrome on top of the canvas.
// Per-field scramble speeds (chars/sec). Reused to size the scramble-out delay
// before the overlay is allowed to unmount.
const FIELD_SPEED = { title: 22, meta: 46, desc: 120 } as const;

export function WorkDetailOverlay({
  work,
  onClose,
}: {
  work: Work;
  onClose: () => void;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const active = isPresent;

  // Links reveal last: hold them scrambled until the slowest text field has
  // finished decoding, then start their own scramble-in.
  const meta = `${work.location} · ${work.year}`;
  const linkDelayMs =
    Math.max(
      work.title.length / FIELD_SPEED.title,
      meta.length / FIELD_SPEED.meta,
      (work.client?.length ?? 0) / FIELD_SPEED.meta,
      work.description.length / FIELD_SPEED.desc,
    ) * 1000;

  // On exit, keep the overlay mounted long enough for the longest field to churn
  // back into noise, then release it. Slowest field governs the hold.
  useEffect(() => {
    if (isPresent) return;
    const id = window.setTimeout(() => safeToRemove?.(), linkDelayMs + 80);
    return () => window.clearTimeout(id);
  }, [isPresent, linkDelayMs, safeToRemove]);

  return (
    <motion.div className="detail-overlay">
      {/* Right-hand metadata panel. The play affordance now lives in the 3D scene,
          pinned to the curved tile (see WorksSpiral3D). */}
      <motion.aside
        className="detail-panel"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
      >
        <button
          className="detail-close"
          onClick={onClose}
          aria-label="Close"
          style={{ opacity: active ? 1 : 0, transition: 'opacity 200ms ease' }}
        >
          ✕
        </button>
        <Scramble as="h2" className="detail-title" text={work.title} charsPerSec={FIELD_SPEED.title} active={active} />
        <Scramble
          as="p"
          className="detail-meta"
          text={meta}
          charsPerSec={FIELD_SPEED.meta}
          active={active}
        />
        {work.client && (
          <Scramble as="p" className="detail-meta detail-client" text={work.client} charsPerSec={FIELD_SPEED.meta} active={active} />
        )}
        <Scramble as="p" className="detail-desc" text={work.description} charsPerSec={FIELD_SPEED.desc} active={active} />
        <div className="detail-actions" style={{ opacity: active ? 1 : 0, transition: 'opacity 200ms ease' }}>
          {work.youtubeUrl && (
            <Scramble
              as="a"
              className="detail-link"
              href={work.youtubeUrl}
              text="YouTube ↗"
              charsPerSec={FIELD_SPEED.meta}
              active={active}
              delayMs={linkDelayMs}
            />
          )}
          {work.vimeoUrl && (
            <Scramble
              as="a"
              className="detail-link"
              href={work.vimeoUrl}
              text="Vimeo ↗"
              charsPerSec={FIELD_SPEED.meta}
              active={active}
              delayMs={linkDelayMs}
            />
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}
