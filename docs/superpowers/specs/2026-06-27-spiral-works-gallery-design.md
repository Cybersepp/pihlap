# Spiral Works Gallery — Design

**Date:** 2026-06-27
**Status:** Approved design, pending implementation plan

## Summary

Replace the current "selected works" orbit cloud (`WorksReveal3D` — `.mov`
billboards spilling out of the folder icon into jittered orbital rings) with an
**endless upward spiral (helix) of work tiles winding around the centered
black-clay figure**.

(The figure is a **3D scan of Martin**, not a Buddha; the codebase's `Buddha*`
naming is a misnomer and is renamed to `Martin*` as a prerequisite of this work
— see "Prerequisite refactor" below.)

Scrolling winds the helix up-and-around the figure and snaps the nearest work to
front-and-center. The centered work pixel-dissolves from a black-and-white still
into a colored, looping video preview, with its title overlapping the media
(higher z, theyearofgreta.com style) and decoding in via a scramble-text
animation. Clicking the centered tile opens the existing `QuickTimeWindow` video
player unchanged.

## Goals

- Turn the works stage into a single legible gesture (scroll = travel
  around/up the figure) instead of a swarm to chase.
- A genuine WebGL gallery: GPU-driven B&W→color + pixel-dissolve reveal.
- Keep the figure as the fixed centerpiece; reinforce it with the existing
  "lit-up-on-focus" warm glow.
- Stay performant — especially on mobile — by keeping exactly one video alive.

## Non-goals (YAGNI)

- Free camera orbit during the gallery (scroll drives the helix, not the camera).
- Prefetching more than the focused clip (start with one shared video element).
- Changes to the video player (`QuickTimeWindow`) or the works data model.
- Decorative extras (scanlines/dither) — deferred; revisit after core lands.

## Decisions (from brainstorming)

- **Endlessness:** truly endless/looping — the 12 works recycle seamlessly as
  you wind upward.
- **Item visual:** B&W still by default; the one that snaps to center
  pixel-dissolves into a color, short-looping video; title overlaps it and
  scramble-decodes in.
- **Loop source:** per-work **mp4 `loopUrl`** (not GIF) — smaller, full color,
  pausable/seekable, mutable-autoplay, GPU-textur­able.
- **Navigation:** helix turns, **figure stays centered**; scroll snaps the next
  work to front-and-center. The gallery camera sits **directly behind the figure
  — the complete 180° opposite of the rest/start view** (today's pose only swings
  partway behind and off to the side).
- **Rendering:** **WebGL planes + custom shader** for media, **DOM (drei `Html`)**
  for titles.
- **Posters:** **pre-generated poster JPGs** (ffmpeg first-frame extraction).
- **Click:** opens the existing `QuickTimeWindow` via the current selection flow.

## Prerequisite refactor: Buddha → Martin

The model is a 3D scan of Martin; the `Buddha*` naming is a misnomer. As the
first step (its own commit), rename throughout `src/`:

- `src/three/Buddha.tsx` → `Martin.tsx`; `export function Buddha` → `Martin`.
- `src/three/BuddhaScene.tsx` → `MartinScene.tsx`; `BuddhaScene`/`BuddhaSceneProps`
  → `MartinScene`/`MartinSceneProps`; `<Buddha>` → `<Martin>`.
- Update importers and comments: `App.tsx`, `poses.ts`, `styles.css`,
  `TextPanel3D.tsx`, `Window3D.tsx`.

Pure rename, no behavior change; lands before the spiral work so the new files
reference `Martin*` from the start. (The runtime asset is already `pihlap.glb`;
the unused source `buddha-source.glb` can be left as-is.)

## Architecture

### The helix (endless, few live objects)

A vertical helix around the figure's center axis, driven by a continuous,
unbounded scroll value `s` (float). Each integer slot `k` sits at:

- angle `θ(k) = k · ANGLE_STEP`
- height `y(k) = k · HEIGHT_STEP`
- radius `R` from the figure's vertical axis

