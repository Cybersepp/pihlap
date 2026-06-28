import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './styles.css';
import { IconClickOrigin } from './components/DesktopIcon';
import { QuickTimeWindow } from './components/QuickTimeWindow';
import { WorkDetailOverlay } from './components/WorkDetailOverlay';
import { FolderIcon, TextDocIcon } from './components/Icons';
import type { SceneIcon } from './three/DesktopIcons3D';
import type { Panel3DSpec } from './three/MartinScene';
import {
  GALLERY,
  POSES,
  POSES_MOBILE,
  FOCUS_SMOOTH_TIME,
  getDetailPoseFromWorld,
  type CameraTarget,
} from './three/poses';
import { works, Work } from './data/works';
import { DEFAULT_MATERIAL_SETTINGS } from './three/materialSettings';
import { readMeText } from './data/content';
import { ContactCard } from './components/ContactCard';
import { RibbonControls } from './components/RibbonControls';
import { shouldUseMobileLayout } from './lib/device';

// The 3D layer pulls in three.js + drei (~900KB). Code-split it so the desktop
// DOM paints instantly and the WebGL bundle streams in as its own chunk.
const MartinScene = lazy(() =>
  import('./three/MartinScene').then((m) => ({ default: m.MartinScene })),
);

type WindowState =
  | { type: 'none' }
  | { type: 'finder' }
  | { type: 'detail'; work: Work }
  | { type: 'quicktime'; work: Work }
  | { type: 'contact' }
  | { type: 'readme' };

type SelectedIcon = 'works' | 'contact' | 'readme' | null;

const focusKeyFor = (workId: string) => `focus:${workId}`;

