import { motion } from 'framer-motion';
import { Work } from '../data/works';

// DOM overlay for the "detail" state: a play button over the (left-shifted) tile
// and a right-hand panel with the work's metadata + links. The 3D tile expansion
// and background spotlight happen in the WebGL scene; this is just the chrome on
// top of the canvas. Hitting play promotes the state to the actual video player.
export function WorkDetailOverlay({
  work,
  onPlay,
  onClose,
}: {
  work: Work;
  onPlay: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Play affordance sitting over the tile (left region of the frame). */}
      <button className="detail-play" onClick={onPlay} aria-label={`Play ${work.title}`}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      {/* Right-hand metadata panel. */}
      <motion.aside
        className="detail-panel"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="detail-title">{work.title}</h2>
        <p className="detail-meta">
          {work.location} · {work.year}
        </p>
        {work.client && <p className="detail-meta detail-client">{work.client}</p>}
        <p className="detail-desc">{work.description}</p>
        <div className="detail-actions">
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
