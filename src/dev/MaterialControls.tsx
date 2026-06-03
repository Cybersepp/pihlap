import { MaterialSettings, MaterialType } from '../three/materialSettings';

// Dev-only material lab. Mounted only under import.meta.env.DEV (see App), so it
// never ships in a production build. Edits drive the live model material.
interface Props {
  settings: MaterialSettings;
  onChange: (next: MaterialSettings) => void;
}

function ColorRow({ label, value, onColor }: { label: string; value: string; onColor: (v: string) => void }) {
  return (
    <label className="dev-row">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onColor(e.target.value)} />
    </label>
  );
}

function RangeRow({ label, value, onValue }: { label: string; value: number; onValue: (v: number) => void }) {
  return (
    <label className="dev-row">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onValue(parseFloat(e.target.value))} />
      <span className="dev-val">{value.toFixed(2)}</span>
    </label>
  );
}

export function MaterialControls({ settings, onChange }: Props) {
  const set = (patch: Partial<MaterialSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="dev-panel">
      <div className="dev-panel-title">model material · dev</div>

      <label className="dev-row">
        <span>type</span>
        <select value={settings.type} onChange={(e) => set({ type: e.target.value as MaterialType })}>
          <option value="matcap">matcap clay</option>
          <option value="standard">standard (lit)</option>
          <option value="gradient">gradient (lit)</option>
        </select>
      </label>

      {settings.type === 'matcap' && (
        <>
          <ColorRow label="highlight" value={settings.matcapHi} onColor={(v) => set({ matcapHi: v })} />
          <ColorRow label="mid" value={settings.matcapMid} onColor={(v) => set({ matcapMid: v })} />
          <ColorRow label="shadow" value={settings.matcapLo} onColor={(v) => set({ matcapLo: v })} />
        </>
      )}

      {settings.type === 'standard' && (
        <>
          <ColorRow label="color" value={settings.color} onColor={(v) => set({ color: v })} />
          <RangeRow label="roughness" value={settings.roughness} onValue={(v) => set({ roughness: v })} />
          <RangeRow label="metalness" value={settings.metalness} onValue={(v) => set({ metalness: v })} />
        </>
      )}

      {settings.type === 'gradient' && (
        <>
          <ColorRow label="bottom" value={settings.gradientBottom} onColor={(v) => set({ gradientBottom: v })} />
          <ColorRow label="top" value={settings.gradientTop} onColor={(v) => set({ gradientTop: v })} />
          <RangeRow label="roughness" value={settings.roughness} onValue={(v) => set({ roughness: v })} />
        </>
      )}

      <div className="dev-hint">lit types respond to the scene lights; matcap doesn't.</div>
    </div>
  );
}
