import { useReducer, useState } from 'react';
import {
  POSES,
  SPIRAL,
  DETAIL,
  GLOW,
  MODEL,
  TEXT_PANEL,
  FOCUS_SMOOTH_TIME,
  getLastDetailWorld,
  getDetailPoseFromWorld,
  notifyTextPanelChange,
  notifyIconLayoutChange,
} from '../three/poses';
import { applyPose } from '../three/liveCamera';
import { DISSOLVE, GLITCH, replayDissolve, triggerGlitch } from '../three/materialSettings';
import { getViewportSize } from '../lib/device';

// A dev-only live tuning panel for the works ribbon. Every control mutates the
// shared SPIRAL object in place; because WorksSpiral3D reads SPIRAL fresh every
// frame (the tiles re-conform to the surface each frame), edits apply instantly
// with no rebuild. "Copy" puts the current values on the clipboard as a snippet
// to paste back into poses.ts once a look is dialled in.

interface Ctl {
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
}

const num = (key: keyof typeof SPIRAL, min: number, max: number, step: number, label?: string): Ctl => ({
  label: label ?? String(key),
  min,
  max,
  step,
  get: () => SPIRAL[key] as number,
  set: (v) => {
    (SPIRAL as Record<string, unknown>)[key] = v;
  },
});

const CONTROLS: Ctl[] = [
  num('spread', 0.3, 4, 0.05, 'spread (sideways)'),
  num('depth', -5, 5, 0.05, 'depth (arch bulge)'),
  num('archWidth', 0.4, 8, 0.05, 'archWidth (arch span)'),
  num('heightStep', -1, 1.5, 0.01, 'heightStep (rise)'),
  num('twist', -0.6, 0.6, 0.01, 'twist (bank)'),
  num('fill', 0.3, 1, 0.01, 'fill (gap)'),
  num('curve', -2, 2, 0.05, 'curve (panel bow)'),
  num('thickness', 0, 0.3, 0.005, 'thickness (edge)'),
  num('bezel', 0, 1, 0.01, 'bezel (edge grey)'),
  num('fadeStart', 0, 12, 0.5, 'fadeStart'),
  num('fadeEnd', 1, 14, 0.5, 'fadeEnd'),
  num('cutoff', 0.3, 6, 0.05, 'cutoff (window)'),
  num('cutoffFade', 0.02, 1, 0.01, 'cutoffFade (feather)'),
  num('focusRange', 0.1, 2, 0.05, 'focusRange'),
  {
    label: 'tileHeight',
    min: 0.4,
    max: 1.6,
    step: 0.02,
    get: () => SPIRAL.tile[1],
    set: (v) => {
      SPIRAL.tile[1] = v;
    },
  },
];

// The gallery view's resting camera position (where "selected works" settles).
// Editing any axis re-issues the gallery pose live through the camera bridge.
const camPos = (axis: 0 | 1 | 2, min: number, max: number, label: string): Ctl => ({
  label,
  min,
  max,
  step: 0.05,
  get: () => POSES.gallery.position[axis],
  set: (v) => {
    POSES.gallery.position[axis] = v;
    applyPose(POSES.gallery);
  },
});

const CAMERA_CONTROLS: Ctl[] = [
  camPos(0, -4, 4, 'camX'),
  camPos(1, -4, 4, 'camY'),
  camPos(2, -14, 14, 'camZ'),
];

// The open-video detail view. tileYaw/grow/forward shape the tile (read every
// frame by WorksSpiral3D, so they apply instantly); distance/pan/panY/yawFollow
// only matter at click-time, so every edit re-issues the detail pose live from
// the last focused tile (no-op until a video has been opened once this session).
const reapplyDetail = (): void => {
  const w = getLastDetailWorld();
  if (!w) return;
  const { width, height } = getViewportSize();
  applyPose(getDetailPoseFromWorld(w, width, height), FOCUS_SMOOTH_TIME);
};

const detail = (key: keyof typeof DETAIL, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => DETAIL[key],
  set: (v) => {
    DETAIL[key] = v;
    reapplyDetail();
  },
});

// Tile-shape fields read every frame by WorksSpiral3D — they apply instantly with
// no pose re-issue, so plain mutation is enough (no reapplyDetail).
const detailLive = (key: keyof typeof DETAIL, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => DETAIL[key],
  set: (v) => {
    DETAIL[key] = v;
  },
});

