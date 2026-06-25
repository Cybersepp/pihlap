import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { CAMERA_SMOOTH_TIME, CameraTarget } from './poses';

const { ACTION } = CameraControlsImpl;

interface CameraRigProps {
  target: CameraTarget;
  /**
   * Reports the settled target key: `null` the instant an animated move starts
   * (in transit), then the key once the camera finishes settling. Lets consumers
   * gate UI on "actually arrived" without trusting a stale last-known pose.
   */
  onSettle?: (key: string | null) => void;
  /**
   * Allow drag / pinch orbit. Enabled as soon as the gallery is the destination
   * (the moment the swing begins, in sync with the backdrop crossfade) rather
   * than waiting for it to settle — the auto setLookAt swing keeps running until
   * the user actually grabs it.
   */
  orbitEnabled?: boolean;
}

// Drives the camera to whatever target it's given. We keep the controller
// *enabled* so its per-frame update() runs and animates our setLookAt transitions
// (drei only calls update() when enabled). Gestures are off at rest and while
// flying to a focused tile; when the gallery is the destination the user may orbit.
export function CameraRig({
  target,
  onSettle,
  orbitEnabled = false,
}: CameraRigProps) {
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

  const blocked = { left: ACTION.NONE, middle: ACTION.NONE, right: ACTION.NONE, wheel: ACTION.NONE };
  const orbitMouse = {
    left: ACTION.ROTATE,
    middle: ACTION.DOLLY,
    right: ACTION.NONE,
    wheel: ACTION.DOLLY,
  };
  const blockedTouch = { one: ACTION.NONE, two: ACTION.NONE, three: ACTION.NONE };
  const orbitTouch = {
    one: ACTION.TOUCH_ROTATE,
    two: ACTION.TOUCH_DOLLY,
    three: ACTION.NONE,
  };

  return (
    <CameraControls
      ref={controls}
      mouseButtons={orbitEnabled ? orbitMouse : blocked}
      touches={orbitEnabled ? orbitTouch : blockedTouch}
      minDistance={orbitEnabled ? 3 : undefined}
      maxDistance={orbitEnabled ? 14 : undefined}
      minPolarAngle={orbitEnabled ? Math.PI * 0.12 : undefined}
      maxPolarAngle={orbitEnabled ? Math.PI * 0.88 : undefined}
      makeDefault
    />
  );
}
