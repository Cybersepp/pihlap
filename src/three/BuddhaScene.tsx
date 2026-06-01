import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Buddha } from './Buddha';
import { CameraRig } from './CameraRig';
import { DesktopIcons3D, SceneIcon } from './DesktopIcons3D';
import { WorksFinder3D } from './WorksFinder3D';
import { TextPanel3D } from './TextPanel3D';
import { CameraTarget } from './poses';
import { Work } from '../data/works';
import { IconClickOrigin } from '../components/DesktopIcon';

// Which 3D window panel is mounted in the gallery center (if any).
export type Panel3DSpec =
  | {
      kind: 'finder';
      works: Work[];
      selectedWorkId?: string;
      onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
      onClose: () => void;
    }
  | { kind: 'text'; title: string; content: string; onClose: () => void };

interface BuddhaSceneProps {
  target: CameraTarget;
  isMobile: boolean;
  icons: SceneIcon[];
  /** The 3D window panel to mount in the gallery center, or null. */
  panel: Panel3DSpec | null;
  onSettle?: (key: string | null) => void;
  /** User may orbit around the gallery panel (after the swing settles). */
  orbitEnabled?: boolean;
}

// Full-screen transparent 3D layer that replaces the old corner portrait.
// It sits behind the desktop DOM (see .scene-canvas in styles.css) and contains
// the Buddha + lighting + the camera rig, plus the world-anchored desktop icons
// and (while a window is open) a 3D window panel floating in the gallery center.
// Lighting is a simple three-point rig (no HDRI / network dependency).
export function BuddhaScene({ target, isMobile, icons, panel, onSettle, orbitEnabled }: BuddhaSceneProps) {
  return (
    <div className="scene-canvas">
      <Canvas
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        camera={{ fov: 32, near: 0.1, far: 100, position: [0, 0.15, 4.3] }}
      >
        <ambientLight intensity={0.65} />
        {/* Key light, front-right and high. */}
        <directionalLight position={[3.5, 5, 4]} intensity={1.5} />
        {/* Cool fill / rim from behind-left to separate the silhouette. */}
        <directionalLight position={[-4, 2.5, -3.5]} intensity={0.7} />

        <Suspense fallback={null}>
          <Buddha />
        </Suspense>

        <DesktopIcons3D icons={icons} />

        {panel?.kind === 'finder' && (
          <WorksFinder3D
            works={panel.works}
            selectedWorkId={panel.selectedWorkId}
            onSelect={panel.onSelect}
            onClose={panel.onClose}
          />
        )}

        {panel?.kind === 'text' && (
          <TextPanel3D title={panel.title} content={panel.content} onClose={panel.onClose} />
        )}

        <CameraRig target={target} onSettle={onSettle} orbitEnabled={orbitEnabled} />
      </Canvas>
    </div>
  );
}
