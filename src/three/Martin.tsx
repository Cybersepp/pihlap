import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { TARGET_SIZE, MODEL_ROTATION } from './poses';
import { MaterialSettings, DEFAULT_MATERIAL_SETTINGS, buildModelMaterial } from './materialSettings';

const MODEL_URL = `${import.meta.env.BASE_URL}pihlap.glb`;

// The figure — a 3D scan of Martin. Its base material comes from `settings`
// (matcap clay by default, but live-swappable via the dev panel). Otherwise it's
// completely immobile, so at rest the scene reads as a flat 2D image.
// How dark the figure sinks (matcap color multiplier) when a work is selected.
const DIM_LEVEL = 0.4;

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

  // useGLTF suspended until the GLB resolved, so reaching this mount means the
  // figure is ready — tell the intro it can settle behind him.
  useEffect(() => {
    onReady?.();
  }, [onReady]);

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
    const prev = prevBase.current as THREE.MeshMatcapMaterial | null;
    if (prev && prev !== base) {
      prev.matcap?.dispose?.();
      prev.dispose();
    }
    prevBase.current = base;
  }, [scene, box, settings]);

  // Eased dim that tints the base matcap darker when a work is open (matcap
  // ignores scene lights, so we dim via the material color).
  const dim = useRef(1);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    dim.current = THREE.MathUtils.damp(dim.current, dimmed ? DIM_LEVEL : 1, 4, d);
    const base = prevBase.current as THREE.MeshMatcapMaterial | null;
    base?.color?.setScalar(dim.current);
  });

  return (
    <group>
      <group rotation={MODEL_ROTATION}>
        <Center scale={scale}>
          <primitive object={scene} />
        </Center>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
