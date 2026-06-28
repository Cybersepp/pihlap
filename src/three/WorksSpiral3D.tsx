import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Work } from '../data/works';
import { IconClickOrigin } from '../components/DesktopIcon';
import { WorkTitle } from '../components/WorkTitle';
import {
  SPIRAL,
  FOCUS_TILE_YAW,
  nearestCongruentSlot,
  spiralPosition,
  ribbonFrame,
  ribbonFacing,
  ribbonUp,
  ICON_ROWS_Y,
  iconColumnLayout,
} from './poses';
import { makeTileMaterial } from './spiralShader';

export interface WorksSpiral3DProps {
  works: Work[];
  selectedWorkId?: string;
  /** true = files spill out of the folder onto the spiral; false = fly back in. */
  open: boolean;
  /** true while a video is open — input is ignored and tiles drop out of focus. */
  paused: boolean;
  /** true in the detail state — the focused tile shows a 3D play button. */
  showPlay: boolean;
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
  onPlay: () => void;
}

// Tunable input feel.
const WHEEL_SENSITIVITY = 0.0016; // scroll px → slots
const TOUCH_SENSITIVITY = 0.01; // drag px → slots (mouse + touch)
const CLICK_THRESHOLD = 6; // drag less than this many px counts as a click, not a wind
const SNAP_IDLE_MS = 180; // input quiet for this long → snap to nearest work
const SNAP_DAMP = 10; // how briskly sTarget eases onto the nearest integer
const SCROLL_DAMP = 7; // how briskly s follows sTarget
const STAGGER = 0.05; // seconds between each tile's spill, cascading top→bottom
const SPILL_SETTLE_MS = 700; // extra settle after the last tile before the center lights up
// Open flourish: the clicked tile expands toward the camera as the video opens.
const OPEN_GROW = 0.8; // extra scale the opening tile grows by (× its base size)
const OPEN_FORWARD = 0.4; // world units the opening tile drifts toward the camera
const OPEN_RATE_Y = 4; // vertical growth speed — leads horizontal for an elastic feel
const OPEN_RATE_X = 3.5; // horizontal growth speed — slower than vertical
const BG_DIM = 0.18; // brightness the non-selected tiles sink to when a work is open
// Continuous emphasis on whichever tile is centered (separate from the open flourish).
const POP_SCALE = 0.16; // how much bigger the centered tile is than the rest
const POP_FORWARD = 0.35; // world units the centered tile sits toward the camera
const POP_RANGE = 1; // slots from center over which the pop falls off to nothing

// World up — axis the opening tile yaws about so the turn stays vertical.
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Each work has its own 3s loop (loops/<id>.mp4) and a frozen poster frame
// (loops/<id>.jpg). Every tile samples its own poster at rest; only the centered,
// settled tile swaps the single shared <video> to its loop and plays it live — so
// it's still one video decode regardless of tile count. Works without a real loop
// fall back to the Kai Angel placeholder (their poster is already the Kai frame).
const PLACEHOLDER_LOOP = `${import.meta.env.BASE_URL}loops/kai-angel-prada-party.mp4`;
const posterUrl = (work: Work) => `${import.meta.env.BASE_URL}loops/${work.id}.jpg`;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// ── Conforming tiles ─────────────────────────────────────────────────────────
// Each video is warped onto the ribbon SURFACE rather than drawn as a rigid plane,
// so neighbouring tiles' edges line up along the band (with a gap). Per frame, the
// tile's vertices are sampled from the surface around its phase and expressed in
// the tile's own local frame, so the group transform (spill / pop / open / scale)
// still animates it. This distorts the footage where the ribbon curves — accepted.
const CONFORM_W = 16; // width subdivisions (along the ribbon path)
const BEZEL_QUADS = 3 * CONFORM_W + 2; // back + top wall + bottom wall + 2 sides
const BEZEL_VERTS = BEZEL_QUADS * 6; // 2 triangles per quad

