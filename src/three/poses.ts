  // Camera choreography + 3D layout for the Martin scene.
//
// The Martin is recentered to the world origin and normalized to ~TARGET_SIZE
// units tall (see Martin.tsx). All coordinates below are in those normalized
// units. Tune live with `npm run dev` — `position` is where the camera sits,
// `target` is the point it looks at.

import * as THREE from 'three';

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
// `gallery` swings the camera all the way BEHIND Martin (rest at +Z, gallery at
// -Z) so the works spiral is viewed from the inverse of where the site opens.
// The gallery X is nudged toward the icon column (world -X) instead of dead-on
// -Z: a pure 180° flip is an ambiguous shortest-path for camera-controls (it
// picks the swing direction by a coin flip), so this small offset forces the
// camera to always swing through the icon side, both opening and closing.
// Mobile sits a touch farther back so the helix isn't clipped on a narrow viewport.
export const POSES: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0.0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0, 0.2, -6.2], target: GALLERY_CENTER },
};

export const POSES_MOBILE: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0, 7], target: [0, 0.0, 0] },
  gallery: { position: [-0.36, 0, -8.5], target: GALLERY_CENTER },
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
  /** Axis the ribbon arches around. Initialised to GALLERY_CENTER but kept as its
   *  OWN array so the ribbon can be repositioned independently of the gallery
   *  camera's look-at target (move this to slide the ribbon within the frame). */
  center: [0.1, 2.3, 3] as [number, number, number],
  /** Rigid rotation of the whole ribbon about its center, Euler radians [x, y, z].
   *  Lets the arch be tipped/turned to face the gallery camera. Applied uniformly
   *  to every tile's position AND orientation so the band stays conformed. */
  rotation: [-0.182, 0, 0] as [number, number, number],
  // ── Ribbon path: a rising arch, not a closed circle. Videos march sideways by
  // `spread` per step while their depth follows a bell curve — deepest toward the
  // camera at center, easing back to flat at the edges. The bell's inflection is
  // what makes the far videos curve the OTHER way before flattening off-screen.
  /** Horizontal (X) distance the ribbon marches per work step — sets the spacing
   *  between videos and how quickly they run off to the sides. */
  spread: 2.55,
  /** How far the ribbon bulges toward the camera at its center (world units, -Z).
   *  The middle videos sit this far forward; the curve eases back to flat (0) at
   *  the edges, so the band reads as an arch that flattens out as it exits. */
  depth: 2,
  /** Width of that bulge, in steps (the bell-curve sigma). Smaller = a tight hump
   *  near center that flattens quickly; larger = a broad arch. Videos begin
   *  curving the OTHER way at ~archWidth/√2 steps out, then flatten off-screen. */
  archWidth: 0.7,
  /** Vertical rise per work step. */
  heightStep: 0,
  /** Ribbon twist: radians each tile rolls about its outward normal PER step away
   *  from center (see `ribbonRoll`/`ribbonFrame`). The focused tile (phase 0) is
   *  always flat/unrolled and facing the camera; tiles twist away progressively to
   *  the sides. 0 = upright carousel (no twist); higher = a tighter ribbon twist.
   *  Flip the sign to twist the other way. Tune live. */
  twist: 0,
  /** |phase| where tiles start/finish fading out toward the off-screen wrap. */
  fadeStart: 1,
  fadeEnd: 4.5,
  /** |phase| within which a tile counts as focused (color + video + title). */
  focusRange: 0.55,
  /** Plane size [w, h] of each tile in world units (~16:10). Height is used as-is;
   *  the WIDTH is now derived from `fill` × `spread` so videos tile the ribbon
   *  (see below), but this width is still used as a fallback/reference. */
  tile: [1.5, 1.28] as [number, number],
  /** Fraction of one step each video occupies ALONG the ribbon when the tiles are
   *  conformed to the surface. 1 = edge-to-edge (no gap); <1 leaves a gap between
   *  neighbours while their edges still line up along the ribbon. */
  fill: 0.82,
  /** How much each tile bends widthwise to wrap around the helix's cylinder, so
   *  videos read as curved panels rather than flat slabs. 0 = flat; 1 = conforms
   *  to the helix radius (gentle); >1 = more pronounced bow. Flip the sign to bow
   *  the other way (toward vs away from the viewer). Tune live. */
  curve: 0,
  /** Depth (world units) of the solid bezel shell behind each video, giving the
   *  tiles real thickness you see as they turn on the ribbon. 0 = flat card (no
   *  thickness); ~0.04 = thin card; larger = a chunky slab. Tune live. */
  thickness: 0.04,
  /** Brightness of the bezel edge, 0 (black) → 1 (white). ~0.23 is a dark grey. */
  bezel: 0.23,
};

// The integer slot congruent to `i (mod n)` nearest the scroll position `s`.
// Wrapping by n keeps |phase| ≤ n/2, so the recycle happens far behind Martin.
export function nearestCongruentSlot(i: number, s: number, n: number): number {
  return i + n * Math.round((s - i) / n);
}

// The bell curve that shapes the ribbon's depth: 1 at center, easing to 0 at the
// edges. `bell` is the value; `bellSlope` is its derivative d/dphase, which the
// path's tangent (and thus each tile's facing normal) is built from.
function bell(phase: number): number {
  return Math.exp(-((phase / SPIRAL.archWidth) ** 2));
}
function bellSlope(phase: number): number {
  return bell(phase) * (-2 * phase) / (SPIRAL.archWidth * SPIRAL.archWidth);
}

