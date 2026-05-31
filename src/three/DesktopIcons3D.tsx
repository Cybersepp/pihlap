import { ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { DesktopIcon, IconClickOrigin } from '../components/DesktopIcon';
import { ICON_SCALE } from './poses';

export interface SceneIcon {
  id: string;
  label: string;
  glyph: ReactNode;
  selected: boolean;
  /** World position [x, y, z] in normalized scene units. */
  position: [number, number, number];
  onClick: (origin: IconClickOrigin) => void;
}

// The desktop icons, anchored in 3D world space via drei's <Html transform>.
// They render the real (crisp, clickable) icon DOM but live in the scene, so the
// camera arc moves past them with proper parallax. `backfaceVisibility: hidden`
// makes each icon vanish once the camera has swung past its plane — i.e. once
// you've "turned around" — instead of showing a mirrored back.
export function DesktopIcons3D({ icons }: { icons: SceneIcon[] }) {
  return (
    <>
      {icons.map((icon) => (
        <Html
          key={icon.id}
          transform
          position={icon.position}
          scale={ICON_SCALE}
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
