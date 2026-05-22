interface SimpleTextWindowProps {
  title: string;
  content: string;
  onClose: () => void;
  isMobile: boolean;
}

export function SimpleTextWindow({ title, content, onClose, isMobile }: SimpleTextWindowProps) {
  const windowStyle: React.CSSProperties = isMobile
    ? {}
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        height: 300,
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
        <span className="os9-titlebar-title">{title}</span>
      </div>

      {/* Content */}
      <div
        className="os9-window-content os9-scrollable"
        style={{
          height: isMobile ? 'calc(100vh - 22px - 19px)' : 'calc(300px - 19px)',
          overflow: 'auto',
          background: '#FFFFFF',
        }}
      >
        <div className="os9-window-body">{content}</div>
      </div>
    </div>
  );
}
