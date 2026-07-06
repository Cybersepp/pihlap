  // Camera choreography + 3D layout for the Martin scene.
//
// The Martin is recentered to the world origin and normalized to ~TARGET_SIZE
// units tall (see Martin.tsx). All coordinates below are in those normalized
// units. Tune live with `npm run dev` — `position` is where the camera sits,
// `target` is the point it looks at.
//
// This module is deliberately three.js-free so it can be imported by App's initial
// chunk without pulling three.js in. The vector/quaternion ribbon + text-panel math
// that DOES need three lives in ./ribbon (imported only by the lazy scene).

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
  /**
   * Easing curve for this move. Omitted = camera-controls' critically-damped
   * spring (ease-OUT: quick off the mark, decelerating in) via `smoothTime`.
   * `'inout'` = the rig hand-drives a fixed-duration slow→fast→slow curve
   * (see CameraRig / MODEL.swingDuration) — the cinematic gallery swing.
   */
  ease?: 'inout';
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
export const POSES: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0.0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0.55, 0.2, -7.8], target: GALLERY_CENTER },
};

// Mobile matches desktop's X/Y framing, but sits a touch farther back (Z) so the
// helix isn't clipped on a narrow portrait viewport.
export const POSES_MOBILE: Record<'rest' | 'gallery', PoseSpec> = {
  rest: { position: [0, 0, 7], target: [0, 0.0, 0] },
  gallery: { position: [0.55, 0.2, -8.5], target: GALLERY_CENTER },
};

// Single static camera field of view (degrees) for the whole scene — used by the
// Canvas and by DesktopIcons3D to frame the icon column against the rest frustum.
export const SCENE_FOV = 32;

// How tall (in world units) the Martin's largest dimension is normalized to at a
// reference viewport. Actual rest size is computed by modelRestWorldSize() from
// viewport fractions below — this constant is only the GLB normalization fallback.
export const TARGET_SIZE = 3.0;

// Rest-pose screen share: the model's largest world dimension is capped to fit
// inside these fractions of the visible frustum at z = 0. Height and width are
// both checked so portrait/narrow viewports shrink the figure instead of clipping
// it. Mobile uses a slightly smaller height fraction to leave room for the bottom icon row.
export const MODEL_VIEWPORT_HEIGHT_FRACTION = 0.36;
export const MODEL_VIEWPORT_HEIGHT_FRACTION_MOBILE = 0.33;
export const MODEL_VIEWPORT_WIDTH_FRACTION = 0.34;
export const MODEL_VIEWPORT_WIDTH_FRACTION_MOBILE = 0.42;

// Extra rotation applied to the model, in radians [x, y, z]. Sketchfab exports
// don't always face +Z (toward the resting camera). If the Martin shows its
// back or side at rest, nudge the Y value here. The Y (yaw) mirrors MODEL.restYaw
// (which Martin drives live) — keep the two in sync if you retune the facing.
export const MODEL_ROTATION: [number, number, number] = [0, 4.66, 0.2];

// Live-tunable model choreography (mutable, read fresh each frame by Martin.tsx —
// same tune-live-then-copy workflow as SPIRAL/DETAIL). The figure sits at a fixed
// facing and floats gently in place — a slow vertical bob plus a subtle tilt sway,
// suiting the seated/weightless pose. `swingDuration` is the ease-in-out gallery
// swing length (see CameraRig).
export const MODEL = {
  /** Fixed yaw the figure faces (radians). Mirror of MODEL_ROTATION[1]. */
  restYaw: 4.66,
  /** Seconds for the ease-in-out rest↔gallery camera swing. */
  swingDuration: 1.95,
  /** Idle hover: vertical bob amplitude in world units (0 = no float). */
  hoverAmplitude: 0.025,
  /** Idle hover: bob angular speed (rad/s); ~1.2 ≈ a ~5s breath cycle. */
  hoverSpeed: 1.2,
  /** Idle hover: subtle tilt-sway amplitude (radians) for an organic float. */
  swayAmplitude: 0.018,
  /** Rest-pose vertical lift of the figure, in world units (added on top of the
   *  hover bob). Positive raises Martin higher in frame before anything is opened.
   *  The DOM signature behind him tracks this via restRiseScreenFraction(), so both
   *  move together. Icons stay anchored to their intrinsic feet, so they don't ride
   *  up with him. */
  restRise: 0.46,
  /** Icon row height: fraction of his rest world size ABOVE his feet (0 = at his
   *  feet, higher = up toward his legs/lap, ~level with him). */
  iconRise: 0.08,
  /** Icon row depth: world Z offset (negative = set back behind his legs). */
  iconDepth: 1,
};

