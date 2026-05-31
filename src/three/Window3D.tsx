import { ReactNode, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { GALLERY } from './poses';

// A window panel rendered in 3D at the gallery center, facing the gallery camera.
// Wraps arbitrary DOM (a Finder/text window) in an Html-transform panel with:
//  - per-pixel occlusion by the Buddha (occlude="blending"),
//  - an OS-style "open" animation — the panel scales up from ~0 to full size,
//    driven by damping the parent group's scale (Html reads its world matrix).
// backface-visibility on the child keeps it hidden until the camera swings onto
// its front, so it also tidily disappears as the camera returns to rest.
export function Window3D({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const scale = useRef(0.001);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // Smooth ease toward full size (lambda ~9 → ~0.4s settle), OS-window feel.
    scale.current = THREE.MathUtils.damp(scale.current, 1, 9, dt);
    g.scale.setScalar(scale.current);
  });

  return (
    <group
      ref={group}
      position={GALLERY.center}
      rotation={[0, GALLERY.faceY, 0]}
      scale={0.001}
    >
      <Html transform scale={GALLERY.scale} zIndexRange={[40, 0]} occlude="blending">
        {children}
      </Html>
    </group>
  );
}
