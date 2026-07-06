// three.js-free material settings + dev-panel bridges.
//
// Split out of materialSettings.ts (which needs three to actually build the
// materials) so that App's initial chunk can read DEFAULT_MATERIAL_SETTINGS and
// the dev panel can read/mutate the tuning knobs without pulling three.js in — the
// three-backed builders load only with the lazy scene.
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
