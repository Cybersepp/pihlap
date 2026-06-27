import * as THREE from 'three';

// Material for a spiral tile. A single `uFocus` (0→1) uniform drives the whole
// reveal: the texture desaturates to B&W at rest and resolves to full color as it
// snaps to center, passing through a pixel-mosaic dissolve that peaks mid-transition
// (so the focused tile "pixelates into color" and back out). `uOpacity` fades tiles
// toward the off-screen wrap so the recycle is invisible.
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

        gl_FragColor = vec4(col * uDim, tex.a * uOpacity);
      }
    `,
  });
}