// Scratch reused across all tiles (conform runs synchronously, one tile at a time).
const _hu = new THREE.Vector3();
const _world = new THREE.Vector3();
const _pc = new THREE.Vector3();
const _qcInv = new THREE.Quaternion();
const _topF: THREE.Vector3[] = [];
const _botF: THREE.Vector3[] = [];
const _topB: THREE.Vector3[] = [];
const _botB: THREE.Vector3[] = [];
for (let k = 0; k <= CONFORM_W; k++) {
  _topF.push(new THREE.Vector3());
  _botF.push(new THREE.Vector3());
  _topB.push(new THREE.Vector3());
  _botB.push(new THREE.Vector3());
}

interface ConformGeoms {
  frontGeo: THREE.PlaneGeometry;
  bezelGeo: THREE.BufferGeometry;
  sx: Float32Array;
  sy: Float32Array;
  bezelArr: Float32Array;
  bezelPos: THREE.BufferAttribute;
}

// Build the per-tile front (video) + bezel (thickness shell) geometries and capture
// each front vertex's canonical (sx, sy) in [-0.5, 0.5] so conformTile can re-place
// them every frame.
function makeConformGeoms(): ConformGeoms {
  const frontGeo = new THREE.PlaneGeometry(1, 1, CONFORM_W, 1);
  const fp = frontGeo.attributes.position as THREE.BufferAttribute;
  fp.setUsage(THREE.DynamicDrawUsage);
  const sx = new Float32Array(fp.count);
  const sy = new Float32Array(fp.count);
  for (let idx = 0; idx < fp.count; idx++) {
    sx[idx] = fp.getX(idx);
    sy[idx] = fp.getY(idx);
  }
  const bezelGeo = new THREE.BufferGeometry();
  const bezelArr = new Float32Array(BEZEL_VERTS * 3);
  const bezelPos = new THREE.BufferAttribute(bezelArr, 3);
  bezelPos.setUsage(THREE.DynamicDrawUsage);
  bezelGeo.setAttribute('position', bezelPos);
  return { frontGeo, bezelGeo, sx, sy, bezelArr, bezelPos };
}

// Re-place a tile's front + bezel vertices onto the ribbon surface for the given
// phase. `sp` is the tile's spine point and `qc` its (pure, un-yawed) frame — the
// same pair the group transform uses — so the baked local geometry lands correctly.
function conformTile(
  phase: number,
  sp: [number, number, number],
  qc: THREE.Quaternion,
  geoms: ConformGeoms,
) {
  const span = SPIRAL.fill; // phase-width of one tile (leaves a gap < 1 step)
  const tileH = SPIRAL.tile[1];
  const t = SPIRAL.thickness;
  _qcInv.copy(qc).invert();
  _pc.set(sp[0], sp[1], sp[2]);
  // Place a canonical (sx, sy) onto the ribbon surface, in the tile's local frame.
  // The width runs along -path (`phase - vx`): the frame maps world +X to local
  // -X, so sampling this way keeps the front face toward the camera (visible +
  // clickable) and the footage un-mirrored.
  const place = (vx: number, vy: number, out: THREE.Vector3) => {
    const u = phase - vx * span;
    const su = spiralPosition(u);
    ribbonUp(u, _hu);
    out.set(su[0] + vy * tileH * _hu.x, su[1] + vy * tileH * _hu.y, su[2] + vy * tileH * _hu.z);
    return out.sub(_pc).applyQuaternion(_qcInv);
  };
  // Front video face.
  const fpos = geoms.frontGeo.attributes.position;
  for (let idx = 0; idx < fpos.count; idx++) {
    place(geoms.sx[idx], geoms.sy[idx], _world);
    fpos.setXYZ(idx, _world.x, _world.y, _world.z);
  }
  fpos.needsUpdate = true;
  geoms.frontGeo.computeBoundingSphere();
  // Bezel shell: sample the perimeter, push it back by the thickness along local
  // -Z, then stitch the back face + four walls (double-sided, so winding is free).
  const W = CONFORM_W;
  for (let k = 0; k <= W; k++) {
    const vx = k / W - 0.5;
    place(vx, 0.5, _topF[k]);
    place(vx, -0.5, _botF[k]);
    _topB[k].copy(_topF[k]);
    _topB[k].z -= t;
    _botB[k].copy(_botF[k]);
    _botB[k].z -= t;
  }
  const arr = geoms.bezelArr;
  let o = 0;
  const push = (v: THREE.Vector3) => {
    arr[o++] = v.x;
    arr[o++] = v.y;
    arr[o++] = v.z;
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, e: THREE.Vector3) => {
    push(a); push(b); push(c);
    push(a); push(c); push(e);
  };
  for (let k = 0; k < W; k++) {
    quad(_topB[k], _topB[k + 1], _botB[k + 1], _botB[k]); // back face
    quad(_topF[k], _topB[k], _topB[k + 1], _topF[k + 1]); // top wall
    quad(_botF[k], _botF[k + 1], _botB[k + 1], _botB[k]); // bottom wall
  }
  quad(_topF[0], _botF[0], _botB[0], _topB[0]); // left wall
  quad(_topF[W], _topB[W], _botB[W], _botF[W]); // right wall
  geoms.bezelPos.needsUpdate = true;
  geoms.bezelGeo.computeBoundingSphere();
}

