# Martin Pihlap — Portfolio Site Spec

**For:** bolt.new initial generation, then continued local development
**Date:** 2026-05-22
**Status:** Draft for review

---

## 1. Concept

A single-page portfolio for video producer Martin Pihlap, rendered as a faithful Mac OS 9 desktop simulation. Visitors land on a virtual desktop, click folders and files like they're on a vintage Mac, and explore Martin's work through a Finder window and a QuickTime player. Contact and bio open in SimpleText windows. The whole thing should feel like a curated artifact, not a website — Martin is a creative person and the site itself is a creative statement.

A moody, painterly image of a figure with a long shadow sits in the bottom-right corner of the desktop, contrasting the cool platinum-grey OS chrome with something atmospheric and human.

---

## 2. Visual aesthetic

### Color
- **Desktop background:** flat Mac OS 9 platinum grey, `#CCCCCC` (no texture pattern — clean and intentional)
- **Window chrome:** classic OS 9 platinum gradient (titlebar with thin horizontal pinstripes)
- **Selection / highlight:** OS 9 default blue, `#3366CC` approx
- **Text:** black on platinum

### Typography
- **Chicago** — menu bar, window titles, system text. Free webfont equivalent: `ChiKareGo2` or `Chicago Flf`.
- **Geneva 9pt** — file names, descriptions, body content. Webfont: `Geneva` or fall back to a pixel-clean sans like `Silkscreen`.
- Both must render with their original pixel-sharp aliasing if possible — avoid smooth anti-aliasing where it would betray the era.

### Mac OS 9 chrome details
- Window title bars: 18-19px tall, pinstripe pattern, centered title in Chicago
- Close box (top-left of titlebar): small square with an X-mark, classic OS 9 style
- Window borders: 1px outline plus the platinum bevel
- Folder icons: classic manila/blue 3D folder, 32x32px
- File icons: appropriate to file type — SimpleText doc icon for `.txt`, QuickTime `.mov` icon for video files

### Source references
- Mac OS 9 Aqua-era platinum screenshots
- QuickTime Player 4/5 (the "brushed metal pill" controller)
- Real OS 9 folder + document icons

---

## 3. Desktop layout (default state on page load)

Annotated ASCII (treat as relative positions, not exact pixels):

```
+----------------------------------------------------------+
| [🍎  Finder  File  Edit  View  Special  Help        ]   |  ← menu bar, fixed top
+----------------------------------------------------------+
|                                                          |
|  [📁 Selected Works]                  [💿 Macintosh HD]   |  ← top-left folders,
|                                                           |     top-right HD
|  [📄 Contact.txt]                                         |
|                                                          |
|  [📄 Read Me]                                             |
|                                                          |
|                                                          |
|                                                          |
|                                                          |
|                                  +---------------+        |
|                                  |               |       |
|                                  |    girl       |       |
|                                  |    (with      |       |
|                                  |    soft       |       |
|                                  |    shadow)    |       |
|                                  +---------------+        |
+----------------------------------------------------------+
```

### Positions (responsive, expressed as approx anchors)
- **Menu bar:** fixed top, full width, ~22px tall
- **Selected Works folder:** ~5% from left, ~10% from top of viewport
- **Contact.txt:** below Selected Works, ~80px vertical gap
- **Read Me:** below Contact.txt, ~80px vertical gap
- **Macintosh HD:** ~5% from right, ~10% from top
- **Girl image:** anchored to bottom-right corner; the figure sits in the corner, her shadow extends ~30-40% across the bottom of the viewport. Subtle — should read as atmosphere, not a hero element

---

## 4. Components

### 4.1 Menu bar
- Fixed top. Items: `🍎  Finder  File  Edit  View  Special  Help`
- **Purely decorative** — no dropdowns, clicks do nothing. Hovering may change cursor but no action.

### 4.2 Desktop icons (clickable)
Each icon is a vertical stack: icon graphic (32x32) above a label (Geneva 9pt, black, centered, ~80px wide max with text-wrap).

- `Selected Works` — manila folder icon → opens Finder window
- `Contact.txt` — SimpleText document icon → opens SimpleText window with contact info
- `Read Me` — SimpleText document icon → opens SimpleText window with intro/manifesto
- `Macintosh HD` — disk icon → opens an OS 9 error dialog (Easter egg)

**Selection state:** single click highlights the icon (label flips to white-on-blue OS 9 selection style) AND opens the corresponding window. No "select then open" two-step — single click does both.

