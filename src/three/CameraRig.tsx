import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { POSES, POSES_MOBILE, CAMERA_SMOOTH_TIME, CameraPose } from './poses';

interface CameraRigProps {
  pose: CameraPose;
  isMobile: boolean;
  /**
   * Reports the settled pose: `null` the instant an animated move starts (in
   * transit), then the pose once the camera finishes settling. Lets consumers
   * gate UI on "actually arrived" without trusting a stale last-known pose.
   */
  onSettle?: (pose: CameraPose | null) => void;
}

// Drives the camera between named poses. We keep the controller *enabled* so its
// per-frame update() runs and animates our setLookAt transitions (drei only calls
// update() when enabled). To still forbid free-orbiting and preserve the 2D
// illusion, every mouse/touch gesture is mapped to ACTION.NONE (0) below.
export function CameraRig({ pose, isMobile, onSettle }: CameraRigProps) {
  const controls = useRef<CameraControls>(null);
  // First pose snaps into place (no transition); later changes animate.
  const hasInitialized = useRef(false);
  // Keep the latest callback in a ref so it isn't an effect dependency (which
  // would re-run setLookAt every render).
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  const poseSet = isMobile ? POSES_MOBILE : POSES;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const p = poseSet[pose];
    const animate = hasInitialized.current;
    hasInitialized.current = true;
    const transition = c.setLookAt(
      p.position[0], p.position[1], p.position[2],
      p.target[0], p.target[1], p.target[2],
      animate,
    );

    if (!animate) {
      // Initial snap — already there.
      onSettleRef.current?.(pose);
      return;
    }

    // A move is starting: report "in transit" immediately so stale arrivals can't
    // reveal UI early. Resolve to the pose when the camera reaches the destination.
    // `cancelled` guards against a newer pose change interrupting this transition.
    onSettleRef.current?.(null);
    let cancelled = false;
    transition.then(() => {
      if (!cancelled) onSettleRef.current?.(pose);
    });
    return () => {
      cancelled = true;
    };
  }, [pose, poseSet]);

  return (
    <CameraControls
      ref={controls}
      smoothTime={CAMERA_SMOOTH_TIME}
      // ACTION.NONE === 0 — block every drag/scroll/pinch so the camera only
      // ever moves under our programmatic control.
      mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
      touches={{ one: 0, two: 0, three: 0 }}
      makeDefault
    />
  );
}
