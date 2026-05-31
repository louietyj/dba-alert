import type { Settings } from './settings';

interface ControlsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  running: boolean;
  onToggle: () => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="slider-row">
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{format(value)}</span>
    </div>
  );
}

export function Controls({ settings, onChange, running, onToggle }: ControlsProps) {
  return (
    <div className="controls">
      <SliderRow
        label="Threshold"
        value={settings.thresholdDba}
        min={40}
        max={120}
        step={1}
        format={v => `${v} dBA`}
        onChange={v => onChange({ thresholdDba: v })}
      />
      <SliderRow
        label="Solid window"
        value={settings.solidWindowSec}
        min={0.5}
        max={10}
        step={0.5}
        format={v => `${v} s`}
        onChange={v => onChange({ solidWindowSec: v })}
      />
      <SliderRow
        label="Solid >"
        value={settings.solidPct}
        min={0}
        max={99}
        step={1}
        format={v => `${v}%`}
        onChange={v => onChange({ solidPct: v })}
      />
      <SliderRow
        label="Flash window"
        value={settings.flashWindowSec}
        min={0.5}
        max={10}
        step={0.5}
        format={v => `${v} s`}
        onChange={v => onChange({ flashWindowSec: v })}
      />
      <SliderRow
        label="Flash >"
        value={settings.flashPct}
        min={0}
        max={99}
        step={1}
        format={v => `${v}%`}
        onChange={v => onChange({ flashPct: v })}
      />
      <SliderRow
        label="History"
        value={settings.historySeconds}
        min={5}
        max={120}
        step={5}
        format={v => `${v} s`}
        onChange={v => onChange({ historySeconds: v })}
      />
      <SliderRow
        label="Cal. offset"
        value={settings.calibrationOffset}
        min={-30}
        max={30}
        step={1}
        format={v => `${v >= 0 ? '+' : ''}${v} dB`}
        onChange={v => onChange({ calibrationOffset: v })}
      />
      <div className="button-row">
        <button className="start-button" onClick={onToggle}>
          {running ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>
    </div>
  );
}
