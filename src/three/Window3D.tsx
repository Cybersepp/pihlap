import { ReactNode, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { GALLERY, TEXT_PANEL_CENTER } from './poses';

// Scratch vectors reused each frame (avoid per-frame allocations).
const _normal = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _panelPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// A window panel rendered in 3D at the gallery center, facing the gallery camera.
// Wraps arbitrary DOM (a Finder/text window) in an Html-transform panel with:
//  - per-pixel occlusion by Martin (occlude="blending"),
//  - an OS-style "open" animation — the panel scales up from ~0 to full size,
//    driven by damping the parent group's scale (Html reads its world matrix).
//
// A drei <Html transform> panel is a flat, double-sided DOM sheet: from behind
// you'd see the front's mirrored, see-through text. CSS backface-visibility can't
// fix this here (the window's backdrop-filter forces a flattened layer that the
// browser draws on both sides). So instead we detect, each frame, which side the
// camera is on and render either the real window (`children`) or a blank `back`
// sheet. The back is featureless, so the sheet reading mirrored doesn't matter —
// and the text is simply not in the DOM when you're behind it.
export function Window3D({ children, back }: { children: ReactNode; back: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const scale = useRef(0.001);
  const [showFront, setShowFront] = useState(true);

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    // Smooth ease toward full size (lambda ~9 → ~0.4s settle), OS-window feel.
    scale.current = THREE.MathUtils.damp(scale.current, 1, 9, dt);
    g.scale.setScalar(scale.current);

    // The DOM front faces the group's local +Z. If the camera is on that side,
    // show the window; otherwise show the blank back. Only flips at the edge-on
    // crossover, where the panel is ~invisible, so the swap goes unnoticed.
    g.getWorldQuaternion(_quat);
    _normal.set(0, 0, 1).applyQuaternion(_quat);
    g.getWorldPosition(_panelPos);
    _toCam.copy(camera.position).sub(_panelPos);
    const front = _normal.dot(_toCam) > 0;
    if (front !== showFront) setShowFront(front);
  });

  return (
    <group
      ref={group}
      position={TEXT_PANEL_CENTER}
      rotation={[0, GALLERY.faceY, 0]}
      scale={0.001}
    >
      <Html transform scale={GALLERY.scale} zIndexRange={[40, 0]} occlude="blending">
        {showFront ? children : back}
      </Html>
    </group>
  );
}
