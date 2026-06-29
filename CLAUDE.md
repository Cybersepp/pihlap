# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page portfolio for video producer **Martin Pihlap** (martinpihlap.com). It renders as one full-screen WebGL scene: a 3D scan of Martin floats at rest like a 2D portrait, and "breaking the fourth wall" (opening a desktop icon) swings the camera *behind* him into a 3D gallery where his works wind up an endless helix. The Mac-OS-9 desktop framing (folder/finder/quicktime icons, platinum windows) survives only as a thin metaphor over that 3D core.

> `spec.md` is the **original bolt.new brief** — a literal Mac OS 9 desktop simulation. It is historical: the project has since become the WebGL gallery described here. Treat `spec.md` as background intent, not current architecture.

## Commands

```bash
npm run dev        # Vite dev server — also mounts the live dev tuning panels (see below)
npm run build      # production build to dist/
npm run preview    # serve the built bundle
npm run lint       # eslint over the repo
npm run typecheck  # tsc --noEmit -p tsconfig.app.json
```

There is **no test framework** in this project — don't look for or invent one. Verification is visual: `npm run dev` and watch the scene.

Deploy target is **GitHub Pages** on the custom domain in `public/CNAME` (`public/.nojekyll` disables Jekyll). Vite `base` is `/`.

## Architecture

### Two stacked layers
1. **WebGL** (`src/three/MartinScene.tsx`) — a single full-screen `<Canvas>` behind the DOM (`.scene-canvas`, z-index below windows). Contains the Martin model, three-point lighting, the camera rig, the world-anchored desktop icons (drei `<Html transform>`), and whichever 3D panel is open (the works spiral or a text panel).
2. **DOM overlays** (`src/components/`) — the video player (`QuickTimeWindow`), detail chrome (`WorkDetailOverlay`), text-window content, plus the sky/studio backdrops. The WebGL canvas is `pointer-events:none`; clicks on 3D tiles are handled by manual raycasting from window-level pointer listeners (see `WorksSpiral3D`).

`MartinScene` is **lazy-loaded** in `App.tsx` (three.js + drei ≈ 900KB) so the DOM paints before the WebGL chunk streams in.

### State machine — `src/App.tsx`
`App` is the single source of truth. A `WindowState` union (`none | finder | detail | quicktime | contact | readme`) drives *everything downstream* — the camera target, which 3D panel mounts, backdrop crossfade, dimming. Key flows:
- Clicking an icon → `finder` (works spiral) / `contact` / `readme`. Re-clicking the selected icon toggles closed.
- Clicking a centered spiral tile → `detail` (tile reframed left + info panel). Hitting play → `quicktime` (DOM video). Both share **one camera pose**, so play doesn't move the camera.
- Esc steps back one level; closing steps back, never straight out.
- `worksPhase` (`open | closing | closed`) is tracked **separately** from `windowState` so the spiral's files can fly *back into* the folder on close before unmounting.
- The DOM video only mounts once `settledKey` confirms the camera has actually arrived at the focused tile (`videoVisible`) — never during the fly-in.

### Camera choreography — `src/three/poses.ts` (read this first)
This is the heart of the project. It holds **all tunable layout + choreography constants** as mutable objects: `POSES`/`POSES_MOBILE` (named camera poses), `SPIRAL` (the helix ribbon math), `DETAIL` (open-video framing), `GALLERY`/`CLOUD`/`ORBIT` (alternate/legacy layouts), and the icon-column layout math. It also exports the pure functions that place and orient ribbon tiles (`spiralPosition`, `ribbonFrame`, `ribbonFacing`, `ribbonUp`) and derive the focus/detail camera poses from a clicked tile's world position.

`CameraRig.tsx` drives the camera via the `camera-controls` library: every `CameraTarget` change calls `setLookAt(..., animate)`. The controller is kept **enabled** even when gestures are off, because drei only runs its `update()` (which animates `setLookAt` transitions) while enabled. `onSettle(key|null)` reports `null` the instant a move starts and the key once it settles — UI gates on this rather than trusting a stale destination.

### The works spiral — `src/three/WorksSpiral3D.tsx`
The gallery is an endless upward helix. A continuous scroll value `s` (driven by wheel/drag/arrows) winds it; each work sits at the integer slot ≡ its index (mod N) nearest `s`, wrapping off-screen so it reads as infinite. `phase = slot - s` is a tile's signed distance from front-and-center.
- Tiles **conform** to the ribbon surface per-frame (vertices re-placed, not rigid planes) so neighbours' edges line up.
- **One shared `<video>`/`VideoTexture`** is swapped to the centered work's loop and played; every other tile samples its own static **poster** (`loops/<id>.jpg`). So it's a single video decode regardless of tile count.
- Asset convention: each work has `loops/<id>.mp4` (silent loop) + `loops/<id>.jpg` (poster). Missing loops fall back to a placeholder.

### Data — `src/data/`
`works.ts` is the editable array of `Work` entries (id, title, metadata, `loopUrl`, `fullPieceUrl`). `content.ts` holds the readme text. All asset URLs go through the `publicAsset()` / `import.meta.env.BASE_URL` prefix — **never hardcode a leading `/`** for public assets, or the base-path-relative deploy breaks.

### Mobile — `src/lib/device.ts`
`shouldUseMobileLayout()` (width + touch + height heuristics) flips `App` into mobile mode, selecting `POSES_MOBILE` and adjusting the DOM windows. Re-checked on resize / visualViewport changes.

## Dev-only live tuning panels

In `npm run dev` only (`import.meta.env.DEV`), tuning panels mount: `RibbonControls.tsx` (spiral + detail + camera) and a material panel for the figure. Their sliders **mutate the shared `SPIRAL` / `DETAIL` / `materialSettings` objects in place** — because the render loop reads those objects fresh every frame, edits apply instantly with no rebuild. A **"Copy"** button puts the current values on the clipboard as a snippet to paste back into `poses.ts` / `materialSettings.ts` once a look is dialled in. This is the intended workflow for adjusting any layout/choreography constant: tune live, then paste the values into source.

The `liveCamera.ts` module is the bridge that lets the DOM tuning panel re-issue camera poses through the in-canvas `CameraControls` instance.

## Conventions worth knowing
- Per-frame easing uses `THREE.MathUtils.damp` (framerate-independent) rather than fixed lerps; `dt` is clamped (`Math.min(dt, 0.05)`) to survive tab-stalls.
- Scratch `THREE.Vector3`/`Quaternion`/`Matrix4` objects are module-level singletons reused across frames (see the `_`-prefixed scratch vars in `poses.ts` and `WorksSpiral3D.tsx`) — don't allocate in the render loop.
- Three.js materials/geometries/textures are explicitly `dispose()`d in effect cleanups; preserve this when editing the 3D layer.
- The Martin GLB ships **without vertex normals**; `Martin.tsx` computes them so the matcap samples identically across GPUs. Don't remove that.