// Fallback bezel colour for the material's initial value; the live grey level is
// driven per-frame from SPIRAL.bezel (dimmed by the spotlight).
const BEZEL_COLOR = 0x3a3a3a;

// One tile on the helix. Starts tiny at the folder icon and, after its stagger,
// eases out to its spiral slot (reusing the WorksReveal3D spill). Billboards to the
// camera; its `uFocus` rises as it nears front-and-center, driving the shader's
// B&W→color + pixel-dissolve. The focused tile alone shows its (scrambling) title.
function SpiralItem({
  work,
  i,
  n,
  from,
  open,
  paused,
  focused,
  delay,
  reveal,
  showPlay,
  onPlay,
  videoTexture,
  posterTexture,
  liveWorkId,
  sRef,
  tilesRef,
}: {
  work: Work;
  i: number;
  n: number;
  from: [number, number, number];
  open: boolean;
  paused: boolean;
  focused: boolean;
  /** Detail state — render the play button on this tile. */
  showPlay: boolean;
  onPlay: () => void;
  /** Spill stagger (seconds), assigned top→bottom by the parent. */
  delay: number;
  /** The spill has settled — tiles may now reveal into color at center. */
  reveal: boolean;
  /** Shared live loop — only the centered, settled tile samples this. */
  videoTexture: THREE.Texture;
  /** This work's own frozen poster frame — what the tile shows at rest. */
  posterTexture: THREE.Texture;
  /** The work whose loop is currently loaded & playing in the shared video,
   *  or undefined while none is ready. A tile only goes live when it matches. */
  liveWorkId: string | undefined;
  sRef: React.MutableRefObject<number>;
  /** Shared registry so the parent can raycast a click to this tile. */
  tilesRef: React.MutableRefObject<(THREE.Mesh | null)[]>;
}) {
  const group = useRef<THREE.Group>(null);
  // Textures are shared/owned by the parent (uTex is swapped per-frame below), so
  // only dispose the material here.
  const material = useMemo(() => makeTileMaterial(posterTexture), [videoTexture]);
  useEffect(() => () => material.dispose(), [material]);
  // Per-tile bezel material (geometry is shared) so its opacity/brightness can
  // follow this tile's own fade + spotlight. Double-sided so it shows from any
  // angle as the tile turns; depthWrite off to match the transparent video plane.
  const bezelMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: BEZEL_COLOR,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => bezelMaterial.dispose(), [bezelMaterial]);
  // Per-tile conforming geometries (front video + bezel shell), re-placed onto the
  // ribbon surface each frame so this tile's edges line up with its neighbours.
  const geoms = useMemo(() => makeConformGeoms(), []);
  useEffect(
    () => () => {
      geoms.frontGeo.dispose();
      geoms.bezelGeo.dispose();
    },
    [geoms],
  );
  // The tile's pure (un-yawed) ribbon frame, reused for conforming the geometry.
  const qc = useRef(new THREE.Quaternion());

  const prog = useRef(0); // 0 = in the folder, 1 = out on the slot
  const clock = useRef(0); // time since the current open/close flip (for stagger)
  const prevOpen = useRef(open);
  const growX = useRef(0); // horizontal open-expansion 0→1
  const growY = useRef(0); // vertical open-expansion 0→1 (leads X)

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);

    if (open !== prevOpen.current) {
      prevOpen.current = open;
      clock.current = 0;
    }
    clock.current += d;
    const past = clock.current > delay;
    const target = open ? (past ? 1 : 0) : past ? 0 : 1;
    prog.current = THREE.MathUtils.damp(prog.current, target, 6, d);
    const p = prog.current;

    // Open flourish: the clicked (centered) tile expands toward the camera as the
    // video opens. Y leads X, so it stretches tall then settles — an elastic feel.
    const opening = focused && paused;
    growY.current = THREE.MathUtils.damp(growY.current, opening ? 1 : 0, OPEN_RATE_Y, d);
    growX.current = THREE.MathUtils.damp(growX.current, opening ? 1 : 0, OPEN_RATE_X, d);

    const phase = nearestCongruentSlot(i, sRef.current, n) - sRef.current;
    const aphase = Math.abs(phase);
    // How centered this tile is (1 at dead-centre → 0 by POP_RANGE slots away).
    const centered = 1 - smoothstep(0, POP_RANGE, aphase);

    const sp = spiralPosition(phase);
    let px = from[0] + (sp[0] - from[0]) * p;
    let py = from[1] + (sp[1] - from[1]) * p;
    let pz = from[2] + (sp[2] - from[2]) * p;

    // Drift toward the camera: the centered tile pops forward a little; the opening
    // tile (detail/video) pushes much further still.
    const grow = (growX.current + growY.current) * 0.5;
    const forward = centered * POP_FORWARD + grow * OPEN_FORWARD;
    if (forward > 0.0001) {
      const cam = state.camera.position;
      const dx = cam.x - px;
      const dy = cam.y - py;
      const dz = cam.z - pz;
      const f = forward / (Math.hypot(dx, dy, dz) || 1);
      px += dx * f;
      py += dy * f;
      pz += dz * f;
    }
    g.position.set(px, py, pz);
    // Orient to the ribbon (faces outward, banked along the climb) instead of
    // billboarding. At the crest the outward normal points at the gallery camera,
    // so the focused tile still reads square-on. Keep the pure frame in `qc` for
    // conforming, then copy it onto the group before the open-yaw is layered on.
    ribbonFrame(phase, qc.current);
    g.quaternion.copy(qc.current);
    // Warp the tile's geometry onto the ribbon surface around its phase so its
    // edges line up with its neighbours (baked relative to the same spine+frame
    // the group transform uses, so spill/pop/open still animate it).
    conformTile(phase, sp, qc.current, geoms);
    // Yaw a touch to the right as it opens; the focus camera follows this same
    // turn (FOCUS_YAW_FOLLOW in poses.ts) so the reframe respects it.
    if (grow > 0.0001) g.rotateOnWorldAxis(WORLD_UP, FOCUS_TILE_YAW * grow);

    // Base spill scale, plus the continuous centered pop, plus the open flourish.
    const base = (0.0001 + p) * (1 + centered * POP_SCALE);
    g.scale.set(base * (1 + growX.current * OPEN_GROW), base * (1 + growY.current * OPEN_GROW), base);
    // The opening tile holds full color (it's becoming the video). Otherwise stay
    // B&W until the cascade has settled (`reveal`), then ease into color as it
    // nears center. Damped so it eases rather than popping.
    const focusTarget = opening ? 1 : paused || !reveal ? 0 : 1 - smoothstep(0, SPIRAL.focusRange, aphase);
    material.uniforms.uFocus.value = THREE.MathUtils.damp(
      material.uniforms.uFocus.value,
      focusTarget,
      6,
      d,
    );
    material.uniforms.uOpacity.value = smoothstep(SPIRAL.fadeEnd, SPIRAL.fadeStart, aphase) * p;
    // Spotlight: when a work is open, the other tiles sink toward black; the
    // opening tile stays at full brightness.
    const dimTarget = paused && !opening ? BG_DIM : 1;
    material.uniforms.uDim.value = THREE.MathUtils.damp(material.uniforms.uDim.value, dimTarget, 5, d);

    // The bezel shell follows the tile's fade and spotlight dimming, PLUS an extra
    // fade as the tile turns away from the camera. The video face is single-sided
    // (it culls when it turns away), but the bezel is double-sided — so without
    // this the solid edges of the side/back tiles would stay fully visible. Fading
    // by `ribbonFacing` makes the bezel disappear toward the edges with the video.
    const bezelFade = smoothstep(0, 0.4, ribbonFacing(phase));
    bezelMaterial.opacity = material.uniforms.uOpacity.value * bezelFade;
    bezelMaterial.color.setScalar(SPIRAL.bezel * material.uniforms.uDim.value);

    // A tile goes live only when it's the centered, settled work AND the shared
    // video has actually loaded that work's loop (liveWorkId). Until then — and on
    // every other tile — it shows its own frozen poster frame.
    const isLive = focused && reveal && work.id === liveWorkId;
    material.uniforms.uTex.value = isLive ? videoTexture : posterTexture;
  });

  return (
    <group ref={group} scale={0.0001}>
      {/* Bezel shell behind the video plane so it reads as the tile's solid edge.
          renderOrder pins the draw order (both are transparent + depthWrite off,
          so distance-sorting alone could otherwise flip the bezel over the video). */}
      <mesh geometry={geoms.bezelGeo} material={bezelMaterial} renderOrder={0} />
      <mesh
        geometry={geoms.frontGeo}
        material={material}
        renderOrder={1}
        ref={(m) => {
          tilesRef.current[i] = m;
          if (m) m.userData.workIndex = i;
        }}
      />
      {focused && showPlay && (
        // Play affordance pinned to the tile surface — as an Html transform it
        // inherits the group's ribbon orientation/curve, so it tilts with the tile
        // in 3D rather than floating as a flat screen-space overlay.
        <Html transform position={[0, 0, 0.06]} scale={0.2} zIndexRange={[70, 0]}>
          <button
            className="tile-play"
            onClick={onPlay}
            aria-label={`Play ${work.title}`}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </Html>
      )}
      {focused && reveal && (
        // The focused tile sits at phase ~0 where the ribbon twist is zero, so the
        // title needs no counter-roll — it's already level.
        <Html
          transform
          position={[0, -SPIRAL.tile[1] * 0.26, 0.06]}
          scale={0.2}
          zIndexRange={[60, 0]}
        >
          {/* Stays mounted through `paused` so it can scramble OUT on click rather
              than vanish; `active` flips it between decode-in and encode-out. */}
          <WorkTitle title={work.title} sub={work.client} active={!paused} />
        </Html>
      )}
    </group>
  );
}