// Seconds for the camera to ease between poses (camera-controls smoothTime).
// CAMERA_SMOOTH_TIME is the default (the cinematic swing behind the Martin);
// FOCUS_SMOOTH_TIME is the snappier fly-to-file so the video opens quickly.
export const CAMERA_SMOOTH_TIME = 0.85;
// Slower than a snap so the small reframe runs simultaneously with the tile's
// expand-toward-camera flourish when a video opens.
export const FOCUS_SMOOTH_TIME = 0.6;

// ── Desktop icons (row under the figure) ─────────────────────────────────────
// The icons are NOT positioned with hardcoded coordinates. They sit in ONE centered
// horizontal row directly under Martin — at every viewport — a fixed world gap below
// his measured feet (so the gap stays consistent as the model resizes with the
// viewport). Placement is framed against the rest pose, so the row stays world-
// anchored and parallaxes as the camera swings; a resize repositions it.

// The desktop-icon DOM width in CSS px (see `.desktop-icon` in styles.css).
export const ICON_PX_WIDTH = 108;
// Base scale at full size; auto-shrinks on narrow viewports so a single icon never
// exceeds ICON_ROW_MAX_WIDTH_FRACTION of the visible width (keeps N + gaps on-screen).
export const ICON_BASE_SCALE = 0.3075;
export const ICON_ROW_MAX_WIDTH_FRACTION = 0.2;
// Mobile gets bigger targets + more air between them: each icon's DOM box is much
// wider than its glyph (108px box vs 56px glyph), so scaled small and packed tight,
// a near-miss lands on a neighbour's padding — including the selected icon's, which
// then toggles closed. Larger, better-separated hit boxes fix the mis-taps.
export const ICON_ROW_MAX_WIDTH_FRACTION_MOBILE = 0.26;
// World gap between adjacent icons in the row.
export const ICON_ROW_GAP = 0.12;
export const ICON_ROW_GAP_MOBILE = 0.2;
// The whole row (icons + gaps) is clamped to this fraction of the visible width, so
// larger targets / gaps shrink to fit rather than running off a narrow screen. The
// leftover (~8% split each side) keeps the outermost icons clear of the edges.
export const ICON_ROW_MAX_TOTAL_FRACTION = 0.92;
// Safety margin from the bottom viewport edge — the row clamps to just inside the
// frame rather than clipping off if it's ever placed below the visible bottom.
export const ICON_ROW_BOTTOM_MARGIN = 0.12;
// The standard icon count (folder / contact / readme) — the default row size, and
// what centers positions[0] consistently for the works cloud's fly-out origin.
export const ICON_COUNT = 3;

const HTML_TRANSFORM_DIVISOR = 40;

// Rest-pose frustum half-extents at the icon plane (z = 0) for a given aspect.
function restFrustumHalf(aspect: number): { halfW: number; halfH: number } {
  const restDist = POSES.rest.position[2];
  const halfH = restDist * Math.tan((SCENE_FOV * Math.PI) / 360);
  return { halfW: halfH * aspect, halfH };
}

