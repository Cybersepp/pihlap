import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GALLERY_CENTER, GLOW } from './poses';

// How briskly the glow eases in/out (THREE.MathUtils.damp rate). Slower than the
// camera swing so it drifts in gently rather than snapping on.
const FADE_RATE = 1.6;

// One shaft strikes on like a brittle studio tube: a scripted stutter of hard
// on/off blinks that settles to full. Keyframes are [seconds, brightness]; the
// envelope is stepped (no interpolation) so the blinks snap. After the last key
// it holds at 1 and hands off to the smooth eased fade. The other shaft + halo
// just ramp in via the normal eased gate.
const FLICKER_KEYS: [number, number][] = [
  [0.0, 0.0],
  [0.04, 0.75],
  [0.08, 0.0],
  [0.15, 0.0],
  [0.18, 0.9],
  [0.21, 0.08],
  [0.25, 0.85],
  [0.28, 0.0],
  [0.34, 0.0],
  [0.37, 1.0],
  [0.41, 0.3],
  [0.47, 1.0],
  [0.53, 0.55],
  [0.58, 1.0],
];
const FLICKER_DUR = 0.62;

// How close (world units) the camera must get to its gallery resting position
// before the steady shaft snaps on — so it lights a beat before the swing settles.
const STEADY_LEAD_DIST = 2.6;

function flickerValue(t: number): number {
  let v = FLICKER_KEYS[0][1];
  for (let i = 0; i < FLICKER_KEYS.length; i++) {
    if (t >= FLICKER_KEYS[i][0]) v = FLICKER_KEYS[i][1];
    else break;
  }
  return v;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Soft additive radial sprite — used for the halo behind the centered tile.
const haloFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;  // 0 at centre → ~1 at the edge
    float a = smoothstep(1.0, 0.0, r);  // soft radial falloff
    a *= a;                             // tighten the core, soften the tail
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

// A diagonal light shaft. The geometry's pivot is its base (uv.y = 0, at the tile)
// and it runs up to its source (uv.y = 1, in the corner). It fans wide at the base
// and narrows toward the source, with both ends soft so there's no hard edge.
const rayFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;                       // 0 = base (tile), 1 = source (corner)
    float halfW = mix(0.5, 0.18, along);       // wide at the base → narrow at the source
    float across = smoothstep(1.0, 0.0, abs(vUv.x - 0.5) / halfW);
    // Soft caps at both ends: fade in off the tile, fade out at the source tip.
    float lenFade = smoothstep(0.0, 0.30, along) * smoothstep(1.0, 0.82, along);
    float a = across * lenFade;
    a *= a;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

function makeMaterial(fragmentShader: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader,
    fragmentShader,
    uniforms: {
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color() },
    },
  });
}

// Scratch reused across frames (the ray loop runs synchronously) — no per-frame
// allocation. See the project's render-loop conventions.
const _center = new THREE.Vector3(...GALLERY_CENTER);
const _toCam = new THREE.Vector3();
const _yAxis = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _xAxis = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _camDest = new THREE.Vector3();