const DETAIL_CONTROLS: Ctl[] = [
  detailLive('offsetX', -5, 5, 0.05, 'tileX (left/right)'),
  detailLive('offsetY', -4, 4, 0.05, 'tileY (up/down)'),
  detail('pan', -4, 4, 0.05, 'pan nudge (left/right)'),
  detail('panY', -4, 4, 0.05, 'panY nudge (up/down)'),
  detail('distance', -5, 5, 0.1, 'distance nudge'),
  detailLive('grow', 0, 3, 0.05, 'grow (tile size)'),
  detailLive('forward', 0, 2, 0.05, 'forward (toward cam)'),
  detailLive('bow', 0, 2.5, 0.05, 'bow (tile arch)'),
  detail('tileYaw', -1.2, 1.2, 0.02, 'tileYaw (turn)'),
  detailLive('tilePitch', -1.2, 1.2, 0.02, 'tilePitch (tip)'),
  detailLive('tileRoll', -1.2, 1.2, 0.02, 'tileRoll (spin)'),
  detail('yawFollow', 0, 1, 0.02, 'yawFollow'),
];

// Gallery glow (halo behind centered tile + overhead wash). Every field is read
// fresh each frame by CenterGlow, so plain mutation applies live.
const glow = (key: keyof typeof GLOW, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => GLOW[key] as number,
  set: (v) => {
    (GLOW as Record<string, unknown>)[key] = v;
  },
});

const GLOW_CONTROLS: Ctl[] = [
  glow('haloOpacity', 0, 1.5, 0.01, 'haloOpacity'),
  glow('haloSize', 1, 12, 0.1, 'haloSize'),
  glow('rayOpacity', 0, 1.5, 0.01, 'rayOpacity'),
  glow('rayLength', 1, 12, 0.1, 'rayLength'),
  glow('rayWidth', 0.3, 5, 0.05, 'rayWidth'),
  glow('rayAngle', 0, 1.4, 0.02, 'rayAngle'),
];

// World position the ribbon arches around. Decoupled from the camera target, so
// moving it slides the whole ribbon within the frame. WorksSpiral3D reads
// SPIRAL.center every frame, so edits apply instantly with no camera re-aim.
const ribbonPos = (axis: 0 | 1 | 2, min: number, max: number, label: string): Ctl => ({
  label,
  min,
  max,
  step: 0.05,
  get: () => SPIRAL.center[axis],
  set: (v) => {
    SPIRAL.center[axis] = v;
  },
});

const RIBBON_POS_CONTROLS: Ctl[] = [
  ribbonPos(0, -5, 5, 'posX'),
  ribbonPos(1, -3, 6, 'posY'),
  ribbonPos(2, -8, 8, 'posZ'),
];

// Rigid rotation of the whole ribbon about its center (radians), to tip/turn the
// arch toward the camera. WorksSpiral3D reads SPIRAL.rotation every frame.
const ribbonRot = (axis: 0 | 1 | 2, label: string): Ctl => ({
  label,
  min: -Math.PI,
  max: Math.PI,
  step: 0.02,
  get: () => SPIRAL.rotation[axis],
  set: (v) => {
    SPIRAL.rotation[axis] = v;
  },
});

const RIBBON_ROT_CONTROLS: Ctl[] = [
  ribbonRot(0, 'rotX'),
  ribbonRot(1, 'rotY'),
  ribbonRot(2, 'rotZ'),
];

// The text windows (contact.txt / readme.txt). Position is read every frame by
// Window3D (instant); scale/size are React props, so each edit notifies the
// window to re-render. Decoupled from the ribbon/gallery — these only move the
// text windows.
const textPanel = (
  key: keyof typeof TEXT_PANEL,
  min: number,
  max: number,
  step: number,
  label: string,
): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => TEXT_PANEL[key],
  set: (v) => {
    TEXT_PANEL[key] = v;
    notifyTextPanelChange();
  },
});

const TEXT_PANEL_CONTROLS: Ctl[] = [
  textPanel('shiftRight', -6, 6, 0.05, 'shiftRight (left/right)'),
  textPanel('shiftUp', -4, 4, 0.05, 'shiftUp (up/down)'),
  textPanel('pushback', 0, 6, 0.05, 'pushback (depth)'),
  textPanel('scale', 0.05, 0.6, 0.005, 'scale (size)'),
  textPanel('width', 200, 900, 10, 'width (px)'),
  textPanel('height', 200, 900, 10, 'height (px)'),
];

// The figure's facing + idle-float + swing choreography. Martin reads MODEL fresh
// each frame, so edits apply live.
type ModelKey =
  | 'restYaw'
  | 'swingDuration'
  | 'hoverAmplitude'
  | 'hoverSpeed'
  | 'swayAmplitude'
  | 'iconRise'
  | 'iconDepth';
// Most MODEL fields are read per frame by Martin, so a plain mutation applies live.
const model = (key: ModelKey, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => MODEL[key],
  set: (v) => {
    MODEL[key] = v;
  },
});

// iconRise / iconDepth feed iconLayout, which DesktopIcons3D computes at render time
// (not per frame) — so notify it to re-render, or the sliders look dead.
const modelIcon = (key: ModelKey, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => MODEL[key],
  set: (v) => {
    MODEL[key] = v;
    notifyIconLayoutChange();
  },
});