// A world-Y offset R at the rest plane (z = 0) projects to this fraction of the
// viewport HEIGHT on screen (aspect-independent — vertical FOV is fixed). Lets the
// DOM signature translate by the same screen amount MODEL.restRise lifts the 3D
// figure, so the name behind Martin stays locked to him. Positive = up.
export function restRiseScreenFraction(rise: number): number {
  const { halfH } = restFrustumHalf(1);
  return rise / (2 * halfH);
}

// World size for the Martin's largest dimension at rest, so it occupies a fixed
// share of the viewport. Recomputed on resize/aspect change — same frustum math
// as iconLayout. Narrow viewports are width-limited; wide ones height-limited.
export function modelRestWorldSize(aspect: number, isMobile: boolean): number {
  const { halfW, halfH } = restFrustumHalf(aspect);
  const visibleH = halfH * 2;
  const visibleW = halfW * 2;
  const heightFrac = isMobile
    ? MODEL_VIEWPORT_HEIGHT_FRACTION_MOBILE
    : MODEL_VIEWPORT_HEIGHT_FRACTION;
  const widthFrac = isMobile
    ? MODEL_VIEWPORT_WIDTH_FRACTION_MOBILE
    : MODEL_VIEWPORT_WIDTH_FRACTION;
  return Math.min(visibleH * heightFrac, visibleW * widthFrac);
}

// Martin's resting bottom (feet) as a fraction of his rest world size (feet / size,
// ≈ -0.5). Published once by Martin.tsx after it measures the rotated+scaled model
// (see setModelFeetRatio), so the icon row can sit a fixed gap below his feet AND
// track his size across viewports. A sensible estimate applies until Martin mounts.
let _modelFeetRatio = -0.5;
export function setModelFeetRatio(ratio: number): void {
  _modelFeetRatio = ratio;
}
// World Y of Martin's feet at rest for the given viewport.
export function modelRestFeetY(aspect: number, isMobile: boolean): number {
  return _modelFeetRatio * modelRestWorldSize(aspect, isMobile);
}

export interface IconLayout {
  /** World positions per icon, index-matched to icon order. */
  positions: [number, number, number][];
  scale: number;
}

// Single source of truth for icon placement, framed against the rest pose. Shared
// by DesktopIcons3D (to place the icons) and WorksSpiral3D (so files spill out of
// the real folder icon at positions[0]). One centered row under Martin, a fixed gap
// below his feet, on every device. `count` defaults to the standard three icons.
export function iconLayout(
  aspect: number,
  isMobile: boolean,
  count: number = ICON_COUNT,
): IconLayout {
  const { halfW, halfH } = restFrustumHalf(aspect);
  const maxWidthFraction = isMobile
    ? ICON_ROW_MAX_WIDTH_FRACTION_MOBILE
    : ICON_ROW_MAX_WIDTH_FRACTION;
  const gap = isMobile ? ICON_ROW_GAP_MOBILE : ICON_ROW_GAP;
  const fullWidth = (ICON_PX_WIDTH * ICON_BASE_SCALE) / HTML_TRANSFORM_DIVISOR;
  // Icon size is the smallest of three caps, so it can never overflow:
  //   · full size    — never scale a single icon above its base size
  //   · per-icon      — one icon ≤ maxWidthFraction of the visible width
  //   · whole-row     — all icons + gaps fit within ICON_ROW_MAX_TOTAL_FRACTION
  // The row-fit cap is what keeps the (larger, more-spaced) mobile row on-screen.
  const perIconCap = maxWidthFraction * 2 * halfW;
  const rowFitCap = (2 * halfW * ICON_ROW_MAX_TOTAL_FRACTION - (count - 1) * gap) / count;
  const iconWidth = Math.max(0, Math.min(fullWidth, perIconCap, rowFitCap));
  const scale = ICON_BASE_SCALE * (iconWidth / fullWidth);
  const step = iconWidth + gap;
  // Centered on Martin (x = 0), raised MODEL.iconRise of his height above his feet
  // (so it sits around his legs, ~level with him) and set back MODEL.iconDepth in Z
  // (behind his legs). Clamped so it can't drop off the bottom of the frame.
  const desiredY =
    modelRestFeetY(aspect, isMobile) + MODEL.iconRise * modelRestWorldSize(aspect, isMobile);
  const rowY = Math.max(desiredY, -halfH + ICON_ROW_BOTTOM_MARGIN + iconWidth / 2);
  const positions = Array.from({ length: count }, (_, i) => {
    const x = (i - (count - 1) / 2) * step;
    return [x, rowY, MODEL.iconDepth] as [number, number, number];
  });
  return { positions, scale };
}

