import * as THREE from 'three';

// Live-tunable model material, driven by the dev-only MaterialControls panel.
// In production the panel never mounts, so the model just uses DEFAULT below.
export type MaterialType = 'matcap' | 'standard' | 'gradient';

export interface MaterialSettings {
  type: MaterialType;
  /** standard */
  color: string;
  roughness: number;
  metalness: number;
  /** gradient (vertical clay ramp) */
  gradientBottom: string;
  gradientTop: string;
  /** matcap (procedural clay sphere) */
  matcapHi: string;
  matcapMid: string;
  matcapLo: string;
}

export const DEFAULT_MATERIAL_SETTINGS: MaterialSettings = {
  type: 'matcap',
  color: '#ffffff',
  roughness: 0.9,
  metalness: 0,
  gradientBottom: '#ffffff',
  gradientTop: '#ffffff',
  // Black clay: near-black with a faint warm sheen toward the camera, falling off
  // to pure black at the rim. At rest the figure reads as a dark sculpture; the
  // additive glow shell is what lights it up on the 4th-wall break.
  matcapHi: '#ffffff',
  matcapMid: '#ffffff',
  matcapLo: '#000000',
};

// A clay-sphere matcap: warm highlight in the upper-left falling off to the shadow
// tone at the edges, plus a tight specular hotspot.
function makeMatcapTexture(hi: string, mid: string, lo: string): THREE.Texture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = lo;
  ctx.fillRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s * 0.36, s * 0.3, s * 0.04, s * 0.5, s * 0.5, s * 0.56);
  g.addColorStop(0, hi);
  g.addColorStop(0.42, mid);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  const h = ctx.createRadialGradient(s * 0.34, s * 0.28, 0, s * 0.34, s * 0.28, s * 0.18);
  h.addColorStop(0, 'rgba(235,225,210,0.18)');
  h.addColorStop(1, 'rgba(235,225,210,0)');
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Intro dissolve: a noise+vertical threshold "materialize" that assembles the
// figure bottom→top with a warm glowing edge, instead of a hard clip-plane wipe.
// With `blocky` > 0 the sample position is voxelized so whole cells pop in — the
// same chunky pixel-mosaic aesthetic as the gallery's focus transition.
// Uniforms live on `material.userData.dissolve`; drive `uDReveal` 0→1 (and park it
// high, e.g. 10, once done so nothing is discarded and the edge glow fades out).
export interface DissolveUniforms {
  uDReveal: { value: number };
  uDMinY: { value: number };
  uDMaxY: { value: number };
  uDScale: { value: number };
  uDGradBias: { value: number };
  uDEdge: { value: number };
  uDPixel: { value: number };
  uDBlocky: { value: number };
  uDEdgeColor: { value: THREE.Color };
  // Idle glitch: momentary per-voxel blink-off + hot edge, driven in short bursts.
  uGlitch: { value: number }; // 0 = off, up to 1 during a burst (strobed)
  uGlitchSeed: { value: number }; // reshuffles which cells blink each stutter
  uGlitchAmt: { value: number }; // max fraction of cells affected
  uGlitchGlow: { value: number }; // glow intensity of blinking edges
  uGlitchPixel: { value: number }; // glitch cell resolution (own grid; lower = bigger blocks)
}

// Live-tunable dissolve knobs (dev panel mutates these in place; the render loop
// pushes them into the active material's uniforms every frame). `scale`/`pixel`
// are expressed as cells across the model's height, so they read the same at any
// model scale. Copy these back into source once a look is dialled in.
export const DISSOLVE = {
  durationMs: 3350,
  scale: 20, // value-noise granularity (cells over the figure height)
  gradBias: 0.7, // 0 = pure noise scatter, 1 = clean bottom→top wipe
  edge: 0.3, // width of the glowing dissolve boundary
  pixel: 63, // voxel resolution (cells over the figure height) when blocky
  blocky: 0.68, // 0 = smooth noise flecks, 1 = full chunky pixel/voxel pop-in
  glowR: 3, // edge glow color (>1 channels read as bloom on the dark clay)
  glowG: 0.65,
  glowB: 0,
};

// Occasional idle glitch knobs (live-tunable). Between bursts the figure is fully
// solid; a burst blinks a random handful of voxels off for a fraction of a second,
// re-shuffling a few times so it stutters like an unstable transmission.
export const GLITCH = {
  amount: 0.28, // max fraction of voxels that blink off during a burst
  minGap: 18, // min seconds between bursts
  maxGap: 40, // max seconds between bursts
  burst: 0.32, // burst duration (seconds)
  glow: 0.7, // hot-edge glow intensity on blinking cells
  pixel: 11, // glitch cell resolution over the figure height (lower = bigger blocks)
};

// Replay bridge: Martin registers a callback so the dev panel can re-trigger the
// intro (it only plays once) to preview tuning changes.
let replayFn: (() => void) | null = null;
export function registerDissolveReplay(fn: () => void): void {
  replayFn = fn;
}
export function replayDissolve(): void {
  replayFn?.();
}

// Glitch test bridge: the panel forces a burst now, rather than waiting for the
// next random interval.
let glitchTestFn: (() => void) | null = null;
export function registerGlitchTest(fn: () => void): void {
  glitchTestFn = fn;
}
export function triggerGlitch(): void {
  glitchTestFn?.();
}