const MODEL_CONTROLS: Ctl[] = [
  model('restYaw', 0, Math.PI * 2, 0.02, 'restYaw (facing)'),
  model('swingDuration', 0.3, 3, 0.05, 'swingDuration (swing s)'),
  model('hoverAmplitude', 0, 0.4, 0.005, 'hoverAmplitude (float)'),
  model('hoverSpeed', 0, 2, 0.02, 'hoverSpeed (float rate)'),
  model('swayAmplitude', 0, 0.15, 0.002, 'swayAmplitude (tilt)'),
  modelIcon('iconRise', -0.5, 0.9, 0.01, 'iconRise (row height)'),
  modelIcon('iconDepth', -3, 1, 0.05, 'iconDepth (row behind)'),
];

// The intro materialize dissolve. All fields are pushed into the live material
// each frame by Martin, so edits apply on the next replay (or mid-reveal). Hit
// "replay" to re-trigger the intro and preview a change.
const dissolve = (key: keyof typeof DISSOLVE, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => DISSOLVE[key],
  set: (v) => {
    DISSOLVE[key] = v;
  },
});

const DISSOLVE_CONTROLS: Ctl[] = [
  dissolve('durationMs', 300, 4000, 50, 'durationMs (speed)'),
  dissolve('blocky', 0, 1, 0.02, 'blocky (pixel/voxel)'),
  dissolve('pixel', 4, 80, 1, 'pixel (voxel res)'),
  dissolve('scale', 2, 40, 0.5, 'scale (noise res)'),
  dissolve('gradBias', 0, 1, 0.02, 'gradBias (noise↔wipe)'),
  dissolve('edge', 0.01, 0.3, 0.005, 'edge (glow width)'),
  dissolve('glowR', 0, 3, 0.05, 'glowR'),
  dissolve('glowG', 0, 3, 0.05, 'glowG'),
  dissolve('glowB', 0, 3, 0.05, 'glowB'),
];

// Occasional idle glitch (blinks voxels off in short bursts). Read live by Martin,
// so edits apply to the next burst — hit "glitch" to fire one now.
const glitchCtl = (key: keyof typeof GLITCH, min: number, max: number, step: number, label: string): Ctl => ({
  label,
  min,
  max,
  step,
  get: () => GLITCH[key],
  set: (v) => {
    GLITCH[key] = v;
  },
});

const GLITCH_CONTROLS: Ctl[] = [
  glitchCtl('amount', 0, 0.9, 0.01, 'amount (cells)'),
  glitchCtl('pixel', 3, 80, 1, 'pixel (block size)'),
  glitchCtl('burst', 0.05, 1, 0.01, 'burst (duration s)'),
  glitchCtl('minGap', 0.5, 12, 0.5, 'minGap (s)'),
  glitchCtl('maxGap', 1, 20, 0.5, 'maxGap (s)'),
  glitchCtl('glow', 0, 3, 0.05, 'glow'),
];

const panel: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  width: 230,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(16,16,20,0.82)',
  backdropFilter: 'blur(8px)',
  color: '#e8e8ea',
  font: '11px/1.4 ui-monospace, Menlo, monospace',
  borderRadius: 10,
  padding: '10px 12px',
  zIndex: 1000,
  boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  userSelect: 'none',
};

// Its own floating window in the same top-right slot as the ribbon panel (the
// two are mutually exclusive — opening a text window closes the gallery).
const textWindowPanel: React.CSSProperties = { ...panel, width: 200 };

const row: React.CSSProperties = { marginBottom: 8 };
const section: React.CSSProperties = {
  margin: '4px 0 8px',
  paddingTop: 8,
  borderTop: '1px solid rgba(255,255,255,0.12)',
  opacity: 0.65,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};
const labelRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 2 };
const btn: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e8e8ea',
  borderRadius: 6,
  padding: '5px 0',
  cursor: 'pointer',
  font: 'inherit',
};