export default function App() {
  const [windowState, setWindowState] = useState<WindowState>({ type: 'none' });
  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon>(null);
  // Works cloud lifecycle, separate from windowState so the files can fly back
  // *into* the folder on close: 'open' (spilled out), 'closing' (flying back —
  // still mounted), 'closed' (unmounted).
  const [worksPhase, setWorksPhase] = useState<'open' | 'closing' | 'closed'>('closed');
  const [isMobile, setIsMobile] = useState(false);
  // The camera target key the rig has actually finished settling into, or null
  // while a move is in progress. Used to delay revealing the video until the
  // camera reaches the focused tile — never trusting a stale destination.
  const [settledKey, setSettledKey] = useState<string | null>('rest');
  // World position of the clicked file within the 3D Finder window — the camera
  // flies here before the video opens.
  const [focusWorld, setFocusWorld] = useState<[number, number, number]>(GALLERY.center);

  useEffect(() => {
    const check = () => {
      setIsMobile(shouldUseMobileLayout());
    };
    check();
    window.addEventListener('resize', check);
    window.visualViewport?.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, []);

  function openWindow(icon: SelectedIcon) {
    // Click on the currently-selected icon toggles it closed. The works cloud has
    // no window chrome / close button, so the folder icon is its toggle too.
    if (selectedIcon === icon) {
      setSelectedIcon(null);
      setWindowState({ type: 'none' });
      return;
    }

    setSelectedIcon(icon);

    switch (icon) {
      case 'works':   setWindowState({ type: 'finder' }); break;
      case 'contact': setWindowState({ type: 'contact' }); break;
      case 'readme':  setWindowState({ type: 'readme' }); break;
    }
  }

  function openWorkFromFinder(
    work: Work,
    _origin: IconClickOrigin,
    world: [number, number, number],
  ) {
    // Clicking a tile opens its detail view (expanded tile + info panel); the
    // actual video player opens only when the user hits play.
    setFocusWorld(world);
    setWindowState({ type: 'detail', work });
  }

  // Detail → playing the video.
  function playSelected() {
    setWindowState((s) => (s.type === 'detail' ? { type: 'quicktime', work: s.work } : s));
  }

  // Player closes back to the detail view (not all the way out).
  function closeQuicktime() {
    setWindowState((s) => (s.type === 'quicktime' ? { type: 'detail', work: s.work } : { type: 'finder' }));
  }

  // Detail closes back to the spiral.
  function closeDetail() {
    setWindowState({ type: 'finder' });
  }

  function closeAll() {
    setSelectedIcon(null);
    setWindowState({ type: 'none' });
  }

  // Esc steps back one level: video → gallery, gallery/text → rest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (windowState.type === 'quicktime') {
        setWindowState((s) => (s.type === 'quicktime' ? { type: 'detail', work: s.work } : s));
      } else if (windowState.type === 'detail') {
        setWindowState({ type: 'finder' });
      } else if (windowState.type !== 'none') {
        setSelectedIcon(null);
        setWindowState({ type: 'none' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [windowState.type]);

  // Drive the works cloud lifecycle off windowState. Opening the folder (finder /
  // its video) keeps it 'open'; returning to rest flips it to 'closing' so the
  // files fly back into the folder before unmounting; switching to another window
  // drops it immediately.
  useEffect(() => {
    const t = windowState.type;
    if (t === 'finder' || t === 'quicktime' || t === 'detail') setWorksPhase('open');
    else if (t === 'none') setWorksPhase((prev) => (prev === 'open' ? 'closing' : prev));
    else setWorksPhase('closed');
  }, [windowState.type]);

  // Unmount the cloud once the fly-back finishes. Allow for the per-file stagger
  // (delay = i * 0.05s) plus the damp settle, so the last file fully tucks in.
  useEffect(() => {
    if (worksPhase !== 'closing') return;
    const closeMs = (works.length - 1) * 50 + 650;
    const t = window.setTimeout(() => setWorksPhase('closed'), closeMs);
    return () => window.clearTimeout(t);
  }, [worksPhase]);

  const selectedWorkId =
    windowState.type === 'quicktime' || windowState.type === 'detail'
      ? windowState.work.id
      : undefined;
  // A work is selected (detail or playing): freeze the spiral, expand + spotlight.
  const workOpen = windowState.type === 'detail' || windowState.type === 'quicktime';

  // The 3D window panel mounted in the gallery center, derived from state. The
  // Finder (and the video opened from it) shows the works grid; contact/readme
  // show a text panel — all of them swing the camera into the gallery.
  let panel: Panel3DSpec | null = null;
  if (worksPhase !== 'closed') {
    // Mounted while open AND during the close fly-back; `open` flips false on close
    // so the files reverse back into the folder before the cloud unmounts.
    panel = {
      kind: 'finder',
      works,
      selectedWorkId,
      open: worksPhase === 'open',
      paused: workOpen,
      showPlay: windowState.type === 'detail',
      onSelect: openWorkFromFinder,
      onPlay: playSelected,
    };
  } else if (windowState.type === 'contact') {
    panel = { kind: 'text', title: 'contact.txt', content: <ContactCard />, onClose: closeAll };
  } else if (windowState.type === 'readme') {
    panel = {
      kind: 'text',
      title: 'readme.txt',
      content: (
        <div className="readme">
          <img
            className="readme-image"
            src={`${import.meta.env.BASE_URL}hippo.jpg`}
            alt="hippo"
          />
          <p className="readme-text">{readMeText}</p>
        </div>
      ),
      onClose: closeAll,
    };
  }

  // The camera destination derived from the current state. Everything except the
  // focused video frames the gallery center; the video flies to the clicked file.
  const poseSet = isMobile ? POSES_MOBILE : POSES;
  let cameraTarget: CameraTarget;
  if (windowState.type === 'detail' || windowState.type === 'quicktime') {
    // Detail and playback share one pose (tile reframed left), so hitting play
    // doesn't move the camera — the player just fades in over the framed tile.
    cameraTarget = {
      key: focusKeyFor(windowState.work.id),
      spec: getDetailPoseFromWorld(focusWorld),
      smoothTime: FOCUS_SMOOTH_TIME,
    };
  } else if (windowState.type === 'none') {
    cameraTarget = { key: 'rest', spec: poseSet.rest };
  } else {
    // finder / contact / readme all swing behind Martin to the gallery view.
    cameraTarget = { key: 'gallery', spec: poseSet.gallery };
  }

  // "Broken": the camera has left rest (any window open), so the cloudy desktop
  // backdrop crossfades to deep space and the starfield fades in. Returning to
  // rest reverses it.
  const broken = windowState.type !== 'none';

  // The DOM video only opens once the camera has actually arrived in front of the
  // focused tile (settledKey matches) — never early during the fly-in.
  const videoVisible =
    windowState.type === 'quicktime' && settledKey === focusKeyFor(windowState.work.id);

  // Desktop icons. Their layout is computed responsively from the camera frustum
  // inside DesktopIcons3D (fits any viewport), so here we only declare identity,
  // selection, and click behaviour — the order sets the top→bottom stacking.
  const sceneIcons: SceneIcon[] = [
    {
      id: 'works',
      label: 'selected works',
      glyph: <FolderIcon />,
      selected: selectedIcon === 'works',
      onClick: () => openWindow('works'),
    },
    {
      id: 'contact',
      label: 'contact.txt',
      glyph: <TextDocIcon />,
      selected: selectedIcon === 'contact',
      onClick: () => openWindow('contact'),
    },
    {
      id: 'readme',
      label: 'readme.txt',
      glyph: (
        <img
          src={`${import.meta.env.BASE_URL}bat.jpg`}
          alt=""
          width={56}
          height={56}
          draggable={false}
          style={{ objectFit: 'cover', borderRadius: 8, display: 'block' }}
        />
      ),
      selected: selectedIcon === 'readme',
      onClick: () => openWindow('readme'),
    },
  ];

  return (
    <>
      {/* Dreamy cloudy sky backdrop — sits behind everything. */}
      <div className="sky" aria-hidden="true" />
      {/* Dark studio backdrop, crossfaded in over the sky once the 4th wall breaks. */}
      <div className={`studio${broken ? ' is-visible' : ''}`} aria-hidden="true" />

      {/* 3D Martin + world-anchored icons + (while a window is open) its 3D panel. */}
      <Suspense fallback={null}>
        <MartinScene
          target={cameraTarget}
          isMobile={isMobile}
          icons={sceneIcons}
          panel={panel}
          onSettle={setSettledKey}
          // The spiral gallery owns wheel/touch (scroll winds the helix), so the
          // camera rig's drag/dolly stays disabled throughout.
          orbitEnabled={false}
          dimmed={workOpen}
          materialSettings={DEFAULT_MATERIAL_SETTINGS}
        />
      </Suspense>

      {/* Detail view chrome: play button over the tile + right-hand info panel. */}
      <AnimatePresence>
        {windowState.type === 'detail' && (
          <WorkDetailOverlay
            key={`detail-${windowState.work.id}`}
            work={windowState.work}
            onPlay={playSelected}
            onClose={closeDetail}
          />
        )}
      </AnimatePresence>

      {/* Dev-only live tuning panel for the works ribbon (shown while it's open). */}
      {import.meta.env.DEV && worksPhase !== 'closed' && <RibbonControls />}

      {/* Cinematic focus dimmer behind the open video (fades the scene periphery). */}
      <div className={`focus-vignette${videoVisible ? ' is-visible' : ''}`} aria-hidden="true" />

      {/* The video player stays a DOM overlay; it opens once the camera reaches the file. */}
      <AnimatePresence>
        {videoVisible && windowState.type === 'quicktime' && (
          <QuickTimeWindow
            key={`qt-${windowState.work.id}`}
            work={windowState.work}
            onClose={closeQuicktime}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </>
  );
}
