import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Work } from '../data/works';
import { IconClickOrigin } from './DesktopIcon';
import { makeTransformOrigin, springOpen } from '../lib/animation';

interface QuickTimeWindowProps {
  work: Work;
  onClose: () => void;
  isMobile: boolean;
  origin: IconClickOrigin | null;
}

const WIN_WIDTH = 720;
const WIN_HEIGHT = 620;

function PlayIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14">
      <polygon points="2,1 2,13 12,7" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14">
      <rect x="1" y="1" width="3.5" height="12" rx="0.8" fill="currentColor" />
      <rect x="7.5" y="1" width="3.5" height="12" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 6h3l4-3v10l-4-3H3z" />
      <path
        d="M11 5.5a3.5 3.5 0 0 1 0 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function QuickTimeWindow({ work, onClose, isMobile, origin }: QuickTimeWindowProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isGif = /\.gif($|\?)/i.test(work.loopUrl);

  function togglePlay() {
    setIsPlaying((p) => !p);
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  }

  const windowStyle: React.CSSProperties = isMobile
    ? {}
    : {
        top: '50%',
        left: '50%',
        translate: '-50% -50%',
        width: WIN_WIDTH,
        maxHeight: 'calc(100vh - 60px)',
      };

  return (
    <motion.div
      className={`window qt-window${isMobile ? ' window--fullscreen' : ''}`}
      style={{
        ...windowStyle,
        transformOrigin: isMobile ? '50% 50%' : makeTransformOrigin(origin, WIN_WIDTH, WIN_HEIGHT),
        zIndex: 200,
      }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={springOpen}
    >
      <div className="window-titlebar">
        <div className="traffic-lights">
          <button className="tl tl--close" onClick={onClose} aria-label="Close" />
          <span className="tl tl--min tl--dim" aria-hidden="true" />
          <span className="tl tl--zoom tl--dim" aria-hidden="true" />
        </div>
        <span className="window-titlebar-title">{work.filename}</span>
      </div>

      <div className="qt-body">
        <div className="qt-video-wrap">
          {work.loopUrl ? (
            isGif ? (
              <img src={work.loopUrl} alt={work.title} />
            ) : (
              <video
                ref={videoRef}
                src={work.loopUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            )
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1a1a22 0%, #2a2a35 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12,
              }}
            >
              {work.filename}
            </div>
          )}

          {/* Floating glass controls overlay */}
          <div className="qt-controls">
            <button className="qt-play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="qt-scrubber" role="slider" aria-label="Scrubber">
              <div className="qt-scrubber-fill" />
            </div>
            <span className="qt-time">00:08</span>
            <span className="qt-vol" aria-label="Volume">
              <SpeakerIcon />
            </span>
          </div>
        </div>

        {/* Metadata panel */}
        <div className="qt-meta">
          <h2 className="qt-meta-title">{work.title}</h2>
          <p className="qt-meta-sub">
            {work.client ? `${work.client} · ` : ''}
            {work.year} · {work.location}
          </p>

          <div className="qt-meta-grid">
            <span className="qt-meta-key">Year</span>
            <span className="qt-meta-val">{work.year}</span>
            {work.client && (
              <>
                <span className="qt-meta-key">Client</span>
                <span className="qt-meta-val">{work.client}</span>
              </>
            )}
            <span className="qt-meta-key">Location</span>
            <span className="qt-meta-val">{work.location}</span>
          </div>

          <div className="qt-meta-divider" />

          <p className="qt-meta-section-label">Description</p>
          <p className="qt-meta-para">{work.description}</p>

          <p className="qt-meta-section-label">Process</p>
          <p className="qt-meta-para">{work.process}</p>

          <a
            href={work.fullPieceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="qt-meta-link"
          >
            Watch full piece
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 6h6m0 0L6.5 3.5M9 6L6.5 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
