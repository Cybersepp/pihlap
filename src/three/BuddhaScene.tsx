import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Buddha } from './Buddha';
import { CameraRig } from './CameraRig';
import { DesktopIcons3D, SceneIcon } from './DesktopIcons3D';
import { WorksFinder3D } from './WorksFinder3D';
import { CameraTarget } from './poses';
import { Work } from '../data/works';
import { IconClickOrigin } from '../components/DesktopIcon';

interface GalleryProps {
  works: Work[];
  selectedWorkId?: string;
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
  onClose: () => void;
}

interface BuddhaSceneProps {
  target: CameraTarget;
  isMobile: boolean;
  icons: SceneIcon[];
  /** When set, the 3D works grid is mounted in the scene. */
  gallery: GalleryProps | null;
  onSettle?: (key: string | null) => void;
}

// Full-screen transparent 3D layer that replaces the old corner portrait.
// It sits behind the desktop DOM (see .scene-canvas in styles.css) and contains
// the Buddha + lighting + the camera rig, plus the world-anchored desktop icons
// and (while browsing) the floating works gallery. Lighting is a simple
// three-point rig (no HDRI / network dependency).
export function BuddhaScene({ target, isMobile, icons, gallery, onSettle }: BuddhaSceneProps) {
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

        {gallery && (
          <WorksFinder3D
            works={gallery.works}
            selectedWorkId={gallery.selectedWorkId}
            onSelect={gallery.onSelect}
            onClose={gallery.onClose}
          />
        )}

        <CameraRig target={target} onSettle={onSettle} />
      </Canvas>
    </div>
  );
}
