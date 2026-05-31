import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { CAMERA_SMOOTH_TIME, CameraTarget } from './poses';

interface CameraRigProps {
  target: CameraTarget;
  /**
   * Reports the settled target key: `null` the instant an animated move starts
   * (in transit), then the key once the camera finishes settling. Lets consumers
   * gate UI on "actually arrived" without trusting a stale last-known pose.
   */
  onSettle?: (key: string | null) => void;
}

// Drives the camera to whatever target it's given. We keep the controller
// *enabled* so its per-frame update() runs and animates our setLookAt transitions
// (drei only calls update() when enabled). To still forbid free-orbiting and
// preserve the 2D illusion, every mouse/touch gesture is mapped to ACTION.NONE.
export function CameraRig({ target, onSettle }: CameraRigProps) {
  const controls = useRef<CameraControls>(null);
  // First target snaps into place (no transition); later changes animate.
  const hasInitialized = useRef(false);
  // Keep the latest callback in a ref so it isn't an effect dependency.
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  const { key, spec, smoothTime } = target;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = hasInitialized.current;
    hasInitialized.current = true;
    // Set the easing time for THIS move imperatively (not via prop) so a re-render
    // mid-flight can't reset it. setLookAt uses the current smoothTime.
    c.smoothTime = smoothTime ?? CAMERA_SMOOTH_TIME;
    const transition = c.setLookAt(
      spec.position[0], spec.position[1], spec.position[2],
      spec.target[0], spec.target[1], spec.target[2],
      animate,
    );

    if (!animate) {
      onSettleRef.current?.(key);
      return;
    }

    // A move is starting: report "in transit" immediately so stale arrivals can't
    // reveal UI early. Resolve to the key when the camera reaches the destination.
    // `cancelled` guards against a newer target interrupting this transition.
    onSettleRef.current?.(null);
    let cancelled = false;
    transition.then(() => {
      if (!cancelled) onSettleRef.current?.(key);
    });
    return () => {
      cancelled = true;
    };
    // Re-run only when the destination key changes (spec is derived from key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <CameraControls
      ref={controls}
      // ACTION.NONE === 0 — block every drag/scroll/pinch so the camera only
      // ever moves under our programmatic control.
      mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
      touches={{ one: 0, two: 0, three: 0 }}
      makeDefault
    />
  );
}
