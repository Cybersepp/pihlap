import { ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { DesktopIcon, IconClickOrigin } from '../components/DesktopIcon';
import { ICON_ROWS_Y, iconColumnLayout } from './poses';

export interface SceneIcon {
  id: string;
  label: string;
  glyph: ReactNode;
  selected: boolean;
  onClick: (origin: IconClickOrigin) => void;
}

// The desktop icons, anchored in 3D world space via drei's <Html transform>.
// Positions are computed from the RESTING camera's view frustum so the column
// hugs the left edge and fits any viewport/aspect (desktop or phone) — no
// hardcoded per-device coordinates. The positions are fixed in world space (we
// frame against the rest pose, not the live camera), so they still parallax as
// the camera swings. A resize recomputes them. `backfaceVisibility: hidden` makes
// each icon vanish once the camera has swung past its plane.
export function DesktopIcons3D({ icons }: { icons: SceneIcon[] }) {
  const size = useThree((s) => s.size);

  // Column X + per-icon scale, framed against the rest pose (shared with the works
  // cloud so the files fly out of the real folder icon). Fixed in world space, so
  // the icons parallax cleanly as the camera swings; a resize recomputes them.
  const aspect = size.width / size.height || 1;
  const { x, scale } = iconColumnLayout(aspect);

  return (
    <>
      {icons.map((icon, i) => (
        <Html
          key={icon.id}
          transform
          position={[x, ICON_ROWS_Y[i] ?? 0, 0]}
          scale={scale}
          // Below the windows' stacking context; the parent .scene-canvas (z 1)
          // already traps these under the windows (z 100).
          zIndexRange={[40, 0]}
        >
          <DesktopIcon
            icon={icon.glyph}
            label={icon.label}
            selected={icon.selected}
            onClick={icon.onClick}
            style={{ backfaceVisibility: 'hidden' }}
          />
        </Html>
      ))}
    </>
  );
}