// The ribbon's rigid rotation (SPIRAL.rotation) as a quaternion, rebuilt on each
// call from the live Euler so dev-panel edits apply instantly. Scratch-backed.
const _spiralRotE = new THREE.Euler();
const _spiralRotQ = new THREE.Quaternion();
function spiralRotation(): THREE.Quaternion {
  const [rx, ry, rz] = SPIRAL.rotation;
  _spiralRotE.set(rx, ry, rz);
  return _spiralRotQ.setFromEuler(_spiralRotE);
}

// World position of a tile at a given phase (= slot - s). phase 0 sits at the
// crest of the arch (nearest the gallery camera at -Z), between camera and Martin.
// Videos march sideways linearly while their depth follows the bell curve, so the
// band arches toward the viewer in the middle and flattens off-screen at the ends.
// The center-relative point is rotated by SPIRAL.rotation, then offset to center,
// so the whole arch can be tipped/turned toward the camera as one rigid body.
const _spPos = new THREE.Vector3();
export function spiralPosition(phase: number): [number, number, number] {
  const [cx, cy, cz] = SPIRAL.center;
  _spPos
    .set(SPIRAL.spread * phase, SPIRAL.heightStep * phase, -SPIRAL.depth * bell(phase))
    .applyQuaternion(spiralRotation());
  return [cx + _spPos.x, cy + _spPos.y, cz + _spPos.z];
}

// How much a tile faces the gallery camera at a given phase: ~1 = square-on (the
// crest and the flattened far ends), dipping on the slopes where the band turns.
// Derived from the path's outward normal (its component toward the camera at -Z).
// Used to fade the double-sided bezel in step with the (single-sided) video face.
export function ribbonFacing(phase: number): number {
  const tz = SPIRAL.depth * bellSlope(phase); // dz/dphase
  return SPIRAL.spread / (Math.hypot(SPIRAL.spread, tz) || 1);
}

// How much a tile is rolled (banked) about its outward normal, as a function of
// its distance from center. The roll grows with |phase|, so the focused tile
// (phase 0) has ZERO roll — it faces the camera dead-flat — and tiles to BOTH
// sides roll the same direction (right edge dipping down), leaning away more the
// further out they sit. Using |phase| (not signed phase) is what makes left and
// right lean the same way rather than mirroring into a DNA-style twist.
// SPIRAL.twist is the radians of roll per step.
export function ribbonRoll(phase: number): number {
  return SPIRAL.twist * Math.abs(phase);
}

// Scratch objects reused across calls (ribbonFrame runs per tile per frame).
const _frameMat = new THREE.Matrix4();
const _frameEye = new THREE.Vector3();
const _frameTarget = new THREE.Vector3();
const _frameUp = new THREE.Vector3();
const _frameNormal = new THREE.Vector3();

// Orientation of a tile on the ribbon at a given phase — replaces the old
// billboard (`lookAt(camera)`). The tile's front (+Z) faces radially OUTWARD from
// the helix axis: at phase 0 that's straight toward the gallery camera, so the
// focused video reads square-on; tiles to the sides turn away. The up-vector is
// rolled about that outward normal by `ribbonRoll(phase)` — zero at center,
// growing outward — banking the band into a ribbon twist. Building it via Matrix4.lookAt
// guarantees a proper (non-mirrored, right-side-up) rotation. Writes into `out`.
export function ribbonFrame(phase: number, out: THREE.Quaternion): THREE.Quaternion {
  // Outward normal of the arch path, in the horizontal plane, perpendicular to the
  // tangent (spread, dz/dphase). At the crest → (0, 0, -1), toward the camera; on
  // the slopes it tilts sideways so the videos there turn away, then it returns to
  // facing the camera as the ends flatten.
  const tz = -SPIRAL.depth * bellSlope(phase); // dz/dphase
  _frameNormal.set(tz, 0, -SPIRAL.spread).normalize();
  // Bank: roll world-up about the outward normal, growing with distance from
  // center so the focused tile stays flat (zero roll) and the rest twist away.
  _frameUp.set(0, 1, 0).applyAxisAngle(_frameNormal, ribbonRoll(phase));
  // Build the orientation in the ribbon's LOCAL (unrotated) space, then layer the
  // ribbon's rigid rotation on top — matching spiralPosition's rotate-then-offset.
  // lookAt sets +Z = normalize(eye - target); target = eye - normal ⇒ +Z = normal.
  _frameEye.set(0, 0, 0);
  _frameTarget.copy(_frameEye).sub(_frameNormal);
  _frameMat.lookAt(_frameEye, _frameTarget, _frameUp);
  out.setFromRotationMatrix(_frameMat);
  return out.premultiply(spiralRotation());
}

// The ribbon's local UP (across-band, height) direction at a given phase — the
// banked vertical axis of the frame there. Used to conform each video's geometry
// to the ribbon surface so neighbouring tiles' edges line up. Writes into `out`.
const _ribbonUpQ = new THREE.Quaternion();
export function ribbonUp(phase: number, out: THREE.Vector3): THREE.Vector3 {
  ribbonFrame(phase, _ribbonUpQ);
  return out.set(0, 1, 0).applyQuaternion(_ribbonUpQ);
}

// How far in front of a clicked file the camera sits before the video opens.
// Kept large so the camera only nudges/reframes a little — the tile's own
// expand-toward-camera does the work of "coming forward", and the camera move
// just adds parallax depth.
export const FOCUS_DISTANCE = 5;

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
export const DETAIL_PAN = -1.2;

// Detail pose: the focus pose, panned sideways so the tile reads left-of-centre.
// Panning camera AND target by the same vector is a pure pan (perspective intact).
export function getDetailPoseFromWorld(world: [number, number, number]): PoseSpec {
  const f = getFocusPoseFromWorld(world);
  return {
    position: [f.position[0] + DETAIL_PAN, f.position[1], f.position[2]],
    target: [f.target[0] + DETAIL_PAN, f.target[1], f.target[2]],
  };
}
