# 3D Buddha Scene — Phase 1 Design

**Date:** 2026-05-31
**Status:** Approved (Phase 1)

## Goal

Replace the static 2D portrait (`cropped_compressed.jpg`, "Martin") in the bottom-right
of the desktop with a **3D Buddha model**, rendered so that the site still reads as a
flat 2D Mac OS 9 desktop. When the user clicks **selected works**, the camera arcs
around the side and settles **behind** the Buddha, and the works panel is revealed in
that new view — delivering a "wow, it was 3D the whole time" moment.

The 2D illusion is essential: until the first camera move, nothing should hint that the
scene is three-dimensional.

## Core architecture: hybrid DOM + transparent 3D canvas

- The entire existing desktop UI (icons, `FinderWindow`, `QuickTimeWindow`,
  `SimpleTextWindow`) stays as **real HTML DOM, unchanged**. This keeps text crisp,
  keeps the Vimeo player fully native, and reuses all current window code.
- A new **full-screen transparent `<Canvas>`** sits **behind** the DOM (lower
  `z-index` than icons and windows). It contains **only** the Buddha, lighting, and a
  camera controller.
- The `<img>` for `cropped_compressed.jpg` is **removed entirely**. There is no PNG
  fallback anywhere in the experience.

## Stack additions

- **`@react-three/fiber`** — React renderer for three.js (declarative, fits the
  existing React architecture).
- **`@react-three/drei`** — `useGLTF` (model loading), `<Environment>` (lighting),
  `<CameraControls>` (smooth `setLookAt` camera transitions).

## New modules

- `src/three/BuddhaScene.tsx` — the `<Canvas>` host: lighting (`<Environment>` + key
  light), `<Suspense>` boundary, device-pixel-ratio clamp, and mounting of the camera
  controller. Renders nothing visible until the model has loaded (transparent fallback
  — no PNG).
- `src/three/Buddha.tsx` — loads the GLB via `useGLTF`, oriented to **face the user**
  at rest, styled to sit naturally against the muted desktop aesthetic. **Completely
  immobile** — no idle animation, no rotation — to preserve the 2D illusion.
- `src/three/useCameraChoreography.ts` — drives `CameraControls.setLookAt(...)` between
  named poses:
  - **`rest`** — Buddha framed in the bottom-right corner, matching the previous PNG
    placement; reads as a static 2D image.
  - **`behind`** — camera arced around the **right side** to look at the Buddha from
    behind, opening up the space where the works panel appears.

## State & interaction flow

- `App.tsx` derives a single camera pose (`rest` | `behind`) from the existing
  `windowState`. No new top-level state machine — the pose is a pure function of
  whether the Finder is the active window.
- Flow:
  1. Click **selected works** → camera smoothly arcs around the right side from `rest`
     to `behind` → on arrival, `FinderWindow` fades/slides in (existing DOM component).
  2. Open a work → `QuickTimeWindow` opens over the scene as today; Vimeo player is
     fully native.
  3. Close the Finder → camera eases back to `rest`; panels fade out.
- **Only "selected works" triggers the camera orbit.** `contact.txt` and `readme.txt`
  open exactly as they do today, with no camera movement — the orbit stays reserved for
  the works reveal.

## Asset handling & performance

- The GLB moves into `public/` and loads **lazily** behind a `<Suspense>` boundary.
- A **mesh-compression pass** (meshopt or Draco) reduces the ~8MB model to a
  mobile-friendly size as part of the build/asset prep.
- **Device-pixel-ratio is clamped** to cap fragment cost on high-density screens.
- The existing `isMobile` logic gates render quality (e.g. DPR ceiling, lighting
  detail) so phones stay smooth. There is **no PNG fallback** — low-end devices render
  the model at reduced quality rather than a 2D image.

## Out of scope (Phase 2, sketched extension point)

- Promoting the **text** panels (contact/readme) to true in-world `<Html transform>`
  elements for a deeper 3D feel.
- The Vimeo player **stays a DOM overlay permanently** — never rendered as a WebGL
  texture — to keep playback native and reliable, especially on mobile.
- The camera choreography from Phase 1 is unchanged in Phase 2; only *what is revealed*
  (DOM overlay vs in-world object) would change, so Phase 2 touches only the reveal
  layer, not the engine.

## Success criteria

- At load and at rest, the scene is visually indistinguishable from a 2D desktop with a
  figure in the corner.
- Clicking "selected works" produces a smooth camera arc to behind the Buddha, with the
  Finder revealed on arrival.
- Closing returns the camera to rest smoothly.
- Vimeo playback works natively on desktop and mobile.
- Runs smoothly on phones (no PNG fallback; model quality scales down instead).
