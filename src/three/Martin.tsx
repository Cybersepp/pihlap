import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { TARGET_SIZE, MODEL_ROTATION } from './poses';
import { MaterialSettings, DEFAULT_MATERIAL_SETTINGS, buildModelMaterial } from './materialSettings';

const MODEL_URL = `${import.meta.env.BASE_URL}pihlap.glb`;

// Warm tone the surface heats up to on the break.
const GLOW_COLOR = '#ffd98a';

// The figure — a 3D scan of Martin. Its base material comes from `settings`
// (matcap clay by default, but live-swappable via the dev panel). On the 4th-wall
// break (`broken`) an additive warm shell fades in over it, heating it toward a
// sun glow, then cools on return. Otherwise it's completely immobile, so at rest
// the scene reads as a flat 2D image.
// How dark the figure sinks (matcap color multiplier) when a work is selected.
const DIM_LEVEL = 0.4;

export function Martin({
  broken = false,
  dimmed = false,
  settings = DEFAULT_MATERIAL_SETTINGS,
}: {
  broken?: boolean;
  /** A work detail/video is open — sink the figure into the background. */
  dimmed?: boolean;
  settings?: MaterialSettings;
}) {
  const { scene } = useGLTF(MODEL_URL);

  // Scene-derived bits that don't depend on the material settings.
  const { scale, box, glow, glowMaterial } = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const size = b.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    // A concentric copy rendered with an additive warm material — fading it in
    // brightens the surface toward a glowing sun-warm tone without a hard swap.
    const glowClone = scene.clone(true);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(GLOW_COLOR),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    glowClone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.material = mat;
    });

    return { scale: TARGET_SIZE / maxDim, box: b, glow: glowClone, glowMaterial: mat };
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
    const prev = prevBase.current as THREE.MeshMatcapMaterial | null;
    if (prev && prev !== base) {
      prev.matcap?.dispose?.();
      prev.dispose();
    }
    prevBase.current = base;
  }, [scene, box, settings]);

  // Eased 0→1 "heat" that follows the break, driving the glow shell; plus an eased
  // dim that tints the base matcap darker when a work is open (matcap ignores
  // scene lights, so we dim via the material color).
  const heat = useRef(0);
  const dim = useRef(1);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    heat.current = THREE.MathUtils.damp(heat.current, broken ? 1 : 0, 3, d);
    glowMaterial.opacity = heat.current;
    dim.current = THREE.MathUtils.damp(dim.current, dimmed ? DIM_LEVEL : 1, 4, d);
    const base = prevBase.current as THREE.MeshMatcapMaterial | null;
    base?.color?.setScalar(dim.current);
  });

  return (
    <group>
      <group rotation={MODEL_ROTATION}>
        <Center scale={scale}>
          <primitive object={scene} />
          {/* Slightly enlarged additive shell so the glow bleeds past the silhouette. */}
          <group scale={1.02}>
            <primitive object={glow} />
          </group>
        </Center>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
