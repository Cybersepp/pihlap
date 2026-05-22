import { useState, useEffect } from 'react';
import './os9.css';
import { MenuBar } from './components/MenuBar';
import { DesktopIcon } from './components/DesktopIcon';
import { FinderWindow } from './components/FinderWindow';
import { QuickTimeWindow } from './components/QuickTimeWindow';
import { SimpleTextWindow } from './components/SimpleTextWindow';
import { HDDialog } from './components/HDDialog';
import { FolderIcon, SimpleTextIcon, DiskIcon } from './components/Icons';
import { works, Work } from './data/works';
import { contactText, readMeText } from './data/content';

type WindowState =
  | { type: 'none' }
  | { type: 'finder'; selectedWork?: Work }
  | { type: 'quicktime'; work: Work }
  | { type: 'contact' }
  | { type: 'readme' }
  | { type: 'hd' };

type SelectedIcon = 'works' | 'contact' | 'readme' | 'hd' | null;

export default function App() {
  const [windowState, setWindowState] = useState<WindowState>({ type: 'none' });
  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function handleDesktopClick(icon: SelectedIcon) {
    if (selectedIcon === icon && windowState.type !== 'finder') {
      setSelectedIcon(null);
      setWindowState({ type: 'none' });
      return;
    }

    setSelectedIcon(icon);
    switch (icon) {
      case 'works':
        setWindowState({ type: 'finder' });
        break;
      case 'contact':
        setWindowState({ type: 'contact' });
        break;
      case 'readme':
        setWindowState({ type: 'readme' });
        break;
      case 'hd':
        setWindowState({ type: 'hd' });
        break;
    }
  }

  function handleSelectWork(work: Work) {
    setWindowState({ type: 'quicktime', work });
  }

  function handleCloseQuicktime() {
    setWindowState({ type: 'finder' });
  }

  function handleCloseFinder() {
    setSelectedIcon(null);
    setWindowState({ type: 'none' });
  }

  function handleCloseOther() {
    setSelectedIcon(null);
    setWindowState({ type: 'none' });
  }

  const showFinder = windowState.type === 'finder' || windowState.type === 'quicktime';
  const selectedWorkId = windowState.type === 'quicktime' ? windowState.work.id : undefined;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#CCCCCC',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <MenuBar />

      <div style={{ marginTop: 22, position: 'relative', width: '100%', height: 'calc(100vh - 22px)' }}>

        {/* Selected Works folder — top-left */}
        <div style={{ position: 'absolute', top: '8%', left: '4%' }}>
          <DesktopIcon
            icon={<FolderIcon selected={selectedIcon === 'works'} />}
            label="Selected Works"
            selected={selectedIcon === 'works'}
            onClick={() => handleDesktopClick('works')}
          />
        </div>

        {/* Contact.txt — below Selected Works */}
        <div style={{ position: 'absolute', top: 'calc(8% + 95px)', left: '4%' }}>
          <DesktopIcon
            icon={<SimpleTextIcon selected={selectedIcon === 'contact'} />}
            label="Contact.txt"
            selected={selectedIcon === 'contact'}
            onClick={() => handleDesktopClick('contact')}
          />
        </div>

        {/* Read Me — below Contact */}
        <div style={{ position: 'absolute', top: 'calc(8% + 190px)', left: '4%' }}>
          <DesktopIcon
            icon={<SimpleTextIcon selected={selectedIcon === 'readme'} />}
            label="Read Me"
            selected={selectedIcon === 'readme'}
            onClick={() => handleDesktopClick('readme')}
          />
        </div>

        {/* Macintosh HD — top-right */}
        <div style={{ position: 'absolute', top: '8%', right: '4%' }}>
          <DesktopIcon
            icon={<DiskIcon selected={selectedIcon === 'hd'} />}
            label="Macintosh HD"
            selected={selectedIcon === 'hd'}
            onClick={() => handleDesktopClick('hd')}
          />
        </div>

        {/* Atmospheric figure — bottom-right, kept within the desktop area below the menu bar */}
        <img
          src="/bg_extracted.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            maxWidth: isMobile ? '58vw' : 'min(30vw, 380px)',
            maxHeight: isMobile ? '52vh' : 'min(62vh, 72%)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'bottom right',
            display: 'block',
            opacity: 0.85,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      </div>

      {/* Finder window */}
      {showFinder && (
        <FinderWindow
          works={works}
          onClose={handleCloseFinder}
          onSelectWork={handleSelectWork}
          selectedWorkId={selectedWorkId}
          isMobile={isMobile}
        />
      )}

      {/* QuickTime window */}
      {windowState.type === 'quicktime' && (
        <QuickTimeWindow
          work={windowState.work}
          onClose={handleCloseQuicktime}
          isMobile={isMobile}
        />
      )}

      {/* Contact */}
      {windowState.type === 'contact' && (
        <SimpleTextWindow
          title="Contact.txt"
          content={contactText}
          onClose={handleCloseOther}
          isMobile={isMobile}
        />
      )}

      {/* Read Me */}
      {windowState.type === 'readme' && (
        <SimpleTextWindow
          title="Read Me"
          content={readMeText}
          onClose={handleCloseOther}
          isMobile={isMobile}
        />
      )}

      {/* Macintosh HD Easter egg */}
      {windowState.type === 'hd' && (
        <HDDialog onClose={handleCloseOther} />
      )}
    </div>
  );
}
