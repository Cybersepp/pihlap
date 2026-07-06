// three.js-backed ribbon + text-panel geometry for the works spiral.
//
// These functions live apart from poses.ts (which is deliberately three-free) so
// that App's initial chunk never pulls in three.js: only the lazy-loaded scene
// imports this module. poses.ts holds the tunable constants + pure-math layout;
// this holds the vector/quaternion math that actually places tiles on the helix.
import * as THREE from 'three';
import {
  SPIRAL,
  GALLERY_CENTER,
  POSES,
  POSES_MOBILE,
  SCENE_FOV,
  TEXT_PANEL,
  TEXT_PANEL_LAYOUT,
  bell,
  bellSlope,
  ribbonRoll,
} from './poses';

const _TAN_HALF_FOV = Math.tan((SCENE_FOV * Math.PI) / 360);

// The ribbon's rigid rotation (SPIRAL.rotation) as a quaternion. Rebuilt from the
// live Euler only when the rotation values actually change (dev-panel edits) —
// otherwise the cached quaternion is returned. This is called ~100k times/sec
// during conform, so the Euler→quaternion trig is memoized against the last
// rotation. Scratch-backed.
const _spiralRotE = new THREE.Euler();
const _spiralRotQ = new THREE.Quaternion();
let _spiralRotCacheX = NaN;
let _spiralRotCacheY = NaN;
let _spiralRotCacheZ = NaN;
function spiralRotation(): THREE.Quaternion {
  const [rx, ry, rz] = SPIRAL.rotation;
  if (rx !== _spiralRotCacheX || ry !== _spiralRotCacheY || rz !== _spiralRotCacheZ) {
    _spiralRotE.set(rx, ry, rz);
    _spiralRotQ.setFromEuler(_spiralRotE);
    _spiralRotCacheX = rx;
    _spiralRotCacheY = ry;
    _spiralRotCacheZ = rz;
  }
  return _spiralRotQ;
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

// World position of the text window, derived LIVE from TEXT_PANEL so dev-panel
// edits move it instantly. Writes into `out`.
const _tpDir = new THREE.Vector3();
const _tpRight = new THREE.Vector3();
export function textPanelCenter(out: THREE.Vector3): THREE.Vector3 {
  const cam = POSES.gallery.position;
  const [cx, cy, cz] = GALLERY_CENTER;
  _tpDir.set(cx - cam[0], cy - cam[1], cz - cam[2]);
  const len = _tpDir.length() || 1;
  out.copy(_tpDir).multiplyScalar(TEXT_PANEL.pushback / len);
  out.x += cx;
  out.y += cy + TEXT_PANEL.shiftUp;
  out.z += cz;
  // Screen-right = forward × worldUp (horizontal), forward = camera → center.
  _tpRight.set(-_tpDir.z, 0, _tpDir.x);
  const rlen = _tpRight.length() || 1;
  return out.addScaledVector(_tpRight, TEXT_PANEL.shiftRight / rlen);
}

// Responsive 3D text panel (contact.txt / readme.txt). The text window is an
// <Html transform> sheet: its on-screen world width is width × scale / 40, then
// projected by the gallery camera. The scale is solved so the panel fills a TARGET
// FRACTION of the viewport (TEXT_PANEL_LAYOUT) rather than a fixed world size — so
// it stays the same proportion of the screen at every aspect (a phone, a laptop,
// an ultrawide) and never shrinks to a stamp on a wide frustum. Sized to the
// smaller of the width/height fractions so it always fits both axes. Derived from
// the actual gallery camera distance, so it adapts continuously.
const _tpCenter = new THREE.Vector3();
export interface TextPanelLayout {
  width: number;
  height: number;
  scale: number;
}
export function textPanelLayout(width: number, height: number, isMobile: boolean): TextPanelLayout {
  const aspect = width / height || 1;
  const cam = (isMobile ? POSES_MOBILE : POSES).gallery.position;
  const pc = textPanelCenter(_tpCenter);
  const dist = Math.hypot(cam[0] - pc.x, cam[1] - pc.y, cam[2] - pc.z) || 1;
  const halfH = dist * _TAN_HALF_FOV;
  const halfW = halfH * aspect;
  const L = TEXT_PANEL_LAYOUT;
  // Blend the target fractions by aspect (0 = fully narrow/phone, 1 = fully wide/
  // desktop), so the panel size changes continuously across a resize rather than
  // stepping at the isMobile breakpoint. smoothstep clamps outside the two edges.
  const wideness = THREE.MathUtils.smoothstep(aspect, L.narrowAspect, L.wideAspect);
  const widthFrac = THREE.MathUtils.lerp(L.widthFractionNarrow, L.widthFraction, wideness);
  const heightFrac = THREE.MathUtils.lerp(L.heightFractionNarrow, L.heightFraction, wideness);
  const scaleForW = (widthFrac * 2 * halfW * 40) / TEXT_PANEL.width;
  const scaleForH = (heightFrac * 2 * halfH * 40) / TEXT_PANEL.height;
  // Smaller axis wins so the panel fits within BOTH the width and height targets.
  const scale = Math.min(scaleForW, scaleForH);
  return { width: TEXT_PANEL.width, height: TEXT_PANEL.height, scale };
}