// ── 3D works gallery ────────────────────────────────────────────────────────
// The actual Finder window (glass panel, titlebar, grid) floats as ONE panel in
// front of the Martin (the side it faces), facing the gallery camera (faceY) so
// it reads head-on once the camera has swung around. All tunable.
export const GALLERY = {
  /** Center of the window panel — shared with the gallery camera target. */
  center: GALLERY_CENTER,
  /** Y rotation (radians) so the window faces the gallery camera on the far side. */
  faceY: Math.PI,
};

// ── Scene-wash smoke/haze ─────────────────────────────────────────────────────
// A thin, uniform, drifting atmospheric haze that fades in with the gallery swing
// (and stays through detail/video), clearing on return to rest. A handful of large
// camera-facing billboard planes sample an fbm-noise alpha that slowly churns, with
// a soft radial edge falloff so the plane borders never show. Rendered BEHIND the
// works (renderOrder −1) so tiles stay crisp. Faint by design + only a few quads,
// so it's GPU-cheap. Read fresh every frame, so dev-panel edits apply live.
// ── Gallery glow ──────────────────────────────────────────────────────────────
// The gallery reads as a dark void with the centered video as the only light
// source. Faked additive sprites sell that (the tiles + Martin are unlit, so real
// three.js lights do nothing): a HALO bleeding out from behind the centered tile,
// plus two RAYS — diagonal light shafts angling down onto the tile from the upper
// corners. All billboard to the camera and fade with the gallery. Every field is
// read fresh each frame by CenterGlow, so dev edits apply live.
export const GLOW = {
  /** Halo behind the centered tile. */
  haloOpacity: 0.17,
  /** World width/height of the halo sprite (tile is ~1.5×1.28). */
  haloSize: 4.9,
  /** Halo tint [r, g, b] in 0..1 (near-white, faintly cool). */
  haloColor: [0.78, 0.82, 0.92] as [number, number, number],
  /** Peak alpha of each diagonal shaft. */
  rayOpacity: 0.13,
  /** World length of each shaft (tile centre → source up in the corner). */
  rayLength: 7.6,
  /** World width of each shaft at its base (it tapers toward the source). */
  rayWidth: 3.35,
  /** Tilt of each shaft from vertical, in radians (±, mirrored for the two sides). */
  rayAngle: 0.62,
  /** Ray tint [r, g, b] in 0..1 (cool white). */
  rayColor: [0.74, 0.8, 0.92] as [number, number, number],
};

// ── Text windows (contact.txt / readme.txt) ──────────────────────────────────
// The text windows sit FARTHER from the Martin than the video panel so they don't
// crowd the model. They're pushed back ALONG the gallery camera's view ray
// (camera → GALLERY_CENTER) so they stay centred, then slid along the camera's
// screen-right / screen-up axes (a plain world-X shift would read as diagonal
// since the camera views at an angle). This is their OWN mutable object, fully
// decoupled from GALLERY/SPIRAL, so the dev panel can tune position AND size live
// without touching the ribbon/gallery.
export const TEXT_PANEL = {
  /** Distance pushed back from the model along the camera→center ray. */
  pushback: 1.6,
  /** Screen-right slide (world units). Negative = left on screen. */
  shiftRight: -0.05,
  /** Screen-up slide (world units). Positive = up on screen. */
  shiftUp: 0.55,
  /** Window footprint in CSS px. The on-screen size is NOT a fixed world scale —
   *  textPanelLayout() derives the drei Html scale each frame so the panel fills a
   *  target fraction of the viewport (see TEXT_PANEL_LAYOUT), staying the same
   *  proportion of the screen at every aspect. */
  width: 480,
  height: 380,
};