const DISSOLVE_HEAD = `
uniform float uDReveal; uniform float uDMinY; uniform float uDMaxY;
uniform float uDScale; uniform float uDGradBias; uniform float uDEdge;
uniform float uDPixel; uniform float uDBlocky;
uniform float uGlitch; uniform float uGlitchSeed; uniform float uGlitchAmt; uniform float uGlitchGlow; uniform float uGlitchPixel;
uniform vec3 uDEdgeColor;
varying vec3 vDPos;
float dHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i + vec3(0.,0.,0.)), dHash(i + vec3(1.,0.,0.)), f.x),
                 mix(dHash(i + vec3(0.,1.,0.)), dHash(i + vec3(1.,1.,0.)), f.x), f.y),
             mix(mix(dHash(i + vec3(0.,0.,1.)), dHash(i + vec3(1.,0.,1.)), f.x),
                 mix(dHash(i + vec3(0.,1.,1.)), dHash(i + vec3(1.,1.,1.)), f.x), f.y), f.z);
}
float dThreshold(){
  // Voxelize toward cell centers for a blocky pop-in; at blocky=0 sample the raw
  // position for a smooth noise dissolve. Whole cells share a threshold, so they
  // materialize as chunky pixels rather than per-fragment flecks.
  vec3 cell = (floor(vDPos * uDPixel) + 0.5) / max(uDPixel, 1e-4);
  vec3 sp = mix(vDPos, cell, uDBlocky);
  float grad = clamp((sp.y - uDMinY) / max(uDMaxY - uDMinY, 1e-4), 0.0, 1.0);
  return mix(dNoise(sp * uDScale), grad, uDGradBias);
}
`;

// Patch a material's shaders to add the dissolve, preserving any existing
// onBeforeCompile (the gradient material has one). Stashes live uniform refs on
// userData so the render loop can animate them.
function attachDissolve(material: THREE.Material, box: THREE.Box3): void {
  const sizeY = box.max.y - box.min.y || 1;
  const uniforms: DissolveUniforms = {
    uDReveal: { value: 0 },
    uDMinY: { value: box.min.y },
    uDMaxY: { value: box.max.y },
    uDScale: { value: DISSOLVE.scale / sizeY },
    uDGradBias: { value: DISSOLVE.gradBias },
    uDEdge: { value: DISSOLVE.edge },
    uDPixel: { value: DISSOLVE.pixel / sizeY },
    uDBlocky: { value: DISSOLVE.blocky },
    uDEdgeColor: { value: new THREE.Color(DISSOLVE.glowR, DISSOLVE.glowG, DISSOLVE.glowB) },
    uGlitch: { value: 0 },
    uGlitchSeed: { value: 0 },
    uGlitchAmt: { value: GLITCH.amount },
    uGlitchGlow: { value: GLITCH.glow },
    uGlitchPixel: { value: GLITCH.pixel / sizeY },
  };
  const prevCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prevCompile?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + DISSOLVE_HEAD)
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' +
          '  if (dThreshold() > uDReveal) discard;\n' +
          '  float gCellHash = dHash(floor(vDPos * uGlitchPixel) + uGlitchSeed);\n' +
          '  float gThresh = uGlitchAmt * uGlitch;\n' +
          '  if (gCellHash < gThresh) discard;',
      )
      .replace(
        '#include <dithering_fragment>',
        '  gl_FragColor.rgb += uDEdgeColor * smoothstep(uDEdge, 0.0, uDReveal - dThreshold());\n' +
          '  gl_FragColor.rgb += uDEdgeColor * uGlitchGlow * uGlitch * smoothstep(gThresh + 0.06, gThresh, gCellHash);\n' +
          '#include <dithering_fragment>',
      );
  };
  material.userData.dissolve = uniforms;
}

// Build the model's base material from the settings. `box` is the model's local
// bounding box (used to normalize the vertical gradient).
export function buildModelMaterial(settings: MaterialSettings, box: THREE.Box3): THREE.Material {
  if (settings.type === 'matcap') {
    const mat = new THREE.MeshMatcapMaterial({
      matcap: makeMatcapTexture(settings.matcapHi, settings.matcapMid, settings.matcapLo),
    });
    attachDissolve(mat, box);
    return mat;
  }

  if (settings.type === 'gradient') {
    const mat = new THREE.MeshStandardMaterial({
      roughness: settings.roughness,
      metalness: settings.metalness,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBottom = { value: new THREE.Color(settings.gradientBottom) };
      shader.uniforms.uTop = { value: new THREE.Color(settings.gradientTop) };
      shader.uniforms.uMinY = { value: box.min.y };
      shader.uniforms.uMaxY = { value: box.max.y };
      shader.vertexShader = 'varying float vGradY;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vGradY = position.y;',
      );
      shader.fragmentShader =
        'uniform vec3 uBottom; uniform vec3 uTop; uniform float uMinY; uniform float uMaxY;\nvarying float vGradY;\n' +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float gradT = clamp((vGradY - uMinY) / max(uMaxY - uMinY, 0.0001), 0.0, 1.0);
          diffuseColor.rgb = mix(uBottom, uTop, gradT);`,
        );
    };
    attachDissolve(mat, box);
    return mat;
  }

  const std = new THREE.MeshStandardMaterial({
    color: new THREE.Color(settings.color),
    roughness: settings.roughness,
    metalness: settings.metalness,
  });
  attachDissolve(std, box);
  return std;
}