export function RibbonControls() {
  const [, force] = useReducer((c) => c + 1, 0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const lines = CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    const cam = CAMERA_CONTROLS.map((c) => round(c.get()));
    const pos = RIBBON_POS_CONTROLS.map((c) => round(c.get()));
    const rot = RIBBON_ROT_CONTROLS.map((c) => round(c.get()));
    const det = DETAIL_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    const glw = GLOW_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    const text =
      `// tuned ribbon values\n${lines.join('\n')}\n` +
      `// SPIRAL.center\n[${pos.join(', ')}]\n` +
      `// SPIRAL.rotation\n[${rot.join(', ')}]\n` +
      `// POSES.gallery.position\n[${cam.join(', ')}]\n` +
      `// DETAIL\n${det.join('\n')}\n` +
      `// GLOW\n${glw.join('\n')}`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };

  return (
    <div style={panel}>
      {/* Header stays fixed (outside the scroll area) so copy/collapse are always
          reachable even when the slider list overflows. */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: open ? 10 : 0 }}>
        <strong style={{ fontSize: 12, flex: 1 }}>ribbon</strong>
        {open && (
          <button style={{ ...btn, flex: 'none', padding: '3px 8px' }} onClick={copy}>
            {copied ? 'copied ✓' : 'copy'}
          </button>
        )}
        <button style={{ ...btn, flex: 'none', padding: '3px 9px' }} onClick={() => setOpen((o) => !o)}>
          {open ? '–' : '+'}
        </button>
      </div>

      {open && (
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={section}>ribbon position</div>
          {RIBBON_POS_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={section}>ribbon rotation</div>
          {RIBBON_ROT_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={section}>camera (selected works rest)</div>
          {CAMERA_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={section}>detail (open video)</div>
          {DETAIL_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={section}>glow (gallery)</div>
          {GLOW_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
        </div>
      )}
    </div>
  );
}

// The text-window tuner, a SEPARATE floating panel docked to the left of the
// ribbon panel. Self-contained (own collapse/copy state) so it reads as its own
// window rather than a section inside the ribbon controls.
export function TextWindowControls() {
  const [, force] = useReducer((c) => c + 1, 0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const txt = TEXT_PANEL_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    navigator.clipboard?.writeText(`// TEXT_PANEL\n${txt.join('\n')}`).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };

  return (
    <div style={textWindowPanel}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: open ? 10 : 0 }}>
        <strong style={{ fontSize: 12, flex: 1 }}>text windows</strong>
        {open && (
          <button style={{ ...btn, flex: 'none', padding: '3px 8px' }} onClick={copy}>
            {copied ? 'copied ✓' : 'copy'}
          </button>
        )}
        <button style={{ ...btn, flex: 'none', padding: '3px 9px' }} onClick={() => setOpen((o) => !o)}>
          {open ? '–' : '+'}
        </button>
      </div>

      {open && (
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {TEXT_PANEL_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
        </div>
      )}
    </div>
  );
}

// The figure choreography tuner. Docked top-LEFT (opposite the ribbon panel) and
// mounted in DEV regardless of window state. Tune the idle float / facing / swing
// live, then Copy into MODEL in poses.ts.
const modelPanel: React.CSSProperties = { ...panel, left: 12, right: 'auto', width: 210 };

export function ModelControls() {
  const [, force] = useReducer((c) => c + 1, 0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const mdl = MODEL_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    const dsv = DISSOLVE_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    const glt = GLITCH_CONTROLS.map((c) => `  ${c.label.split(' ')[0]}: ${round(c.get())},`);
    navigator.clipboard
      ?.writeText(`// MODEL\n${mdl.join('\n')}\n// DISSOLVE\n${dsv.join('\n')}\n// GLITCH\n${glt.join('\n')}`)
      .then(
        () => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        },
        () => {},
      );
  };

  return (
    <div style={modelPanel}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: open ? 10 : 0 }}>
        <strong style={{ fontSize: 12, flex: 1 }}>figure</strong>
        {open && (
          <button style={{ ...btn, flex: 'none', padding: '3px 8px' }} onClick={copy}>
            {copied ? 'copied ✓' : 'copy'}
          </button>
        )}
        <button style={{ ...btn, flex: 'none', padding: '3px 9px' }} onClick={() => setOpen((o) => !o)}>
          {open ? '–' : '+'}
        </button>
      </div>

      {open && (
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {MODEL_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>dissolve (intro)</span>
            <button style={{ ...btn, flex: 'none', padding: '2px 8px' }} onClick={replayDissolve}>
              replay
            </button>
          </div>
          {DISSOLVE_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
          <div style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>idle glitch</span>
            <button style={{ ...btn, flex: 'none', padding: '2px 8px' }} onClick={triggerGlitch}>
              glitch
            </button>
          </div>
          {GLITCH_CONTROLS.map((c) => (
            <Slider key={c.label} ctl={c} onChange={force} />
          ))}
        </div>
      )}
    </div>
  );
}

function Slider({ ctl, onChange }: { ctl: Ctl; onChange: () => void }) {
  return (
    <div style={row}>
      <div style={labelRow}>
        <span>{ctl.label}</span>
        <span style={{ opacity: 0.7 }}>{round(ctl.get())}</span>
      </div>
      <input
        type="range"
        min={ctl.min}
        max={ctl.max}
        step={ctl.step}
        defaultValue={ctl.get()}
        style={{ width: '100%' }}
        onInput={(e) => {
          ctl.set(parseFloat((e.target as HTMLInputElement).value));
          onChange();
        }}
      />
    </div>
  );
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