// Target on-screen size of the text window as a fraction of the viewport, solved
// live from the gallery frustum by textPanelLayout(). This is what makes the panel
// screen-relative instead of a fixed world size: the camera sits at a fixed
// distance/FOV, so the frustum's world size depends only on the viewport ASPECT —
// a flat scale therefore reads big on a narrow phone and tiny on a wide/ultrawide
// screen. Targeting a fraction instead keeps the panel a constant proportion of the
// frame at any aspect. Wide (desktop) aspects get a smaller, centred share; narrow
// (phone/portrait) aspects a larger one (readability on a small screen). The two are
// blended SMOOTHLY by aspect between wideAspect and narrowAspect — NOT switched on
// the isMobile flag — so a live resize grows/shrinks continuously with no jump at
// the mobile breakpoint. The panel is sized to the smaller of the two axis
// fractions, so it always fits within both. Mirrors DETAIL_LAYOUT.
export const TEXT_PANEL_LAYOUT = {
  /** Wide/desktop aspects: fraction of viewport WIDTH the panel targets. */
  widthFraction: 0.4,
  /** Wide/desktop aspects: fraction of viewport HEIGHT the panel targets. */
  heightFraction: 0.63,
  /** Narrow/phone aspects: wider WIDTH share — the small screen needs the panel to
   *  dominate. Blended toward as aspect shrinks past wideAspect → narrowAspect. */
  widthFractionNarrow: 0.76,
  /** Narrow/phone aspects: HEIGHT share. */
  heightFractionNarrow: 0.72,
  /** Aspect (w/h) at/above which the WIDE fractions fully apply. */
  wideAspect: 1.5,
  /** Aspect (w/h) at/below which the NARROW fractions fully apply. Between the two,
   *  a smoothstep blend — the seam that used to jump at the 768px isMobile flip. */
  narrowAspect: 0.6,
};

// The world position of the text window (textPanelCenter) is derived live from
// TEXT_PANEL in ./ribbon — it needs three, so it lives with the other vector math.

// Tiny pub/sub so the dev panel's TEXT_PANEL edits trigger a re-render of the
// window components. Position is read per-frame (live by default), but the DOM
// size + Html scale are React props, so they need a re-render to apply live.
const _textPanelListeners = new Set<() => void>();
export function onTextPanelChange(cb: () => void): () => void {
  _textPanelListeners.add(cb);
  return () => {
    _textPanelListeners.delete(cb);
  };
}
export function notifyTextPanelChange(): void {
  _textPanelListeners.forEach((cb) => cb());
}

// Same pub/sub for the icon row: DesktopIcons3D computes iconLayout at render time
// (not per frame), so a dev-panel edit to MODEL.iconRise / MODEL.iconDepth needs a
// re-render to apply live. No-op in production (nothing notifies).
const _iconLayoutListeners = new Set<() => void>();
export function onIconLayoutChange(cb: () => void): () => void {
  _iconLayoutListeners.add(cb);
  return () => {
    _iconLayoutListeners.delete(cb);
  };
}
export function notifyIconLayoutChange(): void {
  _iconLayoutListeners.forEach((cb) => cb());
}

