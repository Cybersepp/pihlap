import { MouseEvent, ReactNode } from 'react';

export interface IconClickOrigin {
  x: number;
  y: number;
}

interface DesktopIconProps {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: (origin: IconClickOrigin) => void;
  style?: React.CSSProperties;
}

export function DesktopIcon({ icon, label, selected = false, onClick, style }: DesktopIconProps) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // Capture click position so the opened window can animate from this point.
    onClick({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      className={`desktop-icon${selected ? ' is-selected' : ''}`}
      onClick={handleClick}
      style={style}
      role="button"
      tabIndex={0}
    >
      <div className="desktop-icon-glyph">{icon}</div>
      <span className="desktop-icon-label">{label}</span>
    </div>
  );
}
