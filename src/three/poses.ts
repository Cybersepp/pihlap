// Camera choreography for the Buddha scene.
//
// The Buddha is recentered to the world origin and normalized to ~TARGET_SIZE
// units tall (see Buddha.tsx), so all pose coordinates below are in those
// normalized units. Tune these live with `npm run dev` — `position` is where
// the camera sits, `target` is the point it looks at.
//
//  - `rest`   : the "2D website" framing. The camera looks slightly up-and-left
//               of the Buddha so the figure sits in the BOTTOM-RIGHT of the
//               viewport, mimicking the old corner portrait. Nothing hints at 3D.
//  - `behind` : triggered by opening "selected works". The camera arcs around to
//               the far side and looks at the Buddha from behind, opening up the
//               space where the Finder is revealed.

export type CameraPose = 'rest' | 'behind';

export interface PoseSpec {
  /** Camera position [x, y, z] in normalized scene units. */
  position: [number, number, number];
  /** Look-at target [x, y, z] in normalized scene units. */
  target: [number, number, number];
}

// Desktop framing.
export const POSES: Record<CameraPose, PoseSpec> = {
  // Buddha pushed to bottom-right: look up-and-left of center.
  rest: { position: [0, 0.15, 4.3], target: [-1.15, 0.55, 0] },
  // Swung around the right side to behind the figure, looking back at it.
  behind: { position: [0.4, 0.35, -4.0], target: [0, 0.1, 0] },
};

// Portrait / mobile framing: figure lower and more centered so it reads under
// the fullscreen windows.
export const POSES_MOBILE: Record<CameraPose, PoseSpec> = {
  rest: { position: [0, 0.1, 5.2], target: [-0.2, 0.65, 0] },
  behind: { position: [0.3, 0.3, -4.8], target: [0, 0.1, 0] },
};

// How tall (in world units) the Buddha's largest dimension is normalized to.
export const TARGET_SIZE = 2.4;

// Extra rotation applied to the model, in radians [x, y, z]. Sketchfab exports
// don't always face +Z (toward the resting camera). If the Buddha shows its
// back or side at rest, nudge the Y value here.
export const MODEL_ROTATION: [number, number, number] = [0, 0, 0];

// Seconds for the camera to ease between poses (camera-controls smoothTime).
export const CAMERA_SMOOTH_TIME = 0.85;