// The gallery's only light: a halo bleeding out from behind the centered tile,
// plus two diagonal shafts angling onto it from the upper-left and upper-right.
// `active` drives the fade — true (gallery open) eases the glow in; false eases it
// out. Mounted by MartinScene only while the works panel is up, so it lives across
// gallery → detail → video and clears on return to rest.
export function CenterGlow({
  active,
  struck,
  camDest,
}: {
  active: boolean;
  struck: boolean;
  camDest?: [number, number, number];
}) {
  const halo = useRef<THREE.Mesh>(null);
  // [0] = left shaft (source up-left), [1] = right shaft (source up-right).
  const rays = useRef<(THREE.Mesh | null)[]>([null, null]);

  // A unit plane for the halo, and a unit plane whose pivot is its base (one end at
  // the origin) for the shafts, so they pivot at the tile and extend up into a corner.
  const haloGeom = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const rayGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0); // base edge (uv.y = 0) at the origin; runs up to +Y
    return g;
  }, []);
  const haloMat = useMemo(() => makeMaterial(haloFragment), []);
  // Separate materials per shaft: [0] steady (eased), [1] flickering.
  const rayMatSteady = useMemo(() => makeMaterial(rayFragment), []);
  const rayMatFlicker = useMemo(() => makeMaterial(rayFragment), []);
  useEffect(
    () => () => {
      haloGeom.dispose();
      rayGeom.dispose();
      haloMat.dispose();
      rayMatSteady.dispose();
      rayMatFlicker.dispose();
    },
    [haloGeom, rayGeom, haloMat, rayMatSteady, rayMatFlicker],
  );

  const opacityRef = useRef(0);
  const steadyRef = useRef(0); // steady shaft gate (waits for arrival)
  const flickRef = useRef(0); // brittle shaft envelope
  const flickT = useRef(0); // seconds since the strike began
  const flickering = useRef(false);
  const hasStruck = useRef(false); // the strike fires once per mount

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    // A single eased gate (0→1) scales every sprite's target opacity.
    opacityRef.current = THREE.MathUtils.damp(opacityRef.current, active ? 1 : 0, FADE_RATE, d);
    const k = opacityRef.current;

    // Brittle shaft: stays dark until the camera has settled into the gallery
    // (`struck`), then strikes on with the scripted stutter and holds at full.
    // Fires once per mount, so backing out of a video doesn't re-strike it.
    if (struck && !hasStruck.current) {
      hasStruck.current = true;
      flickT.current = 0;
      flickering.current = true;
    }
    if (flickering.current) {
      flickT.current += d;
      if (flickT.current >= FLICKER_DUR) {
        flickering.current = false;
        flickRef.current = 1;
      } else {
        flickRef.current = flickerValue(flickT.current);
      }
    } else if (!hasStruck.current) {
      flickRef.current = 0;
    } else {
      flickRef.current = THREE.MathUtils.damp(flickRef.current, active ? 1 : 0, FADE_RATE, d);
    }
    const kFlicker = flickRef.current;

    // Steady shaft snaps on (no fade-in) a beat before the swing settles — the
    // moment the camera comes within STEADY_LEAD_DIST of its gallery resting spot
    // (or once arrived). It still eases out on close.
    const nearDest =
      !!camDest && state.camera.position.distanceTo(_camDest.set(...camDest)) < STEADY_LEAD_DIST;
    const steadyOn = active && (hasStruck.current || nearDest);
    steadyRef.current = steadyOn ? 1 : THREE.MathUtils.damp(steadyRef.current, 0, FADE_RATE, d);
    const kSteady = steadyRef.current;
    const q = state.camera.quaternion;

    if (halo.current) {
      halo.current.quaternion.copy(q); // billboard
      halo.current.scale.setScalar(GLOW.haloSize);
      haloMat.uniforms.uOpacity.value = GLOW.haloOpacity * k;
      (haloMat.uniforms.uColor.value as THREE.Color).setRGB(...GLOW.haloColor);
    }

    rayMatSteady.uniforms.uOpacity.value = GLOW.rayOpacity * kSteady;
    (rayMatSteady.uniforms.uColor.value as THREE.Color).setRGB(...GLOW.rayColor);
    rayMatFlicker.uniforms.uOpacity.value = GLOW.rayOpacity * kFlicker;
    (rayMatFlicker.uniforms.uColor.value as THREE.Color).setRGB(...GLOW.rayColor);
    // Each shaft is WORLD-ANCHORED: its base sits at the tile and its axis is fixed
    // in world space (in the XY plane, tilted ±rayAngle from vertical) — so moving
    // the camera gives real parallax instead of the shafts riding the screen. To
    // keep a flat quad from vanishing edge-on, it's axial-billboarded: it spins
    // only about its own (fixed) long axis to turn its face toward the camera.
    const ca = Math.cos(GLOW.rayAngle);
    const sa = Math.sin(GLOW.rayAngle);
    for (let i = 0; i < 2; i++) {
      const m = rays.current[i];
      if (!m) continue;
      const sign = i === 0 ? 1 : -1; // left shaft → world +X (screen-left), right → −X
      // Fixed world axis from base → source (up and out toward a top corner).
      _yAxis.set(sign * sa, ca, 0).normalize();
      // Normal: the camera direction with the axis component projected out, so the
      // face turns toward the camera while the axis stays put.
      _toCam.copy(state.camera.position).sub(_center).normalize();
      _zAxis.copy(_yAxis).multiplyScalar(_toCam.dot(_yAxis));
      _zAxis.subVectors(_toCam, _zAxis);
      if (_zAxis.lengthSq() < 1e-6) _zAxis.set(0, 0, 1); // looking down the axis (won't happen here)
      _zAxis.normalize();
      _xAxis.crossVectors(_yAxis, _zAxis).normalize();
      _zAxis.crossVectors(_xAxis, _yAxis).normalize(); // re-orthogonalize (right-handed)
      _basis.makeBasis(_xAxis, _yAxis, _zAxis);
      m.quaternion.setFromRotationMatrix(_basis);
      m.scale.set(GLOW.rayWidth, GLOW.rayLength, 1);
    }
  });

  return (
    <group>
      {/* renderOrder −1: drawn before the works so the glow sits behind the tiles
          (the bright video covers the core; the shafts fan around its edges)
          rather than washing over the focused video. */}
      <mesh ref={halo} geometry={haloGeom} material={haloMat} position={GALLERY_CENTER} renderOrder={-1} />
      <mesh
        ref={(m) => (rays.current[0] = m)}
        geometry={rayGeom}
        material={rayMatSteady}
        position={GALLERY_CENTER}
        renderOrder={-1}
      />
      <mesh
        ref={(m) => (rays.current[1] = m)}
        geometry={rayGeom}
        material={rayMatFlicker}
        position={GALLERY_CENTER}
        renderOrder={-1}
      />
    </group>
  );
}