// Same pub/sub for MODEL.restRise: Martin reads it per frame (live on its own), but
// the DOM signature's screen offset is a React-computed style in App, so a dev-panel
// edit needs an App re-render to move the name with him. No-op in production.
const _modelRestListeners = new Set<() => void>();
export function onModelRestChange(cb: () => void): () => void {
  _modelRestListeners.add(cb);
  return () => {
    _modelRestListeners.delete(cb);
  };
}
export function notifyModelRestChange(): void {
  _modelRestListeners.forEach((cb) => cb());
}

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
  center: [0.1, 2.6, 3] as [number, number, number],
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
  /** Along-ribbon cutoff: the ribbon is visible only within |position| ≤ `cutoff`
   *  (in steps from center), wiping into full transparency past it on BOTH sides
   *  with a narrow `cutoffFade` feather. A tile straddling the line is clipped
   *  mid-surface (edge-first), not faded as a whole. Keep cutoff < fadeEnd so the
   *  ribbon clears before the off-screen wrap. */
  cutoff: 3.1,
  cutoffFade: 0.44,
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
  thickness: 0.08,
  /** Brightness of the bezel edge, 0 (black) → 1 (white). ~0.23 is a dark grey. */
  bezel: 0.05,
};

// The integer slot congruent to `i (mod n)` nearest the scroll position `s`.
// Wrapping by n keeps |phase| ≤ n/2, so the recycle happens far behind Martin.
export function nearestCongruentSlot(i: number, s: number, n: number): number {
  return i + n * Math.round((s - i) / n);
}

// The bell curve that shapes the ribbon's depth: 1 at center, easing to 0 at the
// edges. `bell` is the value; `bellSlope` is its derivative d/dphase, which the
// path's tangent (and thus each tile's facing normal) is built from. Exported so
// ./ribbon (which owns the three-backed tile placement) can share them.
export function bell(phase: number): number {
  return Math.exp(-((phase / SPIRAL.archWidth) ** 2));
}
export function bellSlope(phase: number): number {
  return bell(phase) * (-2 * phase) / (SPIRAL.archWidth * SPIRAL.archWidth);
}

// spiralRotation / spiralPosition (the tile's world placement) need three, so they
// live in ./ribbon alongside ribbonFrame / ribbonUp.

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

// ribbonFrame (tile orientation) and ribbonUp (banked vertical axis) build on
// three's Matrix4/Quaternion, so they live in ./ribbon with spiralPosition.

// ── Detail / open-video view ─────────────────────────────────────────────────
// Everything about where the clicked video lands and how it expands. One mutable
// object (like SPIRAL) so the dev panel can tune it live: getFocus/DetailPose read
// it fresh on every re-issue, and WorksSpiral3D reads the tile-flourish fields
// (tileYaw/grow/forward) every frame. Tune live, then `copy` to paste back here.
export const DETAIL = {
  /** Manual NUDGE (world units) added to the responsive camera distance derived by
   *  detailLayout() from the viewport. 0 = pure auto-fit; positive backs the camera
   *  off, negative moves it in. The base distance now adapts to the screen. */
  distance: 0,
  /** Manual NUDGE along the camera's screen-right axis, added on top of the
   *  responsive seating from detailLayout(). Negative = left. Leave 0 to trust the
   *  auto layout; use it to fine-tune the framing. */
  pan: 0.75,
  /** Manual NUDGE along the camera's screen-up axis, added on top of the responsive
   *  seating. Positive = up. Leave 0 to trust the auto layout. */
  panY: 0.2,
  /** Radians the opening tile yaws to the right as it expands. Shared with the
   *  tile flourish AND the camera reframe (via yawFollow). Flip to turn the other
   *  way. */
  tileYaw: 0.34,
  /** Radians the opening tile pitches as it expands — tips its top toward(+)/away(−)
   *  from the viewer (rotation about the screen-horizontal axis). */
  tilePitch: 0.16,
  /** Radians the opening tile rolls as it expands — spins in the screen plane,
   *  clockwise(+)/counter-clockwise(−). */
  tileRoll: -0.06,
  /** How much of the YAW the camera follows: 0 = ignore the turn, 1 = swing fully
   *  around so the turned tile reads head-on. (Pitch/roll are tile-only.) */
  yawFollow: 0.8,
  /** Extra scale the opening tile grows by (× its base size). */
  grow: 0.45,
  /** World units the opening tile drifts toward the camera. */
  forward: 0.4,
  /** Screen-space nudge of the OPENING TILE ITSELF (not the camera), eased in with
   *  the open animation. offsetX = right(+)/left(−), offsetY = up(+)/down(−), in
   *  world units along the camera's right/up axes. Use these to reposition the
   *  open video; use pan/panY to move the camera framing instead. */
  offsetX: -0.3,
  offsetY: 0.55,
  /** Widthwise curvature of the OPEN tile only, eased in as it opens: 0 = flat
   *  panel, 1 = the ribbon's natural arch, >1 = exaggerated bow. Other tiles keep
   *  their natural curvature. */
  bow: 0,
};