### 4.3 Finder window (opens when clicking Selected Works)
- Title bar reads: `Selected Works`
- Size: roughly 600px × 480px on desktop, fills viewport on mobile (see section 7)
- Position on desktop: centered
- View mode: **icon view**, 4 columns × 3 rows = 12 file slots
- No scroll if all 12 fit; if Pihlap adds more later, vertical scroll is fine
- Each file: QuickTime `.mov` icon + filename in Geneva 9pt (e.g., `mariposa.mov`)
- Single click on a `.mov` file → opens QuickTime Player window on top
- Close box closes the Finder window (returns to desktop)

### 4.4 QuickTime Player window (opens when clicking a `.mov` file)
- Modeled on **QuickTime Player 4/5** — the "brushed metal pill" era
- **Single window**, two stacked sections (player on top, metadata panel beneath, connected — not two separate windows)
- Layout (top to bottom):
  - Brushed-metal title bar with the work's filename, close box top-left
  - Video display area, ~480px × 270px (16:9 aspect ratio)
  - Brushed-metal pill controller: round play button, scrubber track, time display, volume knob
  - **Controller is cosmetic** — the loop in the display autoplays and loops; controller doesn't actually scrub. (Optional polish: play button visually toggles when clicked but loop continues.)
  - Below the player, a metadata panel inside the same window:
    - **Title** (filename minus extension), Chicago, larger
    - **Client / project** (if any), Geneva 9pt
    - **Year**, Geneva 9pt
    - **Location**, Geneva 9pt
    - **Description**, Geneva 9pt, 1-3 sentences
    - **Process**, Geneva 9pt, 1-3 sentences
    - **`Watch full piece →`** link, opens full video (Vimeo/YouTube/etc.) in new tab
- Opens centered, on top of Finder window (z-index above)
- Close box closes only the QuickTime window; Finder window with the 12 files remains underneath

### 4.5 SimpleText window (Contact.txt and Read Me)
- Smaller window, ~400px × 300px on desktop, fills viewport on mobile
- Title bar shows filename (`Contact.txt` or `Read Me`)
- White interior, Geneva 9pt text, left-aligned, ~12px padding
- Plain text only — no rich formatting
- Centered position, on top of desktop (no underlying Finder)
- Close box returns to desktop

### 4.6 Macintosh HD error dialog (Easter egg)
- Small OS 9 dialog box, ~320px × 120px, centered
- No title bar (just the alert-style chrome)
- Mac OS 9 yellow caution icon on the left
- Text: *"You cannot open this disk because Sharing Setup has not been configured."*
- `OK` button bottom-right — click dismisses the dialog
- Geneva 9pt for body, Chicago for the OK button

---

## 5. Interactions

### Click model
- **Single click everywhere**, on both desktop and mobile. No double-click anywhere.
- Hover state on desktop: cursor changes to pointer over interactive elements.

### Window stacking & lifecycle
- **General rule:** opening any new window first closes any currently open window, with one exception: QuickTime opens *on top of* Finder when launched from a `.mov` inside Finder.
- Hierarchy: Desktop → (Finder OR SimpleText OR HD dialog). QuickTime can stack one level above Finder.
- Closing QuickTime returns to the Finder window underneath (Finder stays open).
- Closing Finder, SimpleText, or the HD dialog returns to the bare desktop.
- Clicking a desktop icon while a window is already open: closes that window, then opens the new one.

### Windows are fixed-position
- All windows open at their predefined centered positions. Not draggable. (Can revisit dragging later as polish.)

### Mobile single-tap
- Same as desktop: single tap opens. No double-tap.

---

## 6. Content data model

### 6.1 Works (Selected Works folder)
12 entries. Each work has the following shape:

```ts
{
  id: string,              // slug, e.g. "mariposa"
  filename: string,        // e.g. "mariposa.mov"
  title: string,           // display title
  client?: string,         // optional client/project name
  year: number,            // e.g. 2024
  location: string,        // shooting location
  description: string,     // 1-3 sentences
  process: string,         // 1-3 sentences, Pihlap's role/method
  loopUrl: string,         // path or URL to the autoplay GIF/MP4 loop (no audio, ~5-10s, looping)
  fullPieceUrl: string,    // external URL to full video (Vimeo/YouTube/etc.)
}
```

- The 12 works should be stored in a single JSON or TS array, easy for Pihlap to edit.
- Loop file format: MP4 (silent, autoplay, loop) preferred over GIF for quality + file size. Browsers handle this well via `<video autoplay loop muted playsinline>`.

### 6.2 Contact.txt content
Plain text. To be provided by Pihlap. Likely:
```
Martin Pihlap
Video Producer

email:     [TBD]
phone:     [TBD]
instagram: [TBD]
vimeo:     [TBD]
based in:  [TBD]
```

