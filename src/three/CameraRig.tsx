import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CameraControlsImpl from 'camera-controls';
import { CAMERA_SMOOTH_TIME, CameraTarget, MODEL } from './poses';
import { registerCameraControls } from './liveCamera';

const { ACTION } = CameraControlsImpl;

// Slow → fast → slow. camera-controls' own smoothTime is a critically-damped
// spring (ease-OUT), so the cinematic gallery swing hand-drives this curve
// instead (see the `ease: 'inout'` branch below).
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Reused scratch so capturing the swing's start pose allocates nothing per move.
const _fromPos = new THREE.Vector3();
const _fromTgt = new THREE.Vector3();
const _off = new THREE.Vector3();

// Orbit angle (theta) + polar (phi) + radius of `pos` about `tgt`, matching
// camera-controls' convention (theta = atan2(x, z), phi = acos(y/r)) so our own
// interpolation reproduces the library's spherical framing exactly.
interface Orbit {
  r: number;
  theta: number;
  phi: number;
}
function orbitOf(pos: THREE.Vector3, tgt: readonly [number, number, number]): Orbit {
  _off.set(pos.x - tgt[0], pos.y - tgt[1], pos.z - tgt[2]);
  const r = _off.length() || 1;
  return {
    r,
    theta: Math.atan2(_off.x, _off.z),
    phi: Math.acos(THREE.MathUtils.clamp(_off.y / r, -1, 1)),
  };
}

// Shortest signed arc equivalent to `d`: wrap into (−π, π] ONLY when it overshoots
// (|d| > π). Exact ±π is left untouched, so the deliberate rest↔gallery half-turn
// still retraces its path — but an off-axis pose (detail / a tile) no longer takes
// the long way round the ±π seam (the "extra rotation" bug).
function shortestArc(d: number): number {
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// An in-flight hand-driven ease-in-out swing. `t` runs 0→1 over `dur` seconds;
// each frame the camera orbits from `from` → `to` along the eased curve, taking
// the shortest azimuth arc (see shortestArc) so it never over-rotates.
interface Swing {
  t: number;
  dur: number;
  fromTgt: [number, number, number];
  toTgt: [number, number, number];
  rA: number;
  phiA: number;
  thetaA: number;
  dR: number;
  dPhi: number;
  dTheta: number;
  key: string;
  cancelled: boolean;
}

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
  // The active hand-driven ease-in-out swing (null when idle / spring-driven).
  const swing = useRef<Swing | null>(null);

  const { key, spec, smoothTime, ease } = target;

  // Expose the controls to the dev tuning panel (no-op in production).
  useEffect(() => {
    registerCameraControls(controls.current);
    return () => registerCameraControls(null);
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = hasInitialized.current;
    hasInitialized.current = true;

    // Any new move supersedes an in-flight ease-in-out swing (the frame loop stops
    // driving the moment `swing.current` changes / is cleared).
    if (swing.current) swing.current.cancelled = true;
    swing.current = null;

    // Cinematic swing: hand-drive a fixed-duration ease-in-out curve instead of the
    // spring. Capture the CURRENT pose as the start so an interrupt (e.g. closing
    // mid-swing) hands off smoothly from wherever the camera is.
    if (animate && ease === 'inout') {
      // `false` = the CURRENT animated pose (not the pending end), so interrupting
      // a still-moving camera hands off from where it visually is — no jump.
      c.getPosition(_fromPos, false);
      c.getTarget(_fromTgt, false);
      const from = orbitOf(_fromPos, [_fromTgt.x, _fromTgt.y, _fromTgt.z]);
      _fromPos.set(spec.position[0], spec.position[1], spec.position[2]);
      const to = orbitOf(_fromPos, spec.target);
      const s: Swing = {
        t: 0,
        dur: MODEL.swingDuration,
        fromTgt: [_fromTgt.x, _fromTgt.y, _fromTgt.z],
        toTgt: spec.target,
        rA: from.r,
        phiA: from.phi,
        thetaA: from.theta,
        dR: to.r - from.r,
        dPhi: to.phi - from.phi,
        dTheta: shortestArc(to.theta - from.theta),
        key,
        cancelled: false,
      };
      swing.current = s;
      onSettleRef.current?.(null);
      return () => {
        s.cancelled = true;
      };
    }

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

  // Advance the hand-driven ease-in-out swing. We orbit the eased spherical point
  // ourselves (shortest azimuth arc) and setLookAt(..., false) snaps the camera
  // there each frame; drei's own update() then sees no delta — so this curve alone
  // shapes the motion, without camera-controls' long-way lerpLookAt azimuth.
  useFrame((_, dt) => {
    const s = swing.current;
    const c = controls.current;
    if (!s || s.cancelled || !c) return;
    s.t = Math.min(1, s.t + Math.min(dt, 0.05) / s.dur);
    const e = easeInOutCubic(s.t);
    const r = s.rA + s.dR * e;
    const phi = s.phiA + s.dPhi * e;
    const theta = s.thetaA + s.dTheta * e;
    const tx = s.fromTgt[0] + (s.toTgt[0] - s.fromTgt[0]) * e;
    const ty = s.fromTgt[1] + (s.toTgt[1] - s.fromTgt[1]) * e;
    const tz = s.fromTgt[2] + (s.toTgt[2] - s.fromTgt[2]) * e;
    const sinPhiR = r * Math.sin(phi);
    c.setLookAt(
      tx + sinPhiR * Math.sin(theta),
      ty + r * Math.cos(phi),
      tz + sinPhiR * Math.cos(theta),
      tx, ty, tz,
      false,
    );
    if (s.t >= 1) {
      swing.current = null;
      onSettleRef.current?.(s.key);
    }
  });

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
      // When orbit is off, fall back to camera-controls' permissive DEFAULTS (not
      // `undefined`): R3F assigns whatever we pass straight onto the instance, and a
      // number→undefined toggle leaves the limit undefined → clamp() returns NaN the
      // next time anything rotates (e.g. the gallery's off-ribbon orbit), which
      // NaNs the camera matrix and breaks the view. Defaults keep poses unconstrained.
      minDistance={orbitEnabled ? 3 : Number.EPSILON}
      maxDistance={orbitEnabled ? 14 : Infinity}
      minPolarAngle={orbitEnabled ? Math.PI * 0.12 : 0}
      maxPolarAngle={orbitEnabled ? Math.PI * 0.88 : Math.PI}
      makeDefault
    />
  );
}
