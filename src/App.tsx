import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './styles.css';
import { IconClickOrigin } from './components/DesktopIcon';
import { QuickTimeWindow } from './components/QuickTimeWindow';
import { SimpleTextWindow } from './components/SimpleTextWindow';
import { FolderIcon, TextDocIcon } from './components/Icons';
import type { SceneIcon } from './three/DesktopIcons3D';
import {
  GALLERY,
  ICON_POSITIONS,
  POSES,
  POSES_MOBILE,
  getFocusPoseFromWorld,
  type CameraTarget,
} from './three/poses';
import { works, Work } from './data/works';
import { contactText, readMeText } from './data/content';
import { shouldUseMobileLayout } from './lib/device';

// The 3D layer pulls in three.js + drei (~900KB). Code-split it so the desktop
// DOM paints instantly and the WebGL bundle streams in as its own chunk.
const BuddhaScene = lazy(() =>
  import('./three/BuddhaScene').then((m) => ({ default: m.BuddhaScene })),
);

type WindowState =
  | { type: 'none' }
  | { type: 'finder' }
  | { type: 'quicktime'; work: Work }
  | { type: 'contact' }
  | { type: 'readme' };

type SelectedIcon = 'works' | 'contact' | 'readme' | null;

const focusKeyFor = (workId: string) => `focus:${workId}`;

export default function App() {
  const [windowState, setWindowState] = useState<WindowState>({ type: 'none' });
  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon>(null);
  const [origin, setOrigin] = useState<IconClickOrigin | null>(null);
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

  function openWindow(icon: SelectedIcon, clickOrigin: IconClickOrigin) {
    // Click on currently-selected icon (except Finder) toggles it closed.
    if (selectedIcon === icon && windowState.type !== 'finder') {
      setSelectedIcon(null);
      setWindowState({ type: 'none' });
      return;
    }

    setOrigin(clickOrigin);
    setSelectedIcon(icon);

    switch (icon) {
      case 'works':   setWindowState({ type: 'finder' }); break;
      case 'contact': setWindowState({ type: 'contact' }); break;
      case 'readme':  setWindowState({ type: 'readme' }); break;
    }
  }

  function openWorkFromFinder(
    work: Work,
    clickOrigin: IconClickOrigin,
    world: [number, number, number],
  ) {
    setOrigin(clickOrigin);
    setFocusWorld(world);
    setWindowState({ type: 'quicktime', work });
  }

  function closeQuicktime() {
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
        setWindowState({ type: 'finder' });
      } else if (windowState.type !== 'none') {
        setSelectedIcon(null);
        setWindowState({ type: 'none' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [windowState.type]);

  const selectedWorkId = windowState.type === 'quicktime' ? windowState.work.id : undefined;

  // Whether the works gallery is in play (browsing the grid, or focused on a tile
  // with the video open). Mounts the 3D grid and drives the camera off `rest`.
  const wantsWorks = windowState.type === 'finder' || windowState.type === 'quicktime';

  // The camera destination derived from the current state.
  const poseSet = isMobile ? POSES_MOBILE : POSES;
  let cameraTarget: CameraTarget;
  if (windowState.type === 'quicktime') {
    cameraTarget = {
      key: focusKeyFor(windowState.work.id),
      spec: getFocusPoseFromWorld(focusWorld),
    };
  } else if (windowState.type === 'finder') {
    cameraTarget = { key: 'gallery', spec: poseSet.gallery };
  } else {
    cameraTarget = { key: 'rest', spec: poseSet.rest };
  }

  // The DOM video only opens once the camera has actually arrived in front of the
  // focused tile (settledKey matches) — never early during the fly-in.
  const videoVisible =
    windowState.type === 'quicktime' && settledKey === focusKeyFor(windowState.work.id);

  // Desktop icons, anchored in 3D world space (see DesktopIcons3D) so the camera
  // arc moves past them with parallax instead of leaving them glued to the screen.
  const sceneIcons: SceneIcon[] = [
    {
      id: 'works',
      label: 'selected works',
      glyph: <FolderIcon />,
      selected: selectedIcon === 'works',
      position: ICON_POSITIONS.works,
      onClick: (o) => openWindow('works', o),
    },
    {
      id: 'contact',
      label: 'contact.txt',
      glyph: <TextDocIcon />,
      selected: selectedIcon === 'contact',
      position: ICON_POSITIONS.contact,
      onClick: (o) => openWindow('contact', o),
    },
    {
      id: 'readme',
      label: 'readme.txt',
      glyph: <TextDocIcon />,
      selected: selectedIcon === 'readme',
      position: ICON_POSITIONS.readme,
      onClick: (o) => openWindow('readme', o),
    },
  ];

  return (
    <>
      {/* Dreamy cloudy sky backdrop — sits behind everything. */}
      <div className="sky" aria-hidden="true" />

      {/* 3D Buddha + world-anchored icons + (while browsing) the works gallery. */}
      <Suspense fallback={null}>
        <BuddhaScene
          target={cameraTarget}
          isMobile={isMobile}
          icons={sceneIcons}
          gallery={
            wantsWorks
              ? { works, selectedWorkId, onSelect: openWorkFromFinder, onClose: closeAll }
              : null
          }
          onSettle={setSettledKey}
        />
      </Suspense>

      <AnimatePresence>
        {videoVisible && windowState.type === 'quicktime' && (
          <QuickTimeWindow
            key={`qt-${windowState.work.id}`}
            work={windowState.work}
            onClose={closeQuicktime}
            isMobile={isMobile}
            origin={origin}
          />
        )}

        {windowState.type === 'contact' && (
          <SimpleTextWindow
            key="contact"
            title="contact.txt"
            content={contactText}
            onClose={closeAll}
            isMobile={isMobile}
            origin={origin}
          />
        )}

        {windowState.type === 'readme' && (
          <SimpleTextWindow
            key="readme"
            title="readme.txt"
            content={readMeText}
            onClose={closeAll}
            isMobile={isMobile}
            origin={origin}
          />
        )}
      </AnimatePresence>
    </>
  );
}
