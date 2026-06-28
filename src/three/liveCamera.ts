import type CameraControls from 'camera-controls';
import { CAMERA_SMOOTH_TIME, PoseSpec } from './poses';

// Dev-only bridge so the (DOM) ribbon tuning panel can nudge the live camera.
// CameraRig registers its controls instance here; RibbonControls re-issues the
// gallery pose through it whenever a camera slider moves. No-op in production
// where the panel never mounts.
let active: CameraControls | null = null;

export function registerCameraControls(c: CameraControls | null): void {
  active = c;
}

export function applyPose(spec: PoseSpec, smoothTime = CAMERA_SMOOTH_TIME * 0.4): void {
  if (!active) return;
  active.smoothTime = smoothTime;
  active.setLookAt(
    spec.position[0], spec.position[1], spec.position[2],
    spec.target[0], spec.target[1], spec.target[2],
    true,
  );
}
