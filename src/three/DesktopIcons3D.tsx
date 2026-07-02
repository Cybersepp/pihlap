import { ReactNode, useEffect, useReducer } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { DesktopIcon, IconClickOrigin } from '../components/DesktopIcon';
import { iconLayout, onIconLayoutChange } from './poses';

export interface SceneIcon {
  id: string;
  label: string;
  glyph: ReactNode;
  selected: boolean;
  onClick: (origin: IconClickOrigin) => void;
}

// The desktop icons, anchored in 3D world space via drei's <Html transform>.
// They sit in one centered row directly under Martin, a fixed gap below his feet,
// on any viewport/aspect — no hardcoded per-device coordinates (see iconLayout).
// The positions are fixed in world space (we frame against the rest pose, not the
// live camera), so they still parallax as the camera swings. A resize recomputes
// them. `backfaceVisibility: hidden` makes each icon vanish once the camera has
// swung past its plane.
export function DesktopIcons3D({
  icons,
  isMobile = false,
  dimmed = false,
}: {
  icons: SceneIcon[];
  isMobile?: boolean;
  dimmed?: boolean;
}) {
  const size = useThree((s) => s.size);

  // Re-render live when the dev panel edits MODEL.iconRise / iconDepth (iconLayout
  // is computed here at render time, not per frame). No-op in production.
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => onIconLayoutChange(force), []);

  // Per-icon world positions + scale, framed against the rest pose (shared with the
  // works cloud so files fly out of the real folder icon). One centered row under
  // Martin. Fixed in world space, so icons parallax cleanly as the camera swings; a
  // resize recomputes them.
  const aspect = size.width / size.height || 1;
  const { positions, scale } = iconLayout(aspect, isMobile, icons.length);

  return (
    <>
      {icons.map((icon, i) => (
        <Html
          key={icon.id}
          transform
          position={positions[i] ?? [0, 0, 0]}
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
            style={{
              backfaceVisibility: 'hidden',
              opacity: dimmed ? 0 : 1,
              pointerEvents: dimmed ? 'none' : 'auto',
            }}
          />
        </Html>
      ))}
    </>
  );
}
