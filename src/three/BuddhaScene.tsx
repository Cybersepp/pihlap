import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Buddha } from './Buddha';
import { CameraRig } from './CameraRig';
import { CameraPose } from './poses';

interface BuddhaSceneProps {
  pose: CameraPose;
  isMobile: boolean;
}

// Full-screen transparent 3D layer that replaces the old corner portrait.
// It sits behind the desktop DOM (see .scene-canvas in styles.css) and contains
// only the Buddha + lighting + the camera rig. Lighting is a simple three-point
// rig (no HDRI / network dependency) which reads well against the model's baked
// textures and vertex colors.
export function BuddhaScene({ pose, isMobile }: BuddhaSceneProps) {
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

        <CameraRig pose={pose} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
