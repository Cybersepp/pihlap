import { useState } from 'react';
import { Work } from '../data/works';

interface QuickTimeWindowProps {
  work: Work;
  onClose: () => void;
  isMobile: boolean;
}

export function QuickTimeWindow({ work, onClose, isMobile }: QuickTimeWindowProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  const windowStyle: React.CSSProperties = isMobile
    ? {}
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 520,
        zIndex: 200,
      };

  return (
    <div
      className={`os9-qt-window${isMobile ? ' os9-window-fullscreen' : ''}`}
      style={windowStyle}
    >
      {/* QT Title bar */}
      <div className="os9-qt-titlebar">
        <button className="os9-qt-closebox" onClick={onClose} aria-label="Close" />
        <span className="os9-qt-titlebar-title">{work.filename}</span>
      </div>

      {/* Video area */}
      <div className="os9-qt-video">
        {work.loopUrl ? (
          <video
            src={work.loopUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid #4488FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <polygon points="6,3 6,17 18,10" fill="#4488FF" />
              </svg>
            </div>
            <span style={{ color: '#555', fontSize: 10, fontFamily: 'Geneva, sans-serif' }}>
              {work.filename}
            </span>
          </div>
        )}
      </div>

      {/* Controller */}
      <div className="os9-qt-controller">
        <button
          className="os9-qt-play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="8" height="10" viewBox="0 0 8 10">
              <rect x="0" y="0" width="3" height="10" fill="#CCCCCC" />
              <rect x="5" y="0" width="3" height="10" fill="#CCCCCC" />
            </svg>
          ) : (
            <svg width="8" height="10" viewBox="0 0 8 10">
              <polygon points="0,0 0,10 8,5" fill="#CCCCCC" />
            </svg>
          )}
        </button>
        <div className="os9-qt-scrubber">
          <div className="os9-qt-scrubber-thumb" />
        </div>
        <span className="os9-qt-time">0:00 / {work.year}</span>
        <div className="os9-qt-volume" title="Volume" />
      </div>

      {/* Metadata panel */}
      <div
        className="os9-qt-meta os9-scrollable"
        style={isMobile ? { maxHeight: 'calc(100vh - 22px - 19px - 40px - 9 * 16px)', overflowY: 'auto' } : { maxHeight: 260, overflowY: 'auto' }}
      >
        <div className="os9-qt-meta-title">{work.title}</div>

        <div className="os9-qt-meta-row">
          <span className="os9-qt-meta-key">Year</span>
          <span className="os9-qt-meta-val">{work.year}</span>
        </div>
        {work.client && (
          <div className="os9-qt-meta-row">
            <span className="os9-qt-meta-key">Client</span>
            <span className="os9-qt-meta-val">{work.client}</span>
          </div>
        )}
        <div className="os9-qt-meta-row">
          <span className="os9-qt-meta-key">Location</span>
          <span className="os9-qt-meta-val">{work.location}</span>
        </div>

        <div className="os9-qt-meta-divider" />

        <div className="os9-qt-meta-label">Description</div>
        <div className="os9-qt-meta-para">{work.description}</div>

        <div className="os9-qt-meta-label">Process</div>
        <div className="os9-qt-meta-para">{work.process}</div>

        <a
          href={work.fullPieceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="os9-qt-watch-link"
        >
          Watch full piece →
        </a>
      </div>
    </div>
  );
}