// The works gallery as an endless upward helix around Martin. Scroll/drag winds it
// and snaps the nearest work to front-and-center, where it reveals into color with
// a scrambling title. Clicking the centered tile opens the existing video player.
export function WorksSpiral3D({ works, open, paused, showPlay, onSelect, onPlay }: WorksSpiral3DProps) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  const gl = useThree((s) => s.gl);
  const aspect = size.width / size.height || 1;
  const pointer = useMemo(() => new THREE.Vector2(), []);

  // Spill source: the folder icon's world position (top icon in the column).
  // Memoized so it's stable across renders (only changes with the viewport).
  const from = useMemo<[number, number, number]>(
    () => [iconColumnLayout(aspect).x, ICON_ROWS_Y[0] ?? 0, 0],
    [aspect],
  );


  // One shared looping <video> + VideoTexture. Its src is swapped to the centered,
  // settled work's loop (see the focus effect below); only that one tile samples it.
  const video = useMemo(() => {
    const v = document.createElement('video');
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    return v;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);
  useEffect(() => {
    if (!open) video.pause();
  }, [open, video]);
  useEffect(
    () => () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
    },
    [video, texture],
  );

  // Per-work static poster frames (loops/<id>.jpg). Every resting tile samples its
  // own frame — no video decode until a tile becomes the centered, live one. A 1×1
  // placeholder keeps the material's texture non-null until each poster arrives.
  const fallbackTex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([20, 20, 20, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  const [posters, setPosters] = useState<(THREE.Texture | null)[]>(() =>
    works.map(() => null),
  );
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    let cancelled = false;
    works.forEach((work, i) => {
      loader.load(posterUrl(work), (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        loaded[i] = t;
        setPosters((prev) => {
          const next = [...prev];
          next[i] = t;
          return next;
        });
      });
    });
    return () => {
      cancelled = true;
      loaded.forEach((t) => t?.dispose());
    };
  }, [works]);
  useEffect(() => () => fallbackTex.dispose(), [fallbackTex]);

  const n = works.length;
  const sRef = useRef(0); // current scroll
  const sTarget = useRef(0); // input target
  const lastInput = useRef(-Infinity);
  const focusRef = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  // The work whose loop is loaded & playing in the shared video, exposed to tiles
  // only once it's actually ready so a tile never flashes the wrong (or unloaded)
  // clip. Reset whenever focus moves; re-armed by the swap effect below.
  const [liveWorkId, setLiveWorkId] = useState<string | undefined>(undefined);
  // Tile meshes registered by index, for raycasting a click to the centered tile.
  const tilesRef = useRef<(THREE.Mesh | null)[]>([]);
  // onSelect is recreated each App render; keep it in a ref so the input effect
  // doesn't need to rebind its window listeners.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Per-tile spill stagger, ordered top→bottom; and whether the cascade has
  // settled enough to let the centered tile reveal into color.
  const [delays, setDelays] = useState<number[]>(() => works.map((_, i) => i * STAGGER));
  const [reveal, setReveal] = useState(false);

  // On open, order the spill by each tile's slot height (top first) at the
  // current scroll position, then arm the center reveal once the whole cascade
  // has had time to settle into place.
  useEffect(() => {
    if (!open) {
      setReveal(false);
      return;
    }
    const s = sRef.current;
    const phaseOf = (idx: number) => nearestCongruentSlot(idx, s, n) - s;
    const order = works.map((_, idx) => idx).sort((a, b) => phaseOf(b) - phaseOf(a));
    const next = new Array<number>(works.length);
    order.forEach((idx, rank) => (next[idx] = rank * STAGGER));
    setDelays(next);

    const settleMs = (works.length - 1) * STAGGER * 1000 + SPILL_SETTLE_MS;
    const t = window.setTimeout(() => setReveal(true), settleMs);
    return () => window.clearTimeout(t);
  }, [open, works, n]);

  // Swap the shared <video> to the centered work's loop and play it — but only
  // after focus holds briefly, so winding the helix doesn't thrash the src. The
  // debounce resets on every focus change; the tile stays on its poster until the
  // clip is `playing`, then liveWorkId arms it. Sourceless works (404) fall back to
  // the Kai Angel placeholder. Disabled while a video is open (paused).
  useEffect(() => {
    if (!open || paused) return;
    const work = works[focusedIndex];
    if (!work) return;
    setLiveWorkId(undefined);
    const handle = window.setTimeout(() => {
      const onPlaying = () => setLiveWorkId(work.id);
      const onError = () => {
        if (!video.src.endsWith('kai-angel-prada-party.mp4')) {
          video.src = PLACEHOLDER_LOOP;
          video.load();
          video.play().catch(() => {});
        }
      };
      video.onplaying = onPlaying;
      video.onerror = onError;
      video.src = work.loopUrl;
      video.load();
      video.play().catch(() => {});
    }, 200);
    return () => {
      window.clearTimeout(handle);
      video.onplaying = null;
      video.onerror = null;
    };
  }, [focusedIndex, open, paused, works, video]);

  // Input → sTarget. Active only while the gallery is open and no video is up
  // (the camera rig's wheel/touch are disabled in this state, so we own them).
  // Pointer events handle BOTH mouse and touch: drag winds the helix; a release
  // that barely moved is treated as a click and raycast to open the centered tile
  // (the WebGL canvas is pointer-events:none, so the mesh can't catch the click).
  useEffect(() => {
    const mark = () => (lastInput.current = performance.now());

    const onWheel = (e: WheelEvent) => {
      if (!open || paused) return;
      e.preventDefault();
      // Respect a horizontal trackpad swipe as well as a vertical wheel.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      sTarget.current += delta * WHEEL_SENSITIVITY;
      mark();
    };

    const tryOpen = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = tilesRef.current.filter((m): m is THREE.Mesh => !!m);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit) return;
      const idx = hit.object.userData.workIndex as number;
      if (idx !== focusRef.current) return; // only the centered, lit tile opens
      const g = hit.object.parent;
      const world: [number, number, number] = g
        ? [g.position.x, g.position.y, g.position.z]
        : from;
      onSelectRef.current(works[idx], { x: clientX, y: clientY }, world);
    };

    let active = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (!open || paused) return;
      active = true;
      lastX = e.clientX;
      lastY = e.clientY;
      moved = 0;
      document.body.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!active) return;
      // Horizontal drag winds the helix (drag left → next). Track total motion on
      // both axes so any real drag still suppresses the click-to-open.
      const dx = lastX - e.clientX;
      const dy = e.clientY - lastY;
      sTarget.current += dx * TOUCH_SENSITIVITY;
      moved += Math.hypot(dx, dy);
      lastX = e.clientX;
      lastY = e.clientY;
      mark();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      document.body.style.cursor = '';
      if (moved < CLICK_THRESHOLD) tryOpen(e.clientX, e.clientY);
    };
    const onPointerCancel = () => {
      active = false;
      document.body.style.cursor = '';
    };

    const onKey = (e: KeyboardEvent) => {
      if (!open || paused) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        sTarget.current += 1;
        mark();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        sTarget.current -= 1;
        mark();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKey);
      document.body.style.cursor = '';
    };
  }, [open, paused, camera, raycaster, gl, pointer, from, works]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    // Snap to the nearest work once input goes quiet.
    if (performance.now() - lastInput.current > SNAP_IDLE_MS && !paused) {
      sTarget.current = THREE.MathUtils.damp(sTarget.current, Math.round(sTarget.current), SNAP_DAMP, d);
    }
    sRef.current = THREE.MathUtils.damp(sRef.current, sTarget.current, SCROLL_DAMP, d);

    const fi = ((Math.round(sRef.current) % n) + n) % n;
    if (fi !== focusRef.current) {
      focusRef.current = fi;
      setFocusedIndex(fi);
    }
  });

  return (
    <>
      {works.map((work, i) => (
        <SpiralItem
          key={work.id}
          work={work}
          i={i}
          n={n}
          from={from}
          open={open}
          paused={paused}
          focused={i === focusedIndex}
          delay={delays[i] ?? i * STAGGER}
          reveal={reveal}
          showPlay={showPlay}
          onPlay={onPlay}
          videoTexture={texture}
          posterTexture={posters[i] ?? fallbackTex}
          liveWorkId={liveWorkId}
          sRef={sRef}
          tilesRef={tilesRef}
        />
      ))}
    </>
  );
}
