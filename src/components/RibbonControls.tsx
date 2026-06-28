import { useReducer, useState } from 'react';
import { POSES, SPIRAL } from '../three/poses';
import { applyPose } from '../three/liveCamera';

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
    const text =
      `// tuned ribbon values\n${lines.join('\n')}\n` +
      `// SPIRAL.center\n[${pos.join(', ')}]\n` +
      `// SPIRAL.rotation\n[${rot.join(', ')}]\n` +
      `// POSES.gallery.position\n[${cam.join(', ')}]`;
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