// ── Responsive detail-view layout ─────────────────────────────────────────────
// The open-video composition adapts to the LIVE viewport instead of per-device
// constants (mirrors the frustum-derived icon column). Wide screens seat the tile
// left with the info panel on the right; tall/portrait screens stack the tile up
// with the panel docked along the bottom. The camera distance is solved from the
// FOV so the tile fills a sensible fraction of its region at any aspect — so it
// scales to phones we can't test, not just a few hardcoded breakpoints. The
// fractions below are the only tunables; everything else is derived. Keep
// `portraitAspect` in sync with the .detail-panel CSS `max-aspect-ratio` breakpoint.
export const DETAIL_LAYOUT = {
  /** aspect (w/h) at or below which the panel docks at the bottom (stacked layout). */
  portraitAspect: 0.95,
  /** Landscape: fraction of viewport WIDTH reserved for the tile (rest = panel). */
  landscapeTileWidth: 0.6,
  /** Landscape: fraction of its region the tile fills (smaller ⇒ camera further back
   *  ⇒ the clicked tile reads SMALLER on screen). This is the main lever for the
   *  open-tile size. */
  landscapeFill: 0.5,
  /** Portrait: fraction of viewport HEIGHT reserved for the tile (rest = panel). */
  portraitTileHeight: 0.4,
  /** Portrait: fraction of its region the tile fills (smaller ⇒ smaller open tile). */
  portraitFill: 0.6,
  /** Clamp so an extreme viewport never parks the camera absurdly near/far. Kept
   *  generous on the far end: a narrow portrait phone with a small *Fill needs the
   *  camera well back to actually shrink the tile to target — too low a cap leaves
   *  the tile stuck oversized and spilling off a phone. */
  minDistance: 3,
  maxDistance: 25,
};

