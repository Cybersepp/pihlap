import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Martin } from './Martin';
import { CameraRig } from './CameraRig';
import { DesktopIcons3D, SceneIcon } from './DesktopIcons3D';
import { WorksSpiral3D } from './WorksSpiral3D';
import { TextPanel3D } from './TextPanel3D';
import { CameraTarget, SCENE_FOV } from './poses';
import { MaterialSettings } from './materialSettings';
import { Work } from '../data/works';
import { IconClickOrigin } from '../components/DesktopIcon';

// Which 3D window panel is mounted in the gallery center (if any).
export type Panel3DSpec =
  | {
      kind: 'finder';
      works: Work[];
      selectedWorkId?: string;
      /** false during close, so the files fly back into the folder before unmount. */
      open: boolean;
      /** true while a video is open — the orbits halt cleanly, then resume. */
      paused: boolean;
      /** true in the detail state — the focused tile shows a 3D play button. */
      showPlay: boolean;
      onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
      onPlay: () => void;
    }
  | { kind: 'text'; title: string; content: ReactNode; onClose: () => void };

interface MartinSceneProps {
  target: CameraTarget;
  isMobile: boolean;
  icons: SceneIcon[];
  /** The 3D window panel to mount in the gallery center, or null. */
  panel: Panel3DSpec | null;
  onSettle?: (key: string | null) => void;
  /** User may orbit around the gallery panel (after the swing settles). */
  orbitEnabled?: boolean;
  /** A work detail/video is open — sink the figure into the background. */
  dimmed?: boolean;
  /** Live material settings from the dev panel (defaults applied in production). */
  materialSettings?: MaterialSettings;
}

// Full-screen transparent 3D layer that replaces the old corner portrait.
// It sits behind the desktop DOM (see .scene-canvas in styles.css) and contains
// the Martin figure + lighting + the camera rig, plus the world-anchored desktop icons
// and (while a window is open) a 3D window panel floating in the gallery center.
// Lighting is a simple three-point rig (no HDRI / network dependency).
export function MartinScene({ target, isMobile, icons, panel, onSettle, orbitEnabled, dimmed, materialSettings }: MartinSceneProps) {
  return (
    <div className="scene-canvas">
      <Canvas
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        camera={{ fov: SCENE_FOV, near: 0.1, far: 100, position: [0, 0, 7] }}
      >
        <ambientLight intensity={0.65} />
        {/* Key light, front-right and high. */}
        <directionalLight position={[3.5, 5, 4]} intensity={1.5} />
        {/* Cool fill / rim from behind-left to separate the silhouette. */}
        <directionalLight position={[-4, 2.5, -3.5]} intensity={0.7} />

        <Suspense fallback={null}>
          <Martin dimmed={!!dimmed} settings={materialSettings} />
        </Suspense>

        <DesktopIcons3D icons={icons} dimmed={!!dimmed} />

        {panel?.kind === 'finder' && (
          <WorksSpiral3D
            works={panel.works}
            selectedWorkId={panel.selectedWorkId}
            open={panel.open}
            paused={panel.paused}
            showPlay={panel.showPlay}
            onSelect={panel.onSelect}
            onPlay={panel.onPlay}
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