Endlessness with only 12 works: **all 12 tiles stay mounted** (cheap — only one
plays video at a time). Each work `i` is placed at the integer slot congruent to
`i (mod 12)` that is **nearest the current scroll `s`**; when scrolling carries a
tile far enough past center it wraps forward/back by 12 slots to its next
congruent slot. The wrap always happens far from center (behind Martin /
off-screen), so the recycle is invisible and the helix reads as endless. `R` is
tuned so the front-center tile sits between the camera and the figure, with the
figure visible around/behind it. (If the catalog ever grows large, switch to a
sliding `VISIBLE_SLOTS` window mapping `works[mod(k, N)]`; unnecessary at N=12.)

Tiles are billboarded to face the camera (à la current `OrbitItem.lookAt`) so
each reads head-on as it passes center.

### Scroll, snap & focus

- **Input** (`useSpiralScroll`): mouse wheel (desktop), vertical touch-drag
  (mobile), arrow/PageUp-Down/space keys → accumulate into `sTarget`.
- **Snap:** on input idle, `sTarget` eases to the nearest integer slot
  (scroll-snap carousel), so one work locks dead-center. `s` damps toward
  `sTarget` each frame (`THREE.MathUtils.damp`).
- **Focus value:** per tile, `focus ∈ [0,1]` from `smoothstep` of its distance
  from center (in slot units). Drives the shader uniform and selects which tile
  plays video.
- **Focused index** = `round(s)`. On change: rebind the shared video to the new
  tile (play from frame 0), re-run the title scramble.

### Tiles — WebGL plane + shader (`spiralShader`)

Each visible slot: a `PlaneGeometry` mesh with a custom `ShaderMaterial`.

- **Uniforms:** `uTex` (poster or video), `uFocus` (0→1), `uTime`, `uAspect`.
- **Fragment:**
  - Color reveal: `mix(luminance(tex), tex.rgb, uFocus)`.
  - Pixel-mosaic dissolve: quantize UVs to a grid whose cell size shrinks as
    `uFocus → 1` (blocky → sharp), so the reveal reads as pixelation resolving.
- **Texture strategy (the perf core):**
  - Non-focused tiles: static **poster `Texture`** (`/posters/<id>.jpg`),
    shown B&W via the shader (`uFocus≈0`).
  - Focused tile: a **single shared `<video>`** element + `THREE.VideoTexture`.
    On focus change, set `video.src = work.loopUrl`, `muted`, `loop`, `play()`,
    and bind that texture to the focused tile's material; the previously focused
    tile reverts to its poster. **Exactly one video alive at any time.**

### Title overlay — DOM (`WorkTitle` + `lib/scramble`)

Only the focused work renders a title: a drei `<Html>` overlay anchored to the
focused tile, positioned to **overlap the tile's top edge with a higher
z-index** (DOM composites over the canvas) for crisp web typography. On focus
change it runs a **scramble-decode** animation (random glyphs cycling, settling
column-by-column to the final string). Content: `work.title` (+ small
year/client). Non-focused tiles show no title.

### Figure, camera & click-through

- The black-clay figure (Martin) stays centered. The `gallery` camera pose
  becomes the **complete 180° opposite of the `rest` pose** — mirrored through
  the figure to sit **directly behind** it (rest `position [0,0,7]` → gallery
  `position [0,0,-7]`, same `target`). Today's pose (`[-4,2,-5]`) only swings
  partway behind and off to the side; this takes it all the way around so the
  gallery is the literal inverse of where the site opens. The figure is framed
  centered from this rear vantage, the helix winding around it with the focused
  tile snapping to center between camera and figure. `CameraRig` orbit is
  disabled while the gallery is open.
- The warm glow shell (wired to `broken`) stays: opening the gallery warms the
  figure, reinforcing the focused color reveal behind the front tile.
- **Click** the focused tile → reuse the existing flow
  (`onSelect`/`openWorkFromFinder`): set `focusWorld` to the tile's world
  position, fly the camera, open `QuickTimeWindow`. Player is unchanged.
