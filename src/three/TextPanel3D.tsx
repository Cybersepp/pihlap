import { Window3D } from './Window3D';

// Fixed window size (CSS px) — scaled into the world by Window3D / GALLERY.scale.
const WIN_W = 480;
const WIN_H = 380;

export interface TextPanel3DProps {
  title: string;
  content: string;
  onClose: () => void;
}

// A TextEdit-style window (contact.txt / readme.txt) rendered as a 3D panel in the
// gallery center, exactly like the Finder — so opening it swings the camera behind
// the Buddha and the window scales open in the middle.
export function TextPanel3D({ title, content, onClose }: TextPanel3DProps) {
  return (
    <Window3D>
      <div
        className="window text-window text-3d"
        style={{
          position: 'relative',
          width: WIN_W,
          height: WIN_H,
          backfaceVisibility: 'hidden',
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
