// Camera choreography + 3D layout for the Martin scene.
//
// The Martin is recentered to the world origin and normalized to ~TARGET_SIZE
// units tall (see Martin.tsx). All coordinates below are in those normalized
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

// Where the works window panel floats in world space (in front of the Martin,
// farther out). The gallery camera looks here AND the panel is centered here —
// they share this one constant so they always stay consistent. Tune this to move
// the whole gallery; tune POSES.gallery.position to move the camera viewpoint.
export const GALLERY_CENTER: [number, number, number] = [0, 1, 0];

// Static named poses.
//  - `rest`    : the "2D website" framing — Martin facing the viewer. No 3D hint.
//  - `gallery` : triggered by "selected works". The camera swings around BEHIND
//                the Martin to this spot and looks at the works panel. The
//                `position` here is the tunable "behind the Martin" viewpoint;
//                `target` is locked to GALLERY_CENTER so the camera always frames
//                the panel even if you move it.
// `gallery` is the complete 180° opposite of `rest`: the camera swings all the
// way BEHIND Martin (rest sits at +Z; gallery mirrors to -Z) so the works spiral
// is viewed from the literal inverse of where the site opens. Mobile sits a touch
// farther back so the helix isn't clipped on a narrow viewport.
export const POSES: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0.0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0, 0, -7], target: GALLERY_CENTER },
};

export const POSES_MOBILE: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0, 0, -8.5], target: GALLERY_CENTER },
};

// Single static camera field of view (degrees) for the whole scene — used by the
// Canvas and by DesktopIcons3D to frame the icon column against the rest frustum.
export const SCENE_FOV = 32;

// How tall (in world units) the Martin's largest dimension is normalized to.
export const TARGET_SIZE = 3.0;

// Extra rotation applied to the model, in radians [x, y, z]. Sketchfab exports
// don't always face +Z (toward the resting camera). If the Martin shows its
// back or side at rest, nudge the Y value here.
export const MODEL_ROTATION: [number, number, number] = [0, 4, 0.2];

// Seconds for the camera to ease between poses (camera-controls smoothTime).
// CAMERA_SMOOTH_TIME is the default (the cinematic swing behind the Martin);
// FOCUS_SMOOTH_TIME is the snappier fly-to-file so the video opens quickly.
export const CAMERA_SMOOTH_TIME = 0.85;
// Slower than a snap so the small reframe runs simultaneously with the tile's
// expand-toward-camera flourish when a video opens.
export const FOCUS_SMOOTH_TIME = 0.6;

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
// column) and WorksSpiral3D (so the files spill out of the actual folder icon).
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
// front of the Martin (the side it faces), facing the gallery camera (faceY) so
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

// The text windows (contact.txt / readme.txt) sit FARTHER from the Martin than
// the video panel, so they don't crowd the model. We push them straight back
// ALONG the gallery camera's view ray (camera → GALLERY_CENTER), so they stay
// dead-centre on screen — only their distance from the model changes. Bump
// TEXT_PANEL_PUSHBACK to move them further still; the video center is unaffected.
export const TEXT_PANEL_PUSHBACK = 1.6;
// Slide the text windows along the gallery camera's right vector so they sit a
// little right of centre on screen (the camera views at an angle, so a plain
// world-X shift would read as diagonal).
export const TEXT_PANEL_SHIFT_RIGHT = 1.5;
export const TEXT_PANEL_CENTER: [number, number, number] = (() => {
  const cam = POSES.gallery.position;
  const c = GALLERY_CENTER;
  const dir = [c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]];
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const k = TEXT_PANEL_PUSHBACK / len;
  const base = [c[0] + dir[0] * k, c[1] + dir[1] * k, c[2] + dir[2] * k];
  // Screen-right = normalize(forward × worldUp), forward = camera → center.
  const right = [-dir[2], 0, dir[0]];
  const rlen = Math.hypot(right[0], right[1], right[2]) || 1;
  const s = TEXT_PANEL_SHIFT_RIGHT / rlen;
  return [base[0] + right[0] * s, base[1] + right[1] * s, base[2] + right[2] * s];
})();

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
  /** Supersampling factor for the file's DOM: it's laid out this many times
   *  larger in CSS px and the Html scale is divided by the same factor, so the
   *  on-screen size is unchanged but the backing texture has N× the resolution.
   *  Keeps the always-on labels crisp even while the files move/billboard
   *  (a moving <Html transform> samples its rasterized layer, so more texels =
   *  sharper text). Bump for sharper, drop for less GPU memory. */
  supersample: 2.5,
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

