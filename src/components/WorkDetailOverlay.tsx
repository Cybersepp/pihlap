import { useEffect } from 'react';
import { motion, usePresence } from 'framer-motion';
import { Work } from '../data/works';
import { useScramble } from '../lib/scramble';

// A run of text that scrambles itself in on mount and back out when `active`
// flips false, matching the spiral title's scramble language. Different speeds
// per field give a staggered decode/encode.
function Scramble({
  as: Tag = 'span',
  text,
  className,
  charsPerSec,
  active = true,
}: {
  as?: 'span' | 'p' | 'h2';
  text: string;
  className?: string;
  charsPerSec?: number;
  active?: boolean;
}) {
  const decoded = useScramble(text, active, charsPerSec, true);
  return <Tag className={className}>{decoded}</Tag>;
}

// DOM overlay for the "detail" state: a play button over the (left-shifted) tile
// and a right-hand panel with the work's metadata + links. The 3D tile expansion
// and background spotlight happen in the WebGL scene; this is just the chrome on
// top of the canvas. Hitting play promotes the state to the actual video player.
// Per-field scramble speeds (chars/sec). Reused to size the scramble-out delay
// before the overlay is allowed to unmount.
const FIELD_SPEED = { title: 22, meta: 46, desc: 120 } as const;

export function WorkDetailOverlay({
  work,
  onPlay,
  onClose,
}: {
  work: Work;
  onPlay: () => void;
  onClose: () => void;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const active = isPresent;

  // On exit, keep the overlay mounted long enough for the longest field to churn
  // back into noise, then release it. Slowest field governs the hold.
  useEffect(() => {
    if (isPresent) return;
    const meta = `${work.location} · ${work.year}`;
    const ms =
      Math.max(
        work.title.length / FIELD_SPEED.title,
        meta.length / FIELD_SPEED.meta,
        (work.client?.length ?? 0) / FIELD_SPEED.meta,
        work.description.length / FIELD_SPEED.desc,
      ) * 1000;
    const id = window.setTimeout(() => safeToRemove?.(), ms + 80);
    return () => window.clearTimeout(id);
  }, [isPresent, work, safeToRemove]);

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
          text={`${work.location} · ${work.year}`}
          charsPerSec={FIELD_SPEED.meta}
          active={active}
        />
        {work.client && (
          <Scramble as="p" className="detail-meta detail-client" text={work.client} charsPerSec={FIELD_SPEED.meta} active={active} />
        )}
        <Scramble as="p" className="detail-desc" text={work.description} charsPerSec={FIELD_SPEED.desc} active={active} />
        <div className="detail-actions" style={{ opacity: active ? 1 : 0, transition: 'opacity 200ms ease' }}>
          <button className="detail-watch" onClick={onPlay}>
            ▶ Play video
          </button>
          {work.vimeoUrl && (
            <a className="detail-link" href={work.vimeoUrl} target="_blank" rel="noreferrer">
              Vimeo ↗
            </a>
          )}
          {work.fullPieceUrl && work.fullPieceUrl !== work.vimeoUrl && (
            <a className="detail-link" href={work.fullPieceUrl} target="_blank" rel="noreferrer">
              Full piece ↗
            </a>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}
