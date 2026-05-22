import { Work } from '../data/works';
import { MovIcon } from './Icons';

interface FinderWindowProps {
  works: Work[];
  onClose: () => void;
  onSelectWork: (work: Work) => void;
  selectedWorkId?: string;
  isMobile: boolean;
}

export function FinderWindow({ works, onClose, onSelectWork, selectedWorkId, isMobile }: FinderWindowProps) {
  const windowStyle: React.CSSProperties = isMobile
    ? {}
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 480,
      };

  return (
    <div
      className={`os9-window${isMobile ? ' os9-window-fullscreen' : ''}`}
      style={windowStyle}
    >
      {/* Title bar */}
      <div className="os9-titlebar os9-titlebar-active">
        <button className="os9-closebox" onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className="os9-titlebar-title">Selected Works</span>
      </div>

      {/* Icon grid */}
      <div
        className="os9-window-content os9-scrollable"
        style={{ height: isMobile ? 'calc(100vh - 22px - 19px - 18px)' : 'calc(480px - 19px - 18px)', overflow: 'auto' }}
      >
        <div className="os9-finder-grid">
          {works.map((work) => (
            <div
              key={work.id}
              className={`os9-finder-item${selectedWorkId === work.id ? ' selected' : ''}`}
              onClick={() => onSelectWork(work)}
            >
              <div className="os9-icon">
                <MovIcon selected={selectedWorkId === work.id} />
              </div>
              <span className="os9-icon-label">{work.filename}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="os9-finder-statusbar">
        <span>{works.length} items</span>
      </div>
    </div>
  );
}
