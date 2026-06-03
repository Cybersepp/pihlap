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
  /** Per-move easing time (seconds). Defaults to CAMERA_SMOOTH_TIME. */
  smoothTime?: number;
}

// Where the works window panel floats in world space (in front of the Buddha,
// farther out). The gallery camera looks here AND the panel is centered here —
// they share this one constant so they always stay consistent. Tune this to move
// the whole gallery; tune POSES.gallery.position to move the camera viewpoint.
export const GALLERY_CENTER: [number, number, number] = [0, 1, 0];

// Static named poses.
//  - `rest`    : the "2D website" framing — Buddha facing the viewer. No 3D hint.
//  - `gallery` : triggered by "selected works". The camera swings around BEHIND
//                the Buddha to this spot and looks at the works panel. The
//                `position` here is the tunable "behind the Buddha" viewpoint;
//                `target` is locked to GALLERY_CENTER so the camera always frames
//                the panel even if you move it.
export const POSES: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0.0, 7], target: [0, 0.0, 0] },
  gallery: { position: [-4, 2, -5], target: GALLERY_CENTER },
};

export const POSES_MOBILE: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0, 7], target: [0, 0.0, 0] },
  gallery: { position: [-4, 2, -5], target: GALLERY_CENTER },
};

// Single static camera field of view (degrees) for the whole scene — used by the
// Canvas and by DesktopIcons3D to frame the icon column against the rest frustum.
export const SCENE_FOV = 32;

// How tall (in world units) the Buddha's largest dimension is normalized to.
export const TARGET_SIZE = 3.0;

// Extra rotation applied to the model, in radians [x, y, z]. Sketchfab exports
// don't always face +Z (toward the resting camera). If the Buddha shows its
// back or side at rest, nudge the Y value here.
export const MODEL_ROTATION: [number, number, number] = [0, 4, 0.2];

// Seconds for the camera to ease between poses (camera-controls smoothTime).
// CAMERA_SMOOTH_TIME is the default (the cinematic swing behind the Buddha);
// FOCUS_SMOOTH_TIME is the snappier fly-to-file so the video opens quickly.
export const CAMERA_SMOOTH_TIME = 0.85;
export const FOCUS_SMOOTH_TIME = 0.35;

// ── Desktop icons (responsive layout) ───────────────────────────────────────
// The icons are NOT positioned with hardcoded coordinates. Instead DesktopIcons3D
// computes their world positions from the resting camera's view frustum, so they
// hug the left edge and fit any viewport/aspect (desktop or phone) automatically.
// They stay world-anchored (fixed during the camera swing → real parallax); only
// a viewport resize repositions them. Tune the layout with the constants below.

// The desktop-icon DOM width in CSS px (see `.desktop-icon` in styles.css).
export const ICON_PX_WIDTH = 108;
// Vertical world positions for the stacked icons (top → bottom), index-matched
// to the icon order. Constant across devices — the visible height barely changes
// with aspect, so these always fit.
export const ICON_ROWS_Y = [1.5, 0.5, -0.5];
// World gap kept between the left viewport edge and the icon column.
export const ICON_EDGE_MARGIN = 0.15;
// Base scale at full size; auto-shrinks on narrow viewports so an icon never
// exceeds ICON_MAX_WIDTH_FRACTION of the visible width.
export const ICON_BASE_SCALE = 0.3075;
export const ICON_MAX_WIDTH_FRACTION = 0.3;

// World X (and on-screen scale) of the desktop icon column for a given viewport
// aspect, framed against the rest pose. Shared by DesktopIcons3D (to place the
// column) and WorksReveal3D (so the files fly out of the actual folder icon).
export function iconColumnLayout(aspect: number): { x: number; scale: number } {
  const HTML_TRANSFORM_DIVISOR = 40;
  const restDist = POSES.rest.position[2];
  const halfH = restDist * Math.tan((SCENE_FOV * Math.PI) / 360);
  const halfW = halfH * aspect;
  const fullWidth = (ICON_PX_WIDTH * ICON_BASE_SCALE) / HTML_TRANSFORM_DIVISOR;
  const scale =
    ICON_BASE_SCALE * Math.min(1, (ICON_MAX_WIDTH_FRACTION * 2 * halfW) / fullWidth);
  const iconHalfWidth = (ICON_PX_WIDTH * scale) / HTML_TRANSFORM_DIVISOR / 2;
  const x = -halfW + ICON_EDGE_MARGIN + iconHalfWidth;
  return { x, scale };
}

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

// ── 3D works cloud ──────────────────────────────────────────────────────────
// The works are free-floating ".mov" files scattered in a loose cloud around the
// gallery center (no Finder window). They fly out from the center on open and
// drift subtly while hovered. All tunable.
export const CLOUD = {
  /** Half-extents of the scatter volume around GALLERY.center, [x, y, z]. */
  spread: [1.5, 0.9, 0.95] as [number, number, number],
  /** Html `transform` scale per file (on-screen world width ≈ panelPx × scale / 40). */
  scale: 0.16,
  /** World amplitude of the very subtle particle drift while a file is hovered. */
  driftAmplitude: 0.035,
};

// ── Orbiting works ───────────────────────────────────────────────────────────
// Instead of freezing into a static cloud, the files settle into slow orbits
// around the figure — each on its own radius, height, tilted plane, phase and
// speed, so it reads as a loose orbital system rather than a flat ring. Tune live.
export const ORBIT = {
  /** Point the files orbit around (shared with the gallery camera target). */
  center: GALLERY_CENTER,
  /** Base orbital radius and the +/- random spread applied per file. */
  radius: 2,
  radiusJitter: 1,
  /** Vertical spread of the orbits, so they don't all sit in one plane. */
  heightJitter: 1,
  /** Max random tilt of each file's orbital plane (radians). */
  tilt: 0.6,
  /** Base angular speed (rad/s) and the per-file random multiplier spread. */
  speed: 0.08,
  speedJitter: 0.4,
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
