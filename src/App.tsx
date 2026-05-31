import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './styles.css';
import { IconClickOrigin } from './components/DesktopIcon';
import { FinderWindow } from './components/FinderWindow';
import { QuickTimeWindow } from './components/QuickTimeWindow';
import { SimpleTextWindow } from './components/SimpleTextWindow';
import { FolderIcon, TextDocIcon } from './components/Icons';
import type { SceneIcon } from './three/DesktopIcons3D';
import { ICON_POSITIONS, type CameraPose } from './three/poses';
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

export default function App() {
  const [windowState, setWindowState] = useState<WindowState>({ type: 'none' });
  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon>(null);
  const [origin, setOrigin] = useState<IconClickOrigin | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // The pose the camera has actually finished settling into (reported by the
  // CameraRig), or null while a move is in progress. Used to delay revealing the
  // works window until the current arc completes — never trusting a stale pose.
  const [settledPose, setSettledPose] = useState<CameraPose | null>('rest');

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

  function openWorkFromFinder(work: Work, clickOrigin: IconClickOrigin) {
    setOrigin(clickOrigin);
    setWindowState({ type: 'quicktime', work });
  }

  function closeQuicktime() {
    setWindowState({ type: 'finder' });
  }

  function closeAll() {
    setSelectedIcon(null);
    setWindowState({ type: 'none' });
  }

  const selectedWorkId = windowState.type === 'quicktime' ? windowState.work.id : undefined;

  // Intent to show the works UI (finder + the quicktime opened from it). This is
  // what swings the camera; contact/readme/none keep the resting 2D framing.
  const wantsFinder = windowState.type === 'finder' || windowState.type === 'quicktime';
  const cameraPose: CameraPose = wantsFinder ? 'behind' : 'rest';

  // ...but the window only actually renders once the camera has finished arcing
  // behind the Buddha (settledPose, not a stale pose), so it appears at the
  // camera's end position — and never opens early during a mid-flight re-click.
  const finderVisible = wantsFinder && settledPose === 'behind';

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

      {/* 3D Buddha + world-anchored desktop icons — full-screen layer behind windows. */}
      <Suspense fallback={null}>
        <BuddhaScene
          pose={cameraPose}
          isMobile={isMobile}
          icons={sceneIcons}
          onSettle={setSettledPose}
        />
      </Suspense>

      <AnimatePresence>
        {finderVisible && (
          <FinderWindow
            key="finder"
            works={works}
            onClose={closeAll}
            onSelectWork={openWorkFromFinder}
            selectedWorkId={selectedWorkId}
            isMobile={isMobile}
            origin={origin}
          />
        )}

        {windowState.type === 'quicktime' && finderVisible && (
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
