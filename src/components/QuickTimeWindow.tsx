import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Player from '@vimeo/player';
import { Work } from '../data/works';
import { IconClickOrigin } from './DesktopIcon';
import { makeTransformOrigin, springOpen } from '../lib/animation';
import { getQuickTimeLayout } from '../lib/device';

interface QuickTimeWindowProps {
  work: Work;
  onClose: () => void;
  isMobile: boolean;
  origin: IconClickOrigin | null;
}

const MAX_VIDEO_WIDTH = 1080;

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

function MutedSpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 6h3l4-3v10l-4-3H3z" />
      <path
        d="M11 5.5l4 4M15 5.5l-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuickTimeWindow({ work, onClose, isMobile, origin }: QuickTimeWindowProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [usePseudoFullscreen, setUsePseudoFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const isGif = /\.gif($|\?)/i.test(work.loopUrl);

  const inFullscreen = isFullscreen || usePseudoFullscreen;

  const vimeoId = useMemo(() => {
    if (!work.vimeoUrl) return null;
    const match = work.vimeoUrl.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }, [work.vimeoUrl]);

  useEffect(() => {
    if (!vimeoId || !iframeRef.current) return;
    const player = new Player(iframeRef.current);
    playerRef.current = player;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = (data: { seconds: number; duration: number }) => {
      setCurrentTime(data.seconds);
      if (data.duration && data.duration !== duration) setDuration(data.duration);
    };
    const onLoaded = () => {
      player.getDuration().then(setDuration).catch(() => {});
      player.getMuted().then(setMuted).catch(() => {});
      player.getVolume().then(setVolume).catch(() => {});
    };
    const onVolumeChange = (data: { volume: number }) => {
      setVolume(data.volume);
      player.getMuted().then(setMuted).catch(() => {});
    };

    player.on('play', onPlay);
    player.on('pause', onPause);
    player.on('timeupdate', onTimeUpdate);
    player.on('loaded', onLoaded);
    player.on('volumechange', onVolumeChange);

    return () => {
      player.off('play', onPlay);
      player.off('pause', onPause);
      player.off('timeupdate', onTimeUpdate);
      player.off('loaded', onLoaded);
      player.off('volumechange', onVolumeChange);
      playerRef.current = null;
      // Intentionally not calling player.destroy(): it removes the iframe
      // from the DOM, which breaks React StrictMode's double-mount in dev
      // (cancels the embed request and leaves the player blank). React
      // already tears down the iframe when the window unmounts.
    };
  // duration intentionally omitted: re-subscribing on every duration tick
  // would tear down and rebind listeners constantly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimeoId]);

  function togglePlay() {
    if (playerRef.current) {
      playerRef.current.getPaused().then((paused) => {
        if (paused) playerRef.current?.play();
        else playerRef.current?.pause();
      }).catch(() => {});
      return;
    }
    setIsPlaying((p) => !p);
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  }

  function toggleMute() {
    if (!playerRef.current) return;
    playerRef.current.getMuted().then((m) => playerRef.current?.setMuted(!m)).catch(() => {});
  }

  function onVolumeSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!playerRef.current) return;
    const v = parseFloat(e.target.value);
    setVolume(v);
    playerRef.current.setVolume(v).catch(() => {});
    if (muted && v > 0) playerRef.current.setMuted(false).catch(() => {});
  }

  // Track real fullscreen state via the DOM API (works across browsers).
  useEffect(() => {
    const onChange = () => {
      const fs = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element | null }).webkitFullscreenElement
      );
      setIsFullscreen(fs);
      if (!fs) setUsePseudoFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Esc exits pseudo-fullscreen (the real Fullscreen API handles Esc itself).
  useEffect(() => {
    if (!usePseudoFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUsePseudoFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [usePseudoFullscreen]);

  // Auto-hide controls after idle in fullscreen.
  // Skip auto-hide on touch: without hover, tap-to-reveal is unreliable on iOS
  // (cross-origin iframe can swallow taps), and a hidden exit button becomes a trap.
  useEffect(() => {
    if (inFullscreen && !isMobile) {
      setControlsVisible(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500);
    } else {
      setControlsVisible(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [inFullscreen, isMobile]);

  function onPointerActivity() {
    if (!inFullscreen || isMobile) return;
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500);
  }

  function onControlsEnter() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setControlsVisible(true);
  }

  function onControlsLeave() {
    if (!inFullscreen) return;
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 1500);
  }

  function toggleFullscreen() {
    const wrap = wrapRef.current;
    if (!wrap) return;

    type FsDoc = Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element | null };
    type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const doc = document as FsDoc;
    const el = wrap as FsEl;

    const inRealFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

    if (inRealFs) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      return;
    }
    if (usePseudoFullscreen) {
      setUsePseudoFullscreen(false);
      return;
    }

    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request) {
      try {
        const result = request();
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => setUsePseudoFullscreen(true));
        }
        return;
      } catch {
        // fall through to pseudo
      }
    }
    setUsePseudoFullscreen(true);
  }

  function onScrubberClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!playerRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.setCurrentTime(fraction * duration).catch(() => {});
  }

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const timeLabel = vimeoId
    ? `${formatTime(currentTime)} / ${formatTime(duration)}`
    : '00:08';

  const { clamped, videoHeight, videoWidth, windowStyle } = getQuickTimeLayout(MAX_VIDEO_WIDTH);

  return (
    <motion.div
      className="window qt-window"
      style={{
        ...windowStyle,
        transformOrigin: isMobile ? '50% 50%' : makeTransformOrigin(origin, clamped.width, clamped.height),
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
        <div
          ref={wrapRef}
          className={`qt-video-wrap${isFullscreen ? ' is-fullscreen' : ''}${usePseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`}
          data-controls-hidden={inFullscreen && !controlsVisible ? 'true' : undefined}
          style={{ height: videoHeight, width: videoWidth, maxWidth: '100%' }}
          onMouseMove={onPointerActivity}
          onTouchStart={onPointerActivity}
        >
          {vimeoId ? (
            <iframe
              ref={iframeRef}
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&title=0&byline=0&portrait=0&controls=0&dnt=1`}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              title={work.title}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : work.loopUrl ? (
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

          {/* Pointer-activity overlay above the iframe so we can detect
              mouse-moves and taps over the video area (iframe cross-origin
              events don't reach the parent). */}
          {vimeoId && (
            <div
              className="qt-pointer-overlay"
              onMouseMove={onPointerActivity}
              onTouchStart={onPointerActivity}
              aria-hidden="true"
            />
          )}

          {/* Floating glass controls overlay */}
          <div
            className="qt-controls"
            onMouseEnter={onControlsEnter}
            onMouseLeave={onControlsLeave}
          >
            <button className="qt-play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div
              className="qt-scrubber"
              role="slider"
              aria-label="Scrubber"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              onClick={vimeoId ? onScrubberClick : undefined}
              style={vimeoId ? undefined : { cursor: 'default' }}
            >
              <div
                className="qt-scrubber-fill"
                style={vimeoId ? { inset: `0 ${100 - progressPct}% 0 0` } : undefined}
              />
            </div>
            <span className="qt-time">{timeLabel}</span>
            {vimeoId ? (
              <>
                <div className="qt-vol-group">
                  <button
                    type="button"
                    className="qt-vol"
                    onClick={toggleMute}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted || volume === 0 ? <MutedSpeakerIcon /> : <SpeakerIcon />}
                  </button>
                  <input
                    type="range"
                    className="qt-vol-slider"
                    min={0}
                    max={1}
                    step={0.02}
                    value={muted ? 0 : volume}
                    onChange={onVolumeSliderChange}
                    aria-label="Volume"
                    style={{ ['--vol-pct' as string]: `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  className="qt-fs"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                </button>
              </>
            ) : (
              <span className="qt-vol" aria-label="Volume">
                <SpeakerIcon />
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
