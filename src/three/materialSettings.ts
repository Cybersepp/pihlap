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
  color: '#b9764a',
  roughness: 0.9,
  metalness: 0,
  gradientBottom: '#7c3f2a',
  gradientTop: '#e9c8a4',
  matcapHi: '#f3dcc0',
  matcapMid: '#cd8a5f',
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
  h.addColorStop(0, 'rgba(255,248,235,0.85)');
  h.addColorStop(1, 'rgba(255,248,235,0)');
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Build the model's base material from the settings. `box` is the model's local
// bounding box (used to normalize the vertical gradient).
export function buildModelMaterial(settings: MaterialSettings, box: THREE.Box3): THREE.Material {
  if (settings.type === 'matcap') {
    return new THREE.MeshMatcapMaterial({
      matcap: makeMatcapTexture(settings.matcapHi, settings.matcapMid, settings.matcapLo),
    });
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
    return mat;
  }

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(settings.color),
    roughness: settings.roughness,
    metalness: settings.metalness,
  });
}
