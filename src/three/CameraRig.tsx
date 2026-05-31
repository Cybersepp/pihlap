import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { POSES, POSES_MOBILE, CAMERA_SMOOTH_TIME, CameraPose } from './poses';

interface CameraRigProps {
  pose: CameraPose;
  isMobile: boolean;
}

// Drives the camera between named poses. User input is disabled (enabled=false)
// so visitors can't free-orbit and break the 2D illusion — the camera only ever
// moves on our command. Programmatic setLookAt transitions still animate while
// disabled because drei keeps calling controls.update() each frame.
export function CameraRig({ pose, isMobile }: CameraRigProps) {
  const controls = useRef<CameraControls>(null);
  // First pose snaps into place (no transition); later changes animate.
  const hasInitialized = useRef(false);

  const poseSet = isMobile ? POSES_MOBILE : POSES;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const p = poseSet[pose];
    const animate = hasInitialized.current;
    hasInitialized.current = true;
    c.setLookAt(
      p.position[0], p.position[1], p.position[2],
      p.target[0], p.target[1], p.target[2],
      animate,
    );
  }, [pose, poseSet]);

  return (
    <CameraControls
      ref={controls}
      enabled={false}
      smoothTime={CAMERA_SMOOTH_TIME}
      makeDefault
    />
  );
}
