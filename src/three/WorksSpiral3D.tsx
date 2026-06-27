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
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
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

// PLACEHOLDER: one real loop reused for every tile until per-work loops exist.
// A single shared <video>/VideoTexture drives all 12 tiles (the shader desaturates
// the off-centre ones), so it's one decode regardless of tile count.
const LOOP_URL = `${import.meta.env.BASE_URL}loops/kai-angel-prada-party.mp4`;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

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
  videoTexture,
  posterTexture,
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
  /** Spill stagger (seconds), assigned top→bottom by the parent. */
  delay: number;
  /** The spill has settled — tiles may now reveal into color at center. */
  reveal: boolean;
  /** Shared live loop — only the lit/centered tile samples this. */
  videoTexture: THREE.Texture;
  /** Frozen frame grabbed from the loop — every other tile samples this. */
  posterTexture: THREE.Texture;
  sRef: React.MutableRefObject<number>;
  /** Shared registry so the parent can raycast a click to this tile. */
  tilesRef: React.MutableRefObject<(THREE.Mesh | null)[]>;
}) {
  const group = useRef<THREE.Group>(null);
  // Textures are shared/owned by the parent (uTex is swapped per-frame below), so
  // only dispose the material here.
  const material = useMemo(() => makeTileMaterial(posterTexture), [videoTexture]);
  useEffect(() => () => material.dispose(), [material]);

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
    g.lookAt(state.camera.position);
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

    // Only the lit/centered tile plays the live loop; every other tile shows the
    // frozen poster frame.
    material.uniforms.uTex.value = focused && reveal ? videoTexture : posterTexture;
  });

  return (
    <group ref={group} scale={0.0001}>
      <mesh
        material={material}
        ref={(m) => {
          tilesRef.current[i] = m;
          if (m) m.userData.workIndex = i;
        }}
      >
        <planeGeometry args={[SPIRAL.tile[0], SPIRAL.tile[1]]} />
      </mesh>
      {focused && reveal && (
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
export function WorksSpiral3D({ works, open, paused, onSelect }: WorksSpiral3DProps) {
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

  // One shared looping <video> + VideoTexture for the whole wall (see LOOP_URL).
  const video = useMemo(() => {
    const v = document.createElement('video');
    v.src = LOOP_URL;
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
  // Play only while the gallery is open; clean up on unmount.
  useEffect(() => {
    if (open) video.play().catch(() => {});
    else video.pause();
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

  // Grab one decoded frame from the loop as a static poster for the non-lit tiles.
  // No separate thumbnail asset needed — it's frozen straight from the clip.
  const posterRef = useRef<THREE.Texture | null>(null);
  const [poster, setPoster] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const capture = () => {
      const w = video.videoWidth || 512;
      const h = video.videoHeight || 320;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      try {
        ctx.drawImage(video, 0, 0, w, h);
      } catch {
        return;
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      posterRef.current?.dispose();
      posterRef.current = t;
      setPoster(t);
    };
    video.addEventListener('loadeddata', capture);
    if (video.readyState >= 2) capture();
    return () => video.removeEventListener('loadeddata', capture);
  }, [video]);
  useEffect(() => () => posterRef.current?.dispose(), []);

  const n = works.length;
  const sRef = useRef(0); // current scroll
  const sTarget = useRef(0); // input target
  const lastInput = useRef(-Infinity);
  const focusRef = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
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
          videoTexture={texture}
          posterTexture={poster ?? texture}
          sRef={sRef}
          tilesRef={tilesRef}
        />
      ))}
    </>
  );
}
