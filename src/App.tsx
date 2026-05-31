import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './styles.css';
import { DesktopIcon, IconClickOrigin } from './components/DesktopIcon';
import { FinderWindow } from './components/FinderWindow';
import { QuickTimeWindow } from './components/QuickTimeWindow';
import { SimpleTextWindow } from './components/SimpleTextWindow';
import { FolderIcon, TextDocIcon } from './components/Icons';
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
  const finderVisible = windowState.type === 'finder' || windowState.type === 'quicktime';

  // Only the "selected works" flow (finder + the quicktime opened from it) swings
  // the camera behind the Buddha. contact/readme/none keep the resting 2D framing.
  const cameraPose = finderVisible ? 'behind' : 'rest';

  return (
    <>
      <div className="desktop">
        {/* Selected Works folder */}
        <div style={{ position: 'absolute', top: '6%', left: '3%' }}>
          <DesktopIcon
            icon={<FolderIcon />}
            label="selected works"
            selected={selectedIcon === 'works'}
            onClick={(o) => openWindow('works', o)}
          />
        </div>

        {/* Contact.txt */}
        <div style={{ position: 'absolute', top: 'calc(6% + 110px)', left: '3%' }}>
          <DesktopIcon
            icon={<TextDocIcon />}
            label="contact.txt"
            selected={selectedIcon === 'contact'}
            onClick={(o) => openWindow('contact', o)}
          />
        </div>

        {/* Read Me */}
        <div style={{ position: 'absolute', top: 'calc(6% + 220px)', left: '3%' }}>
          <DesktopIcon
            icon={<TextDocIcon />}
            label="readme.txt"
            selected={selectedIcon === 'readme'}
            onClick={(o) => openWindow('readme', o)}
          />
        </div>

      </div>

      {/* 3D Buddha figure — full-screen transparent layer behind the desktop. */}
      <Suspense fallback={null}>
        <BuddhaScene pose={cameraPose} isMobile={isMobile} />
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

        {windowState.type === 'quicktime' && (
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
