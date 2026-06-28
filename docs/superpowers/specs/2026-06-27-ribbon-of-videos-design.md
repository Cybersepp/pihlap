# Ribbon-of-videos — design

**Date:** 2026-06-27
**Status:** Approved, ready for implementation plan
**Touches:** `src/three/WorksSpiral3D.tsx`, `src/three/poses.ts`

## Goal

Turn the works spiral from a stack of camera-facing billboards into a **ribbon of
videos**: the tiles keep winding up the same helix, but instead of every tile
pivoting to face the camera, each one is oriented to the ribbon's own path —
banking and twisting as the band climbs and curves away to the sides. The videos
*are* the ribbon.

Today (`WorksSpiral3D.tsx`) every tile calls `g.lookAt(camera)` each frame, so it
always faces the viewer. That single call is what hides the spiral's surface.
Replacing it with a path-derived orientation is the heart of this change.

## Decisions (from brainstorming)

- **Front faces you naturally.** The ribbon surface faces radially outward from
  the helix axis. At the front-and-centre slot (phase 0) the outward normal points
  straight at the gallery camera, so the focused video reads square-on for
  watching/clicking. Tiles to the sides turn away; the back is empty (tiles fade
  out by ~half a turn, see `SPIRAL.fadeStart/fadeEnd`).
- **Bank with the climb.** Tiles tilt/roll to follow the rising, curving path —
  the ribbon reads as one continuous twisting surface. Bank strength scales with
  the helix rise and stays tunable live.
- **Gaps, not edge-to-edge.** Tiles are deliberately spaced so there's a clean gap
  between each. The ribbon *feel* comes from the shared banked orientation along
  the path; the gaps make the curve more legible (you read it in the rhythm of the
  panels rather than as a solid wall). This sidesteps the seam/staircase problem
  entirely — with gaps, neighbours never need to meet.
- **Video footage is never distorted.** A tile is always a flat, undistorted
  rectangle. Only its orientation in space changes.

## Core change: ribbon frame replaces billboard

Add a `ribbonFrame(phase)` helper in `poses.ts`, next to `spiralPosition`, that
returns the tile's orientation as a quaternion (or the three basis vectors the
caller turns into one). The frame is built from:

- **Along-path axis (tile local +X / width):** the helix tangent
  `T = d/dphase spiralPosition(phase)`. Because the helix rises, `T` tilts upward —
  this upward tilt is what produces the bank/roll.
- **Surface normal (tile local +Z):** radially outward from the central axis,
  made perpendicular to `T` (Gram-Schmidt: `outward - (outward·T)·T`, normalized).
  At phase 0 this is `[0,0,-1]` (toward the gallery camera at -Z).
- **Cross axis (tile local +Y / up):** `normal × tangent`, normalized.

These three orthonormal vectors form a rotation matrix → quaternion applied to the
tile group. This **replaces** the `g.lookAt(state.camera.position)` line in
`SpiralItem`'s `useFrame`.

`spiralPosition` is unchanged — positions stay exactly as they are; only
orientation changes. Keeping both helpers side by side in `poses.ts` keeps the
geometry in one place.

### Tunable bank

The bank strength is a function of the rise (`SPIRAL.heightStep`) relative to the
horizontal step (`SPIRAL.radius * SPIRAL.angleStep`). At current values
(`R·angleStep ≈ 1.47`, rise `0.45`) the tangent leans ~17° off horizontal, which
is the natural bank. We will expose a way to scale this (e.g. a `SPIRAL.bank`
multiplier on the tangent's vertical component before building the frame, default
`1`) so it can be dialled stronger/gentler after seeing it live without changing
tile positions.

## Spacing / gaps

Introduce a deliberate gap between tiles. Current tile width (`1.5`) is almost
exactly the per-step tangent length (`~1.53`), i.e. nearly touching. To create
gaps, reduce the tile size relative to the step (the simplest knob), keeping the
helix step the same so positions and the focus mechanic are untouched. Gap size
stays tunable (driven by `SPIRAL.tile` width vs. the step length). Exact value to
be dialled in live; the requirement is a clean, visible gap between every panel.

## Knock-on pieces (kept working, minimal change)

1. **Focus / watching / open.** The front tile's outward normal points at the
   camera, matching the old billboard facing. So the color reveal (`uFocus`),
   scrambling title, click-to-open raycast, the open flourish (grow toward camera +
   `FOCUS_TILE_YAW`), and the focus/detail camera poses
   (`getFocusPoseFromWorld` / `getDetailPoseFromWorld`) all keep working unchanged.
   No change required here — verify visually after the orientation swap.

2. **Title legibility.** `WorkTitle` is an `<Html>` child of the tile group, so it
   inherits the tile's bank and would tilt with it. Counter-roll the title's
   container (or its local rotation) so the text stays level/horizontal and
   readable while the tile itself is banked. Only the focused (front) tile shows a
   title, where the bank is mild, so this is a small correction.

3. **Back of the ribbon.** Tiles fade to zero opacity by `|phase|` 3–5 (within
   ~half a turn), so video backsides (material is `THREE.FrontSide`) are never
   visible. No change needed; re-check after spacing changes in case the fade
   window should be retuned.

## Out of scope (YAGNI)

- No double-sided material / backface treatment (back is empty).
- No change to scroll/snap input, the shared video texture, the poster-frame
  capture, or the spill-in cascade.
- No per-work loop videos (still the single shared placeholder loop).
- No change to `spiralPosition` math or the helix parameters' meaning.

## Testing / verification

This is a visual, interaction-driven change in a Three.js/R3F scene; verify by
running `npm run dev` and checking:

- The ribbon winds up with videos banking along the path, curving away to the
  sides — reads as a twisting ribbon, not flat cards.
- Clean gaps between panels.
- The front video faces you square-on; scroll snaps the nearest work to front; it
  reveals into colour with a level, readable title.
- Click-to-open still opens the centred video; the open flourish and detail
  reframe still look right.
- No visible video backsides at the rear of the helix.
