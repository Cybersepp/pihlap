import * as THREE from 'three';

// Material for a spiral tile. A single `uFocus` (0→1) uniform drives the whole
// reveal: the texture desaturates to B&W at rest and resolves to full color as it
// snaps to center, passing through a pixel-mosaic dissolve that peaks mid-transition
// (so the focused tile "pixelates into color" and back out). `uOpacity` fades tiles
// toward the off-screen wrap so the recycle is invisible.
//
// Edge cutoff: the ribbon is clipped to a visible window centered on the focus.
// Each fragment's position ALONG the ribbon (uPhase ± its share of uSpan) is tested
// against ±uCut, with a narrow uBand feather — so a tile crossing the cutoff wipes
// edge-first into full transparency at a fixed ribbon position on both sides, well
// before it reaches the screen corners.
//
// `uTex` starts as a B&W-ready poster / placeholder; the focused tile later swaps
// in a live VideoTexture (same uniform) once the real loop mp4s exist.
export function makeTileMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTex: { value: map },
      uFocus: { value: 0 },
      uOpacity: { value: 1 },
      uDim: { value: 1 }, // 1 = full brightness, < 1 darkens (spotlight other tiles)
      uPhase: { value: 0 }, // this tile's signed distance from center (ribbon steps)
      uSpan: { value: 1 }, // this tile's phase-width along the ribbon (SPIRAL.fill)
      uCut: { value: 100 }, // |position| beyond which the ribbon is transparent
      uBand: { value: 0.2 }, // width of the narrow fade at the cutoff
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      uniform float uFocus;
      uniform float uOpacity;
      uniform float uDim;
      uniform float uPhase;
      uniform float uSpan;
      uniform float uCut;
      uniform float uBand;
      varying vec2 vUv;

      void main() {
        // Mosaic amount peaks at mid-transition (uFocus = 0.5) and is ~0 at both
        // ends, so a settled tile — B&W or color — is always sharp.
        float pix = uFocus * (1.0 - uFocus) * 4.0;
        float cells = mix(280.0, 16.0, pix);
        vec2 uv = (floor(vUv * cells) + 0.5) / cells;

        vec4 tex = texture2D(uTex, uv);
        float g = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
        vec3 col = mix(vec3(g), tex.rgb, uFocus);

        // Position of THIS fragment along the ribbon (in steps from center): the
        // tile spans uPhase ± 0.5·uSpan; vUv.x maps left→right across that span.
        float pos = uPhase - (vUv.x - 0.5) * uSpan;
        // Visible window |pos| ≤ uCut with a narrow feather, so the ribbon wipes
        // edge-first into full transparency at a fixed position on both sides.
        float vis = 1.0 - smoothstep(uCut - uBand, uCut, abs(pos));

        gl_FragColor = vec4(col * uDim, tex.a * uOpacity * vis);
      }
    `,
  });
}

// Material for a tile's bezel (thickness shell). It carries no texture — a flat
// grey edge — but shares the front face's per-fragment along-ribbon CUTOFF so the
// shell wipes into transparency at the same position; otherwise the grey back of
// the tile peeks past the clipped video around the cutoff. `aVx` is each vertex's
// width coordinate (−0.5..0.5), baked by makeConformGeoms in the bezel's vertex
// order, from which the shader recovers the fragment's ribbon position like the
// front face does from vUv.x.
export function makeBezelMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0 },
      uPhase: { value: 0 },
      uSpan: { value: 1 },
      uCut: { value: 100 },
      uBand: { value: 0.2 },
    },
    vertexShader: /* glsl */ `
      attribute float aVx;
      varying float vVx;
      void main() {
        vVx = aVx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPhase;
      uniform float uSpan;
      uniform float uCut;
      uniform float uBand;
      varying float vVx;
      void main() {
        float pos = uPhase - vVx * uSpan;
        float vis = 1.0 - smoothstep(uCut - uBand, uCut, abs(pos));
        gl_FragColor = vec4(uColor, uOpacity * vis);
      }
    `,
  });
}