### 6.3 Read Me content
Plain text. 3-5 sentence intro / creative manifesto, to be written by Pihlap. Spec placeholder:
```
[Pihlap's intro — who he is, what he makes, what he believes about video / story / process]
```

---

## 7. Mobile behavior

- **Breakpoint:** treat any viewport < 768px wide as mobile.
- **Desktop layout** (icons positioned on a virtual desktop) is preserved on mobile, scaled appropriately. Girl image still anchored bottom-right.
- **Windows on mobile open fullscreen** with OS 9 chrome preserved:
  - Title bar at top (with close box)
  - Content fills the rest of the viewport
  - The window completely covers the desktop while open
- Single-tap to open (same as desktop)
- Touch-friendly tap targets: icons should be at least 44×44px tap area (icon graphic can stay 32×32 visually, but the hit area extends).
- Video loops auto-play with `playsinline` attribute (required for iOS).
- The Finder window's 4×3 icon grid on mobile becomes a **3-column grid** (3 columns × 4 rows for 12 items), vertically scrollable inside the window if it exceeds viewport height.
- QuickTime on mobile: the window fills the viewport; the video display scales to viewport width while maintaining 16:9; the metadata panel sits beneath and is vertically scrollable inside the window.

---

## 8. Easter eggs

- **Macintosh HD click → OS 9 sharing-not-configured dialog** (described in 4.6). Only Easter egg in v1.
- Optional v2 polish (do not implement in initial bolt.new pass): hover on the 🍎 menu shows a tiny "About This Computer" tooltip; secret konami-code triggers a screen-shaking "kernel panic" sad-Mac. Skip for v1.

---

## 9. Tech stack recommendation for bolt.new

- **Framework:** React + Vite (fast, SPA-friendly, well-supported in bolt.new)
- **Styling:** Tailwind CSS for layout + a single global CSS file (`os9.css`) for the OS 9 chrome (pinstripe title bars, beveled buttons, dialog borders). Custom pixel-precise chrome is easier in CSS than in Tailwind utility classes.
- **State:** plain React state (`useState`) for tracking which window is open. No routing, no global state library needed.
- **Fonts:** load Chicago and Geneva webfonts (or close equivalents) via Google Fonts / a self-hosted `@font-face`.
- **No backend.** Works data lives in a static JSON/TS file. Read Me and Contact are static strings.

### File structure suggestion
```
src/
  App.tsx
  components/
    MenuBar.tsx
    DesktopIcon.tsx
    FinderWindow.tsx
    QuickTimeWindow.tsx
    SimpleTextWindow.tsx
    DialogBox.tsx
    GirlImage.tsx
  data/
    works.ts          // 12 work entries
    contact.ts        // contact info
    readme.ts         // intro text
  styles/
    os9.css           // chrome, fonts, pinstripes, buttons
    globals.css       // Tailwind base
public/
  assets/
    bg_extracted.png  // the girl image
    icons/            // folder, doc, HD, mov icons
    fonts/            // Chicago, Geneva webfonts
    loops/            // 12 MP4 loops
```

---

## 10. Assets needed

### Already have
- `bg_extracted.png` — the figure-with-shadow image (provided)

### To create / source
- Mac OS 9 folder icon (manila/blue 3D, 32×32 + 64×64)
- SimpleText document icon (32×32 + 64×64)
- QuickTime `.mov` file icon (32×32 + 64×64)
- Macintosh HD disk icon (32×32 + 64×64)
- Chicago webfont
- Geneva webfont
- OS 9 yellow caution-triangle icon (for the HD dialog)
- OS 9 pinstripe title bar texture (can be CSS-generated)

### To gather from Pihlap
- 12 MP4 loops (silent, ~5-10s, looping)
- 12 sets of metadata (title, client, year, location, description, process, full-piece URL)
- Contact info (email, phone, socials, location)
- Read Me text (3-5 sentence intro)

---

## 11. Open items for follow-up

These are deferred to a v2 / polish pass, not blockers for the bolt.new generation:

- Draggable windows (currently fixed-position; revisit if Pihlap wants it)
- Functional menu bar dropdowns (currently decorative)
- Konami-code / kernel-panic Easter egg
- "About This Computer" 🍎 menu tooltip
- Loading state / cursor (OS 9 spinning wristwatch on slow asset load)
- Boot screen ("Welcome to Mac OS" splash) before desktop fades in
- Audio: OS 9 startup chime when site loads (probably annoying — leave off)

---

## 12. Bolt.new prompt notes

When prompting bolt.new, paste sections 1-9 (concept through tech stack). Sections 10-12 are project-internal — bolt.new doesn't need to know about asset sourcing or v2 polish. The data files in section 6 can be stubbed with placeholder content for the initial generation; real content gets dropped in afterward.
