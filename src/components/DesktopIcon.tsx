import { ReactNode } from 'react';

interface DesktopIconProps {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function DesktopIcon({ icon, label, selected = false, onClick, style }: DesktopIconProps) {
  return (
    <div
      className={`os9-desktop-icon${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className="os9-icon">{icon}</div>
      <span className="os9-icon-label">{label}</span>
    </div>
  );
}
