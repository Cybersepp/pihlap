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
import { RibbonControls, TextWindowControls } from './components/RibbonControls';
import { SignatureIntro } from './components/SignatureIntro';
import { getViewportSize, shouldUseMobileLayout } from './lib/device';
import { applyPose } from './three/liveCamera';

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

// How long after a window closes (camera starting its swing back to rest) before
// the signature remounts and begins drawing. Less than the camera's settle so the
// ink is already flowing as Martin arrives; SignatureIntro's own START_DELAY_MS
// adds the final beat before the first stroke lands.
const INTRO_REDRAW_LEAD_MS = 450;

export default function App() {
  const [windowState, setWindowState] = useState<WindowState>({ type: 'none' });
  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon>(null);
  // Works cloud lifecycle, separate from windowState so the files can fly back
  // *into* the folder on close: 'open' (spilled out), 'closing' (flying back —
  // still mounted), 'closed' (unmounted).
  const [worksPhase, setWorksPhase] = useState<'open' | 'closing' | 'closed'>('closed');
  // Initialised synchronously so the desktop-only intro never flashes on a phone.
  const [isMobile, setIsMobile] = useState(() => shouldUseMobileLayout());
  // Live viewport size, so the detail framing re-derives on resize / orientation
  // change (the camera pose is computed from the aspect — see getDetailPoseFromWorld).
  const [viewport, setViewport] = useState(() => getViewportSize());
  // Flips true once the 3D figure's GLB has resolved — hands off from the intro draw.
  const [modelReady, setModelReady] = useState(false);
  // Keys the intro so it remounts and redraws from scratch each return to rest.
  const [introRun, setIntroRun] = useState(0);
  // Erased state: true wipes the signature out and holds it hidden until the camera
  // is back at the rest pose, at which point it remounts and redraws.
  const [introHidden, setIntroHidden] = useState(false);
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
      setViewport(getViewportSize());
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

  // Re-frame the detail/video pose when the viewport changes (resize / phone
  // rotation). The camera key is fixed per work, so CameraRig won't re-issue on its
  // own — push the freshly-derived pose straight through the live-camera bridge.
  useEffect(() => {
    if (windowState.type !== 'detail' && windowState.type !== 'quicktime') return;
    applyPose(
      getDetailPoseFromWorld(focusWorld, viewport.width, viewport.height),
      FOCUS_SMOOTH_TIME,
    );
  }, [viewport.width, viewport.height, windowState.type, focusWorld]);

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
      playerOpen: windowState.type === 'quicktime',
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
      spec: getDetailPoseFromWorld(focusWorld, viewport.width, viewport.height),
      smoothTime: FOCUS_SMOOTH_TIME,
    };
  } else if (windowState.type === 'none') {
    cameraTarget = { key: 'rest', spec: poseSet.rest };
  } else {
    // finder / contact / readme all share the gallery pose, but keep DISTINCT keys
    // so switching between these tabs re-issues setLookAt — easing the camera back
    // to the canonical gallery framing and discarding any orbit done in the
    // previous tab (e.g. orbiting readme, then opening selected works).
    cameraTarget = { key: `gallery:${windowState.type}`, spec: poseSet.gallery };
  }

  // "Broken": the camera has left rest (any window open), so the cloudy desktop
  // backdrop crossfades to deep space and the starfield fades in. Returning to
  // rest reverses it.
  const broken = windowState.type !== 'none';

  // Erase the signature the instant any window opens.
  useEffect(() => {
    if (broken) setIntroHidden(true);
  }, [broken]);

  // Redraw a beat before the camera finishes returning to rest, so the ink is
  // already flowing as Martin swings back into place rather than after he lands.
  // Keyed off the close (broken→false) on a short lead rather than the settle.
  useEffect(() => {
    if (broken || !introHidden) return;
    const t = window.setTimeout(() => {
      setIntroHidden(false);
      setIntroRun((r) => r + 1);
    }, INTRO_REDRAW_LEAD_MS);
    return () => window.clearTimeout(t);
  }, [broken, introHidden]);

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

      {/* Intro flourish: the name draws itself while the 3D bundle streams in, then
          settles to a faint backdrop behind the figure. On mobile the SVG scales
          down via .signature-intro__svg's media query. */}
      <SignatureIntro key={`intro-${introRun}`} modelReady={modelReady} dismissed={introHidden} />

      {/* 3D Martin + world-anchored icons + (while a window is open) its 3D panel. */}
      <Suspense fallback={null}>
        <MartinScene
          target={cameraTarget}
          isMobile={isMobile}
          icons={sceneIcons}
          panel={panel}
          onSettle={setSettledKey}
          galleryArrived={settledKey === 'gallery:finder'}
          galleryCamPos={poseSet.gallery.position}
          onModelReady={() => setModelReady(true)}
          // The spiral gallery owns wheel/touch (scroll winds the helix) and the
          // detail/video share a fixed framing, so orbit stays off there. The
          // text panels (contact/readme) have nothing competing for gestures, so
          // the user may orbit around Martin while they're open.
          orbitEnabled={windowState.type === 'contact' || windowState.type === 'readme'}
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
            onClose={closeDetail}
          />
        )}
      </AnimatePresence>

      {/* Dev-only live tuning panels. The ribbon panel shows while the gallery is
          open; the text-window panel is a separate window docked beside it, shown
          while contact/readme is open. */}
      {import.meta.env.DEV && worksPhase !== 'closed' && <RibbonControls />}
      {import.meta.env.DEV &&
        (windowState.type === 'contact' || windowState.type === 'readme') && (
          <TextWindowControls />
        )}

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
