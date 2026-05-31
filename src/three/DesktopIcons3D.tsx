import { ReactNode } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { DesktopIcon, IconClickOrigin } from '../components/DesktopIcon';
import {
  POSES,
  ICON_PX_WIDTH,
  ICON_ROWS_Y,
  ICON_EDGE_MARGIN,
  ICON_BASE_SCALE,
  ICON_MAX_WIDTH_FRACTION,
} from './poses';

// drei's Html `transform` renders at panelPx × scale / 40 world units (see the
// hidden ÷40 factor in Html.js). This converts a CSS px width to world units.
const HTML_TRANSFORM_DIVISOR = 40;

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
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  // Half-extents of the visible area on the icon plane (z = 0) at the rest pose.
  const restDist = POSES.rest.position[2];
  const aspect = size.width / size.height || 1;
  const fov = camera.fov || 32;
  const halfH = restDist * Math.tan((fov * Math.PI) / 360);
  const halfW = halfH * aspect;

  // Icon width at full scale; shrink the scale on narrow viewports so an icon
  // never exceeds ICON_MAX_WIDTH_FRACTION of the visible width.
  const fullWidth = (ICON_PX_WIDTH * ICON_BASE_SCALE) / HTML_TRANSFORM_DIVISOR;
  const scale =
    ICON_BASE_SCALE * Math.min(1, (ICON_MAX_WIDTH_FRACTION * 2 * halfW) / fullWidth);
  const iconHalfWidth = (ICON_PX_WIDTH * scale) / HTML_TRANSFORM_DIVISOR / 2;
  // X that hugs the left edge with a margin, fully on-screen.
  const x = -halfW + ICON_EDGE_MARGIN + iconHalfWidth;

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