- **Open/close (keep the current folder-spill):** reuse today's `WorksReveal3D`
  spill mechanic verbatim — each tile starts tiny and hidden **at the folder
  icon** and, after a per-tile stagger (`i × 0.05s`), eases out (damp) while
  scaling up. The **only** change is the destination: instead of a scattered
  orbit point, each tile flies to **its slot on the spiral**. On close it
  reverses back into the folder, file-by-file, exactly as now. (`from` = the
  folder-icon world position via `iconColumnLayout` / `ICON_ROWS_Y[0]`, as
  today; the per-tile `prog` 0→1 lerps folder→slot.)

## Components & files

**New**
- `src/three/WorksSpiral3D.tsx` — the helix: per-work slot placement + off-screen
  wrap, the folder-spill open/close (reused from `WorksReveal3D`), tile meshes,
  focus/video binding, click-through.
- `src/three/useSpiralScroll.ts` — input → `s`/`sTarget` with snap; wheel, touch,
  keys.
- `src/three/spiralShader.ts` — vertex/fragment + uniforms for desat + mosaic.
- `src/lib/scramble.ts` — scramble-decode text utility.
- `src/components/WorkTitle.tsx` — DOM title overlay using the scramble util.
- `scripts/gen-posters.sh` — ffmpeg first-frame extraction → `/public/posters/`.

**Modified**
- `src/three/MartinScene.tsx` (renamed from `BuddhaScene.tsx`) — swap
  `WorksReveal3D` → `WorksSpiral3D`; pass scroll/focus wiring.
- `src/three/poses.ts` — rear, 180°-opposite `gallery` pose (desktop + mobile);
  helix params (`R`, `ANGLE_STEP`, `HEIGHT_STEP`, `VISIBLE_SLOTS`).
- `src/App.tsx` — selection flow reused as-is; `gallery` target unchanged in
  shape (orbit disabled).

**Retired**
- `src/three/WorksReveal3D.tsx` (orbit cloud) — removed once the spiral lands.

**Content**
- `public/posters/<id>.jpg` — one B&W-ready first-frame poster per work,
  generated by `scripts/gen-posters.sh`.

## Data flow

```
useSpiralScroll (wheel/touch/keys) ──► sTarget ──(snap+damp)──► s
                                                                 │
WorksSpiral3D: for each work i (all 12 mounted):                 │
   k    = nearestCongruentSlot(i, s)   // wraps off-screen        │
   pos  = helix(k - s)  ; focus = smoothstep(dist(k,s))          │
   focusedIndex = round(s) ──► bind shared <video> ─► VideoTexture
   tile shader: uFocus → desat/mosaic reveal
   focused tile ──► WorkTitle (DOM, scramble) overlapping tile
   click focused tile ──► onSelect(work, world) ──► App ──► QuickTimeWindow
```

## Performance

- One `<video>` element/`VideoTexture` at a time; posters are small static JPGs.
- 12 lightweight plane meshes mounted; off-screen wrap (not mount/unmount) keeps
  draw count flat and avoids per-scroll allocation.
- Mobile: vertical drag scroll; existing `dpr` cap on the canvas; single video
  keeps decode cost flat. Poster textures sized modestly (e.g. ≤512px).

## Edge cases & risks

- **Rapid scrolling** past many works: never start playback mid-fling — only
  `play()` once `sTarget` settles on the focused index (debounce on snap).
- **Autoplay policy:** videos are `muted` (required for autoplay); first user
  gesture (the scroll/open) satisfies interaction gating.
- **DOM/WebGL layering:** the title is a non-occluded `Html` overlay above the
  canvas; verify it tracks the tile and doesn't fight pointer events with the
  click target.
- **Texture disposal:** dispose poster textures and the video texture on
  unmount / focus change to avoid GPU leaks (mirror `Buddha.tsx` discipline).
- **Reduced motion:** respect `prefers-reduced-motion` — shorten/skip scramble
  and mosaic transitions.

## Open items for the implementation plan

- Exact helix constants (`R`, `ANGLE_STEP`, `HEIGHT_STEP`, `VISIBLE_SLOTS`) and
  the front gallery pose — tuned visually during implementation.
- Whether non-focused tiles are pure stills or get a faint idle drift.
- Snap easing constants and scramble timing.
