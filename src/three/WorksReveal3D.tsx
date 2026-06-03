import { MouseEvent, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Work } from '../data/works';
import { MovIcon } from '../components/Icons';
import { IconClickOrigin } from '../components/DesktopIcon';
import { CLOUD, GALLERY, ICON_ROWS_Y, iconColumnLayout } from './poses';

export interface WorksReveal3DProps {
  works: Work[];
  selectedWorkId?: string;
  /** true = files spill out to the cloud; false = they fly back into the folder. */
  open: boolean;
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
}

// Deterministic PRNG so the cloud scatter is stable across renders.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Loose 3D scatter offsets around the gallery center (the cloud "to" targets).
function cloudOffsets(n: number): [number, number, number][] {
  const rng = mulberry32(0x5eed);
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.7)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const bx = cols > 1 ? (c / (cols - 1)) * 2 - 1 : 0;
    const by = rows > 1 ? (r / (rows - 1)) * 2 - 1 : 0;
    const jx = (rng() * 2 - 1) * (1.3 / cols);
    const edgeY = Math.abs(by);
    const jy = (rng() * 2 - 1) * (1.3 / rows) * (1 - edgeY * 0.5);
    const yNorm = Math.min(by * 0.82 + jy, 0.86);
    out.push([
      (bx * 0.9 + jx) * CLOUD.spread[0],
      yNorm * CLOUD.spread[1],
      (rng() * 2 - 1) * CLOUD.spread[2],
    ]);
  }
  return out;
}

const tmp = new THREE.Vector3();

// One floating ".mov" file. It starts (tiny, hidden) at the folder icon and, after
// a staggered delay, flies out to its cloud position, growing in as it goes — so
// the files spill out of the folder. Billboarded to the camera so it always reads
// head-on, through the swing and the settled gallery view.
function CloudItem({
  work,
  from,
  to,
  delay,
  open,
  selected,
  onSelect,
}: {
  work: Work;
  from: [number, number, number];
  to: [number, number, number];
  delay: number;
  open: boolean;
  selected: boolean;
  onSelect: WorksReveal3DProps['onSelect'];
}) {
  const group = useRef<THREE.Group>(null);
  const prog = useRef(0); // 0 = inside the folder, 1 = settled in the cloud
  const clock = useRef(0); // time since the current open/close began (for stagger)
  const prevOpen = useRef(open);
  const driftAmt = useRef(0);
  const [hovered, setHovered] = useState(false);
  const phases = useMemo(
    () => [Math.random() * 7, Math.random() * 7, Math.random() * 7] as const,
    [],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);

    // Reset the stagger clock whenever the direction flips, so the fly-back
    // cascades file-by-file (after each file's delay) exactly like the spill-out,
    // instead of every file returning to the folder at once.
    if (open !== prevOpen.current) {
      prevOpen.current = open;
      clock.current = 0;
    }
    clock.current += d;

    // Each file waits out its stagger delay, then heads to its target: the cloud
    // when open, back into the folder when closing.
    const past = clock.current > delay;
    const target = open ? (past ? 1 : 0) : past ? 0 : 1;
    prog.current = THREE.MathUtils.damp(prog.current, target, 6, d);
    const p = prog.current;

    driftAmt.current = THREE.MathUtils.damp(driftAmt.current, hovered ? 1 : 0, 4, d);
    const t = state.clock.elapsedTime;
    const a = driftAmt.current * CLOUD.driftAmplitude;

    tmp.set(
      from[0] + (to[0] - from[0]) * p + Math.sin(t * 0.9 + phases[0]) * a,
      from[1] + (to[1] - from[1]) * p + Math.cos(t * 0.7 + phases[1]) * a,
      from[2] + (to[2] - from[2]) * p + Math.sin(t * 1.1 + phases[2]) * a,
    );
    g.position.copy(tmp);
    g.lookAt(state.camera.position);
    g.scale.setScalar(0.0001 + p);
  });

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    onSelect(work, { x: e.clientX, y: e.clientY }, [to[0], to[1], to[2]]);
  }

  return (
    <group ref={group} scale={0.0001}>
      <Html transform scale={CLOUD.scale} zIndexRange={[40, 0]} occlude="blending">
        <div
          className={`cloud-item${selected ? ' is-selected' : ''}`}
          style={{ backfaceVisibility: 'hidden', pointerEvents: 'auto' }}
          onClick={handleClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          role="button"
          tabIndex={0}
        >
          <div className="cloud-item-glyph">
            <MovIcon size={60} />
          </div>
          <span className="cloud-item-label">{work.title}</span>
        </div>
      </Html>
    </group>
  );
}

// The works gallery: the ".mov" files fly out of the "selected works" folder icon
// and settle into a loose 3D cloud around the gallery center. Clicking a settled
// file pans the camera to it (then App opens the video).
export function WorksReveal3D({ works, selectedWorkId, open, onSelect }: WorksReveal3DProps) {
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height || 1;

  // The folder icon's world position (the top icon in the column) — the spill source.
  const { x: folderX } = iconColumnLayout(aspect);
  const from: [number, number, number] = [folderX, ICON_ROWS_Y[0] ?? 0, 0];

  const clouds = useMemo(() => cloudOffsets(works.length), [works.length]);

  return (
    <>
      {works.map((work, i) => (
        <CloudItem
          key={work.id}
          work={work}
          from={from}
          to={[
            GALLERY.center[0] + clouds[i][0],
            GALLERY.center[1] + clouds[i][1],
            GALLERY.center[2] + clouds[i][2],
          ]}
          delay={i * 0.05}
          open={open}
          selected={selectedWorkId === work.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