// ── Works spiral (endless helix) ─────────────────────────────────────────────
// The works wind up an endless helix around Martin. A continuous scroll value `s`
// drives it; each work sits at the integer slot ≡ its index (mod N) nearest `s`,
// wrapping by N off-screen so the helix reads as infinite. `phase = slot - s` is a
// work's signed distance from front-and-center (phase 0 = the focused slot facing
// the gallery camera). All tunable live.
export const SPIRAL = {
  /** Axis the helix winds around (shared with the gallery camera target). */
  center: GALLERY_CENTER,
  /** Horizontal radius of the helix. */
  radius: 2.8,
  /** Angular gap between consecutive works (radians) — ~36° ≈ 10 per turn. */
  angleStep: Math.PI / 6,
  /** Vertical rise per work step. */
  heightStep: 0.45,
  /** |phase| where tiles start/finish fading out toward the off-screen wrap. */
  fadeStart: 3,
  fadeEnd: 5,
  /** |phase| within which a tile counts as focused (color + video + title). */
  focusRange: 0.55,
  /** Plane size [w, h] of each tile in world units (~16:10). */
  tile: [1.5, 0.94] as [number, number],
};

// The integer slot congruent to `i (mod n)` nearest the scroll position `s`.
// Wrapping by n keeps |phase| ≤ n/2, so the recycle happens far behind Martin.
export function nearestCongruentSlot(i: number, s: number, n: number): number {
  return i + n * Math.round((s - i) / n);
}

// World position of a tile at a given phase (= slot - s). phase 0 sits on the
// near side (toward the gallery camera at -Z), between the camera and Martin.
export function spiralPosition(phase: number): [number, number, number] {
  const a = phase * SPIRAL.angleStep;
  const [cx, cy, cz] = SPIRAL.center;
  return [
    cx + Math.sin(a) * SPIRAL.radius,
    cy + phase * SPIRAL.heightStep,
    cz - Math.cos(a) * SPIRAL.radius,
  ];
}

// How far in front of a clicked file the camera sits before the video opens.
// Kept large so the camera only nudges/reframes a little — the tile's own
// expand-toward-camera does the work of "coming forward", and the camera move
// just adds parallax depth.
export const FOCUS_DISTANCE = 4.5;

// The opening tile yaws this many radians to the right as it expands. Shared with
// WorksSpiral3D so the camera reframe can follow it. Flip the sign to turn the
// other way; both the tile and the camera swing follow this one constant.
export const FOCUS_TILE_YAW = 0.3;
// How much of that yaw the camera follows: 0 = ignore the turn, 1 = swing fully
// around so the turned tile reads head-on. Partial keeps the turn visible while
// still framing it nicely.
export const FOCUS_YAW_FOLLOW = 0.8;

// Convert a point on the window panel (its measured world position) into a camera
// pose that frames it head-on, sitting FOCUS_DISTANCE in front along the panel's
// facing normal. Used to fly the camera to the clicked file.
export function getFocusPoseFromWorld(world: [number, number, number]): PoseSpec {
  // Swing the camera partway around the tile in the same direction it yaws, so the
  // reframe respects the turn rather than fighting it (a = faceY + followed yaw).
  const a = GALLERY.faceY + FOCUS_TILE_YAW * FOCUS_YAW_FOLLOW;
  const nx = Math.sin(a);
  const nz = Math.cos(a);
  return {
    position: [world[0] + nx * FOCUS_DISTANCE, world[1], world[2] + nz * FOCUS_DISTANCE],
    target: world,
  };
}

// World-X pan applied to the DETAIL view so the selected tile sits in the LEFT
// third, leaving room for the info panel on the right. Negative pushes the tile
// left (the gallery camera views from -Z, so its screen-right is world -X). Flip
// the sign to put the tile on the right instead.
export const DETAIL_PAN = -1.7;

// Detail pose: the focus pose, panned sideways so the tile reads left-of-centre.
// Panning camera AND target by the same vector is a pure pan (perspective intact).
export function getDetailPoseFromWorld(world: [number, number, number]): PoseSpec {
  const f = getFocusPoseFromWorld(world);
  return {
    position: [f.position[0] + DETAIL_PAN, f.position[1], f.position[2]],
    target: [f.target[0] + DETAIL_PAN, f.target[1], f.target[2]],
  };
}
