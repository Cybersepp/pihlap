import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { TARGET_SIZE, MODEL_ROTATION } from './poses';

const MODEL_URL = `${import.meta.env.BASE_URL}pihlap.glb`;

// ── Matcap clay ──────────────────────────────────────────────────────────────
// The model wears a single matte "clay" matcap: studio lighting baked straight
// into the surface, so it renders identically on every device and needs no scene
// lights. The matcap is generated procedurally on a canvas (a warm radial sphere
// lit from the upper-left, with a soft specular hotspot) — no fetched texture.
let clayMatcap: THREE.Texture | null = null;
function getClayMatcap(): THREE.Texture {
  if (clayMatcap) return clayMatcap;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a241b';
  ctx.fillRect(0, 0, s, s);
  // Main diffuse sphere, lit from the upper-left.
  const g = ctx.createRadialGradient(s * 0.36, s * 0.3, s * 0.04, s * 0.5, s * 0.5, s * 0.56);
  g.addColorStop(0, '#f3dcc0');
  g.addColorStop(0.35, '#cd8a5f');
  g.addColorStop(0.75, '#8a4c30');
  g.addColorStop(1, '#3a241b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  // Tight specular hotspot.
  const h = ctx.createRadialGradient(s * 0.34, s * 0.28, 0, s * 0.34, s * 0.28, s * 0.18);
  h.addColorStop(0, 'rgba(255,248,235,0.85)');
  h.addColorStop(1, 'rgba(255,248,235,0)');
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  clayMatcap = tex;
  return tex;
}

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

    // One shared clay-matcap material for every mesh, overriding whatever the GLB
    // shipped with.
    const clay = new THREE.MeshMatcapMaterial({ matcap: getClayMatcap() });
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = clay;
      }
    });

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
