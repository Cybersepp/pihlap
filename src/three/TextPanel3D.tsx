import { ReactNode } from 'react';
import { Window3D } from './Window3D';
import { TEXT_PANEL } from './poses';
import { useTextPanelTuning } from './useTextPanelTuning';

export interface TextPanel3DProps {
  title: string;
  content: ReactNode;
  onClose: () => void;
}

// A TextEdit-style window (contact.txt / readme.txt) rendered as a 3D panel in the
// gallery center, exactly like the Finder — so opening it swings the camera behind
// Martin and the window scales open in the middle.
export function TextPanel3D({ title, content, onClose }: TextPanel3DProps) {
  useTextPanelTuning();
  return (
    <Window3D
      // Blank "paper" shown when the camera is behind the panel — same footprint
      // as the window so the 3D plane keeps its size through the flip.
      back={
        <div
          className="text-3d-back"
          aria-hidden="true"
          style={{ width: TEXT_PANEL.width, height: TEXT_PANEL.height }}
        />
      }
    >
      <div
        className="window text-window text-3d"
        style={{
          position: 'relative',
          width: TEXT_PANEL.width,
          height: TEXT_PANEL.height,
          pointerEvents: 'auto',
        }}
      >
        <div className="window-titlebar">
          <div className="traffic-lights">
            <button className="tl tl--close" onClick={onClose} aria-label="Close" />
            <span className="tl tl--min tl--dim" aria-hidden="true" />
            <span className="tl tl--zoom tl--dim" aria-hidden="true" />
          </div>
          <span className="window-titlebar-title">{title}</span>
        </div>

        <div className="window-body">{content}</div>
      </div>
    </Window3D>
  );
}
