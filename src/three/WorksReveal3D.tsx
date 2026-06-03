import { MouseEvent, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Work } from '../data/works';
import { MovIcon } from '../components/Icons';
import { IconClickOrigin } from '../components/DesktopIcon';
import { CLOUD, ORBIT, ICON_ROWS_Y, iconColumnLayout } from './poses';

export interface WorksReveal3DProps {
  works: Work[];
  selectedWorkId?: string;
  /** true = files spill out of the folder into orbit; false = they fly back in. */
  open: boolean;
  /** true while a video is open — the orbits ease to a clean stop, then resume. */
  paused: boolean;
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
}

// Deterministic PRNG so each file's orbit is stable across renders.
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

interface OrbitParams {
  radius: number;
  baseAngle: number;
  height: number;
  tilt: number;
  speed: number;
}

// One orbit per file: spread the start angles evenly, then jitter radius, height,
// plane tilt and speed so the files form a loose orbital system, not a flat ring.
function makeOrbits(n: number): OrbitParams[] {
  const rng = mulberry32(0x0a1b2c3d);
  const out: OrbitParams[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      radius: ORBIT.radius * (1 - ORBIT.radiusJitter / 2 + rng() * ORBIT.radiusJitter),
      baseAngle: (i / Math.max(n, 1)) * Math.PI * 2 + (rng() - 0.5),
      height: (rng() - 0.5) * ORBIT.heightJitter,
      tilt: (rng() - 0.5) * ORBIT.tilt,
      speed: ORBIT.speed * (1 - ORBIT.speedJitter / 2 + rng() * ORBIT.speedJitter),
    });
  }
  return out;
}

const tmp = new THREE.Vector3();

// The file's position on its (tilted) orbit at a given accumulated angle. Driving
// off an accumulated angle (rather than absolute time) lets us ease the orbit
// speed up and down — so it can halt cleanly and resume from where it stopped.
function orbitAt(out: THREE.Vector3, p: OrbitParams, angle: number) {
  const lx = Math.cos(angle) * p.radius;
  const lz = Math.sin(angle) * p.radius;
  const ly = p.height;
  const ct = Math.cos(p.tilt);
  const st = Math.sin(p.tilt);
  out.set(
    ORBIT.center[0] + lx,
    ORBIT.center[1] + (ly * ct - lz * st),
    ORBIT.center[2] + (ly * st + lz * ct),
  );
}

// One floating ".mov" file. Starts (tiny, hidden) at the folder icon; after its
// stagger delay it eases out and tracks its live orbit point, so it spills out of
// the folder and into a slow orbit. Billboarded to the camera so it always reads
// head-on. On close it reverses the same way, back into the folder.
function OrbitItem({
  work,
  from,
  params,
  delay,
  open,
  paused,
  selected,
  onSelect,
}: {
  work: Work;
  from: [number, number, number];
  params: OrbitParams;
  delay: number;
  open: boolean;
  paused: boolean;
  selected: boolean;
  onSelect: WorksReveal3DProps['onSelect'];
}) {
  const group = useRef<THREE.Group>(null);
  const prog = useRef(0); // 0 = in the folder, 1 = out on the orbit
  const clock = useRef(0); // time since the current open/close began (for stagger)
  const prevOpen = useRef(open);
  const angle = useRef(params.baseAngle); // accumulated orbit angle
  const speedFactor = useRef(1); // eases 1→0 when paused (video open), back on resume

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);

    // Reset the stagger clock on each direction flip, so the fly-back cascades
    // file-by-file just like the spill-out.
    if (open !== prevOpen.current) {
      prevOpen.current = open;
      clock.current = 0;
    }
    clock.current += d;

    const past = clock.current > delay;
    const target = open ? (past ? 1 : 0) : past ? 0 : 1;
    prog.current = THREE.MathUtils.damp(prog.current, target, 6, d);
    const p = prog.current;

    // Ease the orbit speed to a clean stop while a video is open, and back up on
    // exit, advancing the accumulated angle by the current (eased) speed.
    speedFactor.current = THREE.MathUtils.damp(speedFactor.current, paused ? 0 : 1, 3.5, d);
    angle.current += params.speed * speedFactor.current * d;

    // Lerp between the folder and the file's live orbit point, so once settled it
    // rides the orbit, and while spilling out it heads toward where the orbit is.
    orbitAt(tmp, params, angle.current);
    tmp.set(
      from[0] + (tmp.x - from[0]) * p,
      from[1] + (tmp.y - from[1]) * p,
      from[2] + (tmp.z - from[2]) * p,
    );
    g.position.copy(tmp);
    g.lookAt(state.camera.position);
    g.scale.setScalar(0.0001 + p);
  });

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // Fly to wherever the file currently is on its orbit.
    const g = group.current;
    const world: [number, number, number] = g
      ? [g.position.x, g.position.y, g.position.z]
      : [from[0], from[1], from[2]];
    onSelect(work, { x: e.clientX, y: e.clientY }, world);
  }

  return (
    <group ref={group} scale={0.0001}>
      <Html transform scale={CLOUD.scale} zIndexRange={[40, 0]} occlude="blending">
        <div
          className={`cloud-item${selected ? ' is-selected' : ''}`}
          style={{ backfaceVisibility: 'hidden', pointerEvents: 'auto' }}
          onClick={handleClick}
          role="button"
          tabIndex={0}
        >
          <div className="cloud-item-glyph">
            {work.icon ? (
              <img
                src={work.icon}
                alt=""
                width={64}
                height={64}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <MovIcon size={60} />
            )}
          </div>
          <span className="cloud-item-label">{work.title}</span>
        </div>
      </Html>
    </group>
  );
}

// The works gallery: the ".mov" files spill out of the "selected works" folder
// icon and settle into slow orbits around the figure. Clicking one flies the
// camera to its current orbit position (then App opens the video).
export function WorksReveal3D({ works, selectedWorkId, open, paused, onSelect }: WorksReveal3DProps) {
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height || 1;

  // The folder icon's world position (top icon in the column) — the spill source.
  const { x: folderX } = iconColumnLayout(aspect);
  const from: [number, number, number] = [folderX, ICON_ROWS_Y[0] ?? 0, 0];

  const orbits = useMemo(() => makeOrbits(works.length), [works.length]);

  return (
    <>
      {works.map((work, i) => (
        <OrbitItem
          key={work.id}
          work={work}
          from={from}
          params={orbits[i]}
          delay={i * 0.05}
          open={open}
          paused={paused}
          selected={selectedWorkId === work.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