const _TAN_HALF_FOV = Math.tan((SCENE_FOV * Math.PI) / 360);
function clampNum(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export interface DetailLayout {
  /** Auto-fit camera distance in front of the tile (before DETAIL.distance nudge). */
  distance: number;
  /** Camera pan along its screen-right axis (world units) to seat the tile. */
  panRight: number;
  /** Camera pan along its screen-up axis (world units) to seat the tile. */
  panUp: number;
  /** Info panel docks at the bottom (portrait) rather than to the side. */
  panelBottom: boolean;
}

// Solve the detail framing for the current viewport. Pure function of width/height
// (and the live DETAIL.grow / DETAIL_LAYOUT tunables), so it re-derives on resize
// and orientation change.
export function detailLayout(width: number, height: number): DetailLayout {
  const aspect = width / height || 1;
  const L = DETAIL_LAYOUT;
  const grow = 1 + DETAIL.grow;
  const tileW = SPIRAL.tile[0] * grow;
  const tileH = SPIRAL.tile[1] * grow;
  const portrait = aspect <= L.portraitAspect;

  if (!portrait) {
    const region = L.landscapeTileWidth;
    // Distance that fits the tile in its left region by WIDTH and by full HEIGHT;
    // take the larger so it fits both.
    const dW = tileW / (L.landscapeFill * region * 2 * _TAN_HALF_FOV * aspect);
    const dH = tileH / (L.landscapeFill * 2 * _TAN_HALF_FOV);
    const distance = clampNum(Math.max(dW, dH), L.minDistance, L.maxDistance);
    const halfW = distance * _TAN_HALF_FOV * aspect;
    // Centre of the left region as a screen-x fraction from centre (negative = left).
    const seat = region / 2 - 0.5;
    // Pan the camera the opposite way so the tile appears at that seat.
    return { distance, panRight: -seat * halfW, panUp: 0, panelBottom: false };
  }

  const region = L.portraitTileHeight;
  const dH = tileH / (L.portraitFill * region * 2 * _TAN_HALF_FOV);
  const dW = tileW / (L.portraitFill * 2 * _TAN_HALF_FOV * aspect);
  const distance = clampNum(Math.max(dH, dW), L.minDistance, L.maxDistance);
  const halfH = distance * _TAN_HALF_FOV;
  // Centre of the top region as a screen-y fraction from centre (positive = up).
  const seat = 0.5 - region / 2;
  return { distance, panRight: 0, panUp: -seat * halfH, panelBottom: true };
}

// The last tile world position + viewport the detail pose was framed from.
// Remembered so the dev panel can re-issue the detail pose live when a DETAIL
// slider moves (the pose is otherwise only computed at click-time).
let _lastDetailWorld: [number, number, number] | null = null;
let _lastDetailViewport: [number, number] = [1, 1];
export function getLastDetailWorld(): [number, number, number] | null {
  return _lastDetailWorld;
}
export function getLastDetailViewport(): [number, number] {
  return _lastDetailViewport;
}

// Convert a point on the window panel (its measured world position) into a camera
// pose that frames it head-on, sitting the auto-fit distance (+ DETAIL.distance
// nudge) in front along the panel's facing normal. Used to fly to the clicked file.
export function getFocusPoseFromWorld(
  world: [number, number, number],
  width: number,
  height: number,
): PoseSpec {
  // Swing the camera partway around the tile in the same direction it yaws, so the
  // reframe respects the turn rather than fighting it (a = faceY + followed yaw).
  const a = GALLERY.faceY + DETAIL.tileYaw * DETAIL.yawFollow;
  const d = detailLayout(width, height).distance + DETAIL.distance;
  const nx = Math.sin(a);
  const nz = Math.cos(a);
  return {
    position: [world[0] + nx * d, world[1], world[2] + nz * d],
    target: [world[0], world[1], world[2]],
  };
}

// Detail pose: the focus pose, panned along the camera's screen axes so the tile
// seats into the region the responsive layout reserves for it (left on wide
// screens, up on tall/portrait ones), plus any manual DETAIL.pan/panY nudge.
// Panning camera AND target by the same vector is a pure pan (perspective intact).
// The camera looks horizontally, so screen-right = (cos a, 0, -sin a) and
// screen-up = world up — no roll to account for.
export function getDetailPoseFromWorld(
  world: [number, number, number],
  width: number,
  height: number,
): PoseSpec {
  _lastDetailWorld = world;
  _lastDetailViewport = [width, height];
  const a = GALLERY.faceY + DETAIL.tileYaw * DETAIL.yawFollow;
  const layout = detailLayout(width, height);
  const f = getFocusPoseFromWorld(world, width, height);
  // The manual pan/panY nudges were tuned for the LANDSCAPE composition; as flat
  // world-unit shifts they blow the tile off a narrow portrait phone. In portrait
  // (panelBottom) trust the centered auto-fit — panRight is 0 there, so the tile
  // stays centred and within bounds — and skip the landscape nudge.
  const right = layout.panRight + (layout.panelBottom ? 0 : DETAIL.pan);
  const up = layout.panUp + (layout.panelBottom ? 0 : DETAIL.panY);
  const rx = Math.cos(a) * right;
  const rz = -Math.sin(a) * right;
  return {
    position: [f.position[0] + rx, f.position[1] + up, f.position[2] + rz],
    target: [f.target[0] + rx, f.target[1] + up, f.target[2] + rz],
  };
}

// The responsive 3D text panel layout (textPanelLayout) needs three (camera-
// distance math + MathUtils blending), so it lives in ./ribbon.
