import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { TARGET_SIZE, MODEL_ROTATION } from './poses';
import { MaterialSettings, DEFAULT_MATERIAL_SETTINGS, buildModelMaterial } from './materialSettings';

const MODEL_URL = `${import.meta.env.BASE_URL}pihlap.glb`;

// The figure — a 3D scan of Martin. Its base material comes from `settings`
// (matcap clay by default, but live-swappable via the dev panel). Otherwise it's
// completely immobile, so at rest the scene reads as a flat 2D image.
// How dark the figure sinks (matcap color multiplier) when a work is selected.
const DIM_LEVEL = 0.4;

// Intro reveal: a horizontal cut-plane sweeps bottom→top so the figure "scans"
// into existence rather than popping in. Driven by a single world-space clipping
// plane animated in the render loop.
const REVEAL_MS = 1100;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Martin({
  dimmed = false,
  settings = DEFAULT_MATERIAL_SETTINGS,
  onReady,
}: {
  /** A work detail/video is open — sink the figure into the background. */
  dimmed?: boolean;
  settings?: MaterialSettings;
  /** Fired once the GLB has resolved and the figure has mounted (intro hand-off). */
  onReady?: () => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const gl = useThree((s) => s.gl);

  // useGLTF suspended until the GLB resolved, so reaching this mount means the
  // figure is ready — tell the intro it can settle behind him.
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  // Sweep plane keeps fragments below `constant` (world Y). It starts at the
  // figure's bottom (nothing shown) and rises to the top over the intro.
  const groupRef = useRef<THREE.Group>(null);
  const clip = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
  const yBounds = useRef<{ min: number; max: number } | null>(null);
  const reveal = useRef(0);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  // Scene-derived bits that don't depend on the material settings.
  const { scale, box } = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const size = b.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    return { scale: TARGET_SIZE / maxDim, box: b };
  }, [scene]);

  // Base material is rebuilt and reassigned live whenever the dev settings change.
  // Disposing the previous one keeps repeated tweaking from leaking GPU resources.
  const prevBase = useRef<THREE.Material | null>(null);
  useMemo(() => {
    const base = buildModelMaterial(settings, box);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        // The source GLB ships without a NORMAL attribute. Without normals the
        // matcap lookup coordinate is undefined (NaN), and different GPUs resolve
        // that differently — desktop sampled the black rim, phones sampled the
        // light center, so the figure's color/texture diverged by device. Compute
        // smooth normals so the matcap is sampled identically everywhere.
        if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
        mesh.material = base;
      }
    });
    if (!prefersReducedMotion) base.clippingPlanes = [clip.current];
    const prev = prevBase.current as THREE.MeshMatcapMaterial | null;
    if (prev && prev !== base) {
      prev.matcap?.dispose?.();
      prev.dispose();
    }
    prevBase.current = base;
  }, [scene, box, settings]);

  // Measure the figure's world-space vertical extent once it's mounted and
  // centered, then prime the sweep plane at its base so the reveal starts hidden.
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(g);
    const pad = (b.max.y - b.min.y) * 0.04;
    yBounds.current = { min: b.min.y - pad, max: b.max.y + pad };
    reveal.current = prefersReducedMotion ? 1 : 0;
    clip.current.constant = prefersReducedMotion ? yBounds.current.max : yBounds.current.min;
  }, [scale, box]);

  // Eased dim that tints the base matcap darker when a work is open (matcap
  // ignores scene lights, so we dim via the material color).
  const dim = useRef(1);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    dim.current = THREE.MathUtils.damp(dim.current, dimmed ? DIM_LEVEL : 1, 4, d);
    const base = prevBase.current as THREE.MeshMatcapMaterial | null;
    base?.color?.setScalar(dim.current);

    if (reveal.current < 1 && yBounds.current) {
      reveal.current = Math.min(1, reveal.current + d / (REVEAL_MS / 1000));
      const { min, max } = yBounds.current;
      clip.current.constant = THREE.MathUtils.lerp(min, max, easeOutCubic(reveal.current));
    }
  });

  return (
    <group ref={groupRef}>
      <group rotation={MODEL_ROTATION}>
        <Center scale={scale}>
          <primitive object={scene} />
        </Center>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
