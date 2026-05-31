// Camera choreography + 3D layout for the Buddha scene.
//
// The Buddha is recentered to the world origin and normalized to ~TARGET_SIZE
// units tall (see Buddha.tsx). All coordinates below are in those normalized
// units. Tune live with `npm run dev` — `position` is where the camera sits,
// `target` is the point it looks at.

export interface PoseSpec {
  /** Camera position [x, y, z] in normalized scene units. */
  position: [number, number, number];
  /** Look-at target [x, y, z] in normalized scene units. */
  target: [number, number, number];
}

// A camera destination plus a stable key. The key identifies the destination so
// UI can gate on "settled at this exact target" (see CameraRig.onSettle).
export interface CameraTarget {
  key: string;
  spec: PoseSpec;
}

// Where the works window panel floats in world space (in front of the Buddha,
// farther out). The gallery camera looks here AND the panel is centered here —
// they share this one constant so they always stay consistent. Tune this to move
// the whole gallery; tune POSES.gallery.position to move the camera viewpoint.
export const GALLERY_CENTER: [number, number, number] = [0, 0.4, 3.0];

// Static named poses.
//  - `rest`    : the "2D website" framing — Buddha facing the viewer. No 3D hint.
//  - `gallery` : triggered by "selected works". The camera swings around BEHIND
//                the Buddha to this spot and looks at the works panel. The
//                `position` here is the tunable "behind the Buddha" viewpoint;
//                `target` is locked to GALLERY_CENTER so the camera always frames
//                the panel even if you move it.
export const POSES: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0.0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0, 0.4, -2.2], target: GALLERY_CENTER },
};

export const POSES_MOBILE: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0, 7], target: [0, 0.0, 0] },
  gallery: { position: [-4, 2, -5], target: GALLERY_CENTER },
};

// How tall (in world units) the Buddha's largest dimension is normalized to.
export const TARGET_SIZE = 3.0;

// Extra rotation applied to the model, in radians [x, y, z]. Sketchfab exports
// don't always face +Z (toward the resting camera). If the Buddha shows its
// back or side at rest, nudge the Y value here.
export const MODEL_ROTATION: [number, number, number] = [0, 0.25, 0];

// Seconds for the camera to ease between poses (camera-controls smoothTime).
export const CAMERA_SMOOTH_TIME = 0.85;

// World positions of the desktop icons, in normalized scene units. The icons are
// anchored here in 3D space (not glued to the screen) so the camera arc produces
// real parallax — selling "we moved" instead of "the Buddha spun". At the `rest`
// pose these should land on the left, vertically stacked, like the old desktop.
// Tune live in `npm run dev`.
export const ICON_POSITIONS: Record<string, [number, number, number]> = {
  works: [-3.5, 1.5, 0],
  contact: [-3.5, 0.5, 0],
  readme: [-3.5, -0.5, 0],
};

// Scale applied to the Html-transformed icons. In `transform` mode 1 CSS pixel ≈
// 1 world unit at scale 1, so a ~108px icon needs a small factor to read at the
// resting camera distance. Adjust alongside ICON_POSITIONS.
export const ICON_SCALE = 0.3075;

// ── 3D works gallery ────────────────────────────────────────────────────────
// The actual Finder window (glass panel, titlebar, grid) floats as ONE panel in
// front of the Buddha (the side it faces), facing the gallery camera (faceY) so
// it reads head-on once the camera has swung around. All tunable.
export const GALLERY = {
  /** Center of the window panel — shared with the gallery camera target. */
  center: GALLERY_CENTER,
  /** Html `transform` scale for the whole Finder window. drei applies a hidden
   *  ÷40 factor, so on-screen world width ≈ panelPx × scale / 40. */
  scale: 0.2,
  /** Y rotation (radians) so the window faces the gallery camera on the far side. */
  faceY: Math.PI,
};

// How far in front of a clicked file the camera sits before the video opens.
export const FOCUS_DISTANCE = 1.6;

// Convert a point on the window panel (its measured world position) into a camera
// pose that frames it head-on, sitting FOCUS_DISTANCE in front along the panel's
// facing normal. Used to fly the camera to the clicked file.
export function getFocusPoseFromWorld(world: [number, number, number]): PoseSpec {
  // Panel front normal after the faceY rotation (local +Z rotated about Y).
  const nx = Math.sin(GALLERY.faceY);
  const nz = Math.cos(GALLERY.faceY);
  return {
    position: [world[0] + nx * FOCUS_DISTANCE, world[1], world[2] + nz * FOCUS_DISTANCE],
    target: world,
  };
}
