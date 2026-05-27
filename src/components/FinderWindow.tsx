import { motion } from 'framer-motion';
import { Work } from '../data/works';
import { MovIcon, SidebarFolderIcon, SidebarAirDropIcon, SidebarHDDIcon } from './Icons';
import { IconClickOrigin } from './DesktopIcon';
import { makeTransformOrigin, springOpen } from '../lib/animation';
import { clampWindowSize, getPopupWindowStyle } from '../lib/device';

interface FinderWindowProps {
  works: Work[];
  onClose: () => void;
  onSelectWork: (work: Work, origin: IconClickOrigin) => void;
  selectedWorkId?: string;
  isMobile: boolean;
  origin: IconClickOrigin | null;
}

const WIN_WIDTH = 760;
const WIN_HEIGHT = 520;

export function FinderWindow({
  works,
  onClose,
  onSelectWork,
  selectedWorkId,
  isMobile,
  origin,
}: FinderWindowProps) {
  const clampedSize = clampWindowSize(WIN_WIDTH, WIN_HEIGHT);
  const windowStyle = getPopupWindowStyle(WIN_WIDTH, WIN_HEIGHT);

  return (
    <motion.div
      className="window"
      style={{
        ...windowStyle,
        transformOrigin: isMobile ? '50% 50%' : makeTransformOrigin(origin, clampedSize.width, clampedSize.height),
      }}
      initial={{ scale: 0.82, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={springOpen}
    >
      {/* Title bar with traffic lights */}
      <div className="window-titlebar">
        <div className="traffic-lights">
          <button className="tl tl--close" onClick={onClose} aria-label="Close" />
          <span className="tl tl--min tl--dim" aria-hidden="true" />
          <span className="tl tl--zoom tl--dim" aria-hidden="true" />
        </div>
        <span className="window-titlebar-title">Selected Works</span>
      </div>

      <div className="finder">
        {/* Sidebar */}
        <aside className="finder-sidebar">
          <div className="finder-sidebar-section">Favorites</div>
          <div className="finder-sidebar-item">
            <SidebarAirDropIcon /> AirDrop
          </div>
          <div className="finder-sidebar-item">
            <SidebarFolderIcon /> Recents
          </div>
          <div className="finder-sidebar-item is-active">
            <SidebarFolderIcon /> Selected Works
          </div>
          <div className="finder-sidebar-item">
            <SidebarFolderIcon /> Documents
          </div>

          <div className="finder-sidebar-section" style={{ marginTop: 10 }}>
            Locations
          </div>
          <div className="finder-sidebar-item">
            <SidebarHDDIcon /> Macintosh HD
          </div>
        </aside>

        {/* Main pane */}
        <div className="finder-main">
          <div className="finder-toolbar">
            <span>Selected Works</span>
          </div>

          <div className="finder-grid">
            {works.map((work) => (
              <div
                key={work.id}
                className={`finder-item${selectedWorkId === work.id ? ' is-selected' : ''}`}
                onClick={(e) => onSelectWork(work, { x: e.clientX, y: e.clientY })}
              >
                <div className="finder-item-glyph">
                  <MovIcon size={48} />
                </div>
                <span className="finder-item-label">{work.filename}</span>
              </div>
            ))}
          </div>

          <div className="finder-statusbar">{works.length} items</div>
        </div>
      </div>
    </motion.div>
  );
}
