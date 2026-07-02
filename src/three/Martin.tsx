import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { modelRestWorldSize, setModelFeetRatio, MODEL_ROTATION, MODEL } from './poses';
import {
  MaterialSettings,
  DEFAULT_MATERIAL_SETTINGS,
  buildModelMaterial,
  DissolveUniforms,
  DISSOLVE,
  GLITCH,
  registerDissolveReplay,
  registerGlitchTest,
} from './materialSettings';

const MODEL_URL = `${import.meta.env.BASE_URL}pihlap.glb`;

// The figure — a 3D scan of Martin. Its base material comes from `settings`
// (matcap clay by default, but live-swappable via the dev panel). Otherwise it's
// completely immobile, so at rest the scene reads as a flat 2D image.
// How dark the figure sinks (matcap color multiplier) when a work is selected.
const DIM_LEVEL = 0.4;

// Parked value once the intro dissolve completes: high enough that no fragment is
// ever discarded and the edge glow has fully faded. The dissolve itself (speed,
// blockiness, glow, …) is tuned live via the DISSOLVE knobs.
const REVEAL_DONE = 10;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Martin({
  isMobile = false,
  dimmed = false,
  settings = DEFAULT_MATERIAL_SETTINGS,
  onReady,
}: {
  isMobile?: boolean;
  /** A work detail/video is open — sink the figure into the background. */
  dimmed?: boolean;
  settings?: MaterialSettings;
  /** Fired once the GLB has resolved and the figure has mounted (intro hand-off). */
  onReady?: () => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height || 1;

  // useGLTF suspended until the GLB resolved, so reaching this mount means the
  // figure is ready — tell the intro it can settle behind him.
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  // Let the dev panel re-trigger the intro dissolve to preview tuning changes.
  useEffect(() => registerDissolveReplay(() => (reveal.current = 0)), []);
  // Dev panel can force an idle-glitch burst instead of waiting for the interval.
  useEffect(() => registerGlitchTest(() => (glitch.current.force = true)), []);

  const groupRef = useRef<THREE.Group>(null);
  const reveal = useRef(0);
  // The intro dissolve runs ONCE. A later resize re-measures bounds but must not
  // rewind `reveal`, or the materialize replays every time the viewport changes.
  const primed = useRef(false);
  // Inner (rotation) group — its z gets a subtle sway on top of MODEL_ROTATION for
  // the idle float. `clock` accumulates (clamped) time to drive the hover sines.
  const rotRef = useRef<THREE.Group>(null);
  const clock = useRef(0);
  // Idle-glitch scheduler: `next`/`until` are absolute times on `clock`; `seed`
  // reshuffles which voxels blink each stutter; `reseedAt` paces the stutter;
  // `force` fires a burst immediately (dev test button).
  const glitch = useRef({ next: 4, until: 0, reseedAt: 0, seed: 0, force: false });

  // Measure the model's intrinsic size ONCE. setFromObject reads world matrices,
  // so re-measuring after <Center scale> + MODEL_ROTATION are applied folds the
  // current scale back into maxDim — a feedback loop that made the figure flip
  // between too-big and too-small on every resize. Keyed on [scene] only, so the
  // measurement always reflects the untransformed model.
  const { maxDim, box } = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const meshSize = b.getSize(new THREE.Vector3());
    return { maxDim: Math.max(meshSize.x, meshSize.y, meshSize.z) || 1, box: b };
  }, [scene]);

  // Rest scale follows the viewport (recomputed on resize) but divides the stable
  // intrinsic maxDim, so it can never feed back on itself.
  const scale = modelRestWorldSize(aspect, isMobile) / maxDim;

  // Base material is rebuilt and reassigned live whenever the dev settings change.
  // Disposing the previous one keeps repeated tweaking from leaking GPU resources.
  const prevBase = useRef<THREE.Material | null>(null);
  useMemo(() => {
    const base = buildModelMaterial(settings, box);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        // The source GLB ships without a NORMAL attribute. Without normals the
        // matcap lookup coordinate is undefined (NaN), and different GPUs resolve
        // that differently — desktop sampled the black rim, phones sampled the
        // light center, so the figure's color/texture diverged by device. Compute
        // smooth normals so the matcap is sampled identically everywhere.
        if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
        mesh.material = base;
      }
    });
    // Seed the freshly built material's dissolve at the CURRENT progress: 0 at a
    // real intro (hidden, frame loop materializes it), done if reduced-motion or
    // the reveal already finished (a live dev rebuild mustn't re-dissolve him).
    const uni = base.userData.dissolve as DissolveUniforms | undefined;
    if (uni) {
      uni.uDReveal.value =
        prefersReducedMotion || reveal.current >= 1 ? REVEAL_DONE : easeOutCubic(reveal.current);
    }
    const prev = prevBase.current as THREE.MeshMatcapMaterial | null;
    if (prev && prev !== base) {
      prev.matcap?.dispose?.();
      prev.dispose();
    }
    prevBase.current = base;
  }, [scene, box, settings]);

  // Once mounted/centered, publish the figure's feet as a fraction of its rest
  // world size, so the icon row can sit a fixed gap below his feet and scale with
  // him. Measured with the group still at origin (hover hasn't run yet), so it's
  // the true resting bottom. Also prime the dissolve ONCE (hidden at a real intro,
  // done under reduced-motion); re-measures on resize must not rewind `reveal`.
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(g);
    const worldSize = modelRestWorldSize(aspect, isMobile);
    if (worldSize > 0) setModelFeetRatio(b.min.y / worldSize);
    if (!primed.current) {
      primed.current = true;
      reveal.current = prefersReducedMotion ? 1 : 0;
    }
  }, [scale, box, aspect, isMobile]);

  // Eased dim that tints the base matcap darker when a work is open (matcap
  // ignores scene lights, so we dim via the material color).
  const dim = useRef(1);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    dim.current = THREE.MathUtils.damp(dim.current, dimmed ? DIM_LEVEL : 1, 4, d);
    const base = prevBase.current as THREE.MeshMatcapMaterial | null;
    base?.color?.setScalar(dim.current);

    // Idle hover — the figure floats gently in place (a seated pose in empty space).
    // A slow vertical bob on the whole figure plus a subtle out-of-phase tilt sway
    // sells the float without reading as a canned animation. Read MODEL fresh so the
    // tuning panel applies live. clock accumulates clamped dt (framerate-independent).
    clock.current += d;
    const t = clock.current;
    groupRef.current?.position.setY(Math.sin(t * MODEL.hoverSpeed) * MODEL.hoverAmplitude);
    if (rotRef.current) {
      rotRef.current.rotation.y = MODEL.restYaw;
      rotRef.current.rotation.z =
        MODEL_ROTATION[2] + Math.sin(t * MODEL.hoverSpeed * 0.7) * MODEL.swayAmplitude;
    }

    const uni = base?.userData?.dissolve as DissolveUniforms | undefined;
    if (uni) {
      // scale/pixel knobs are cells-over-height, so divide by the figure's local
      // height to keep them scale-independent.
      const sizeY = box.max.y - box.min.y || 1;
      if (reveal.current < 1) {
        // Push the live DISSOLVE knobs into the active material so panel edits (and
        // a replay) are visible immediately.
        uni.uDScale.value = DISSOLVE.scale / sizeY;
        uni.uDPixel.value = DISSOLVE.pixel / sizeY;
        uni.uDGradBias.value = DISSOLVE.gradBias;
        uni.uDBlocky.value = DISSOLVE.blocky;
        uni.uDEdge.value = DISSOLVE.edge;
        uni.uDEdgeColor.value.setRGB(DISSOLVE.glowR, DISSOLVE.glowG, DISSOLVE.glowB);

        reveal.current = Math.min(1, reveal.current + d / (DISSOLVE.durationMs / 1000));
        // Push slightly past the max threshold so the last flecks (and the trailing
        // edge glow) clear cleanly at the end of the sweep.
        uni.uDReveal.value = easeOutCubic(reveal.current) * (1 + uni.uDEdge.value);
      } else {
        uni.uDReveal.value = REVEAL_DONE;
      }

      // Occasional idle glitch — only once settled, and paused while a work is open
      // (dimmed) so the effect stays a "resting transmission" tic.
      const gs = glitch.current;
      if (reveal.current >= 1 && !dimmed) {
        const t = clock.current;
        if (gs.force || t >= gs.next) {
          gs.until = t + GLITCH.burst;
          gs.next = t + GLITCH.burst + GLITCH.minGap + Math.random() * (GLITCH.maxGap - GLITCH.minGap);
          gs.reseedAt = 0;
          gs.force = false;
        }
        if (t < gs.until) {
          // Re-pick affected cells a few times mid-burst so it stutters, and strobe
          // the amplitude per frame for the flicker.
          if (t >= gs.reseedAt) {
            gs.seed = Math.random() * 1000;
            gs.reseedAt = t + 0.03 + Math.random() * 0.05;
          }
          uni.uGlitch.value = 0.6 + Math.random() * 0.4;
          uni.uGlitchSeed.value = gs.seed;
        } else {
          uni.uGlitch.value = 0;
        }
        uni.uGlitchAmt.value = GLITCH.amount;
        uni.uGlitchGlow.value = GLITCH.glow;
        uni.uGlitchPixel.value = GLITCH.pixel / sizeY;
      } else {
        uni.uGlitch.value = 0;
        // Hold the next burst off until the figure has been settled a beat.
        gs.next = clock.current + GLITCH.minGap;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={rotRef} rotation={MODEL_ROTATION}>
        <Center scale={scale}>
          <primitive object={scene} />
        </Center>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
