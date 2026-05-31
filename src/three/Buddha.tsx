import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { TARGET_SIZE, MODEL_ROTATION } from './poses';

const MODEL_URL = `${import.meta.env.BASE_URL}buddha.glb`;

// The Buddha figure. Loaded from the GLB, recentered to the origin and scaled so
// its largest dimension is TARGET_SIZE units. It is completely immobile — no
// idle animation, no rotation — so at rest the scene is indistinguishable from a
// flat 2D image. The "wow" comes entirely from the camera move.
export function Buddha() {
  const { scene } = useGLTF(MODEL_URL);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return TARGET_SIZE / maxDim;
  }, [scene]);

  return (
    <group rotation={MODEL_ROTATION}>
      <Center scale={scale}>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
