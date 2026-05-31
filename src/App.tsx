import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from './settings';
import type { Settings } from './settings';
import { DbaMeter } from './audio';
import { computeAlertState } from './alert';
import type { AlertState } from './alert';
import { Graph } from './graph';
import { Controls } from './controls';

export default function App() {
  const [settings, updateSettings] = useSettings();
  // Ref so the stable handleSample callback always reads fresh settings
  const settingsRef = useRef<Settings>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [running, setRunning] = useState(false);
  const [currentDba, setCurrentDba] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [alertState, setAlertState] = useState<AlertState>('listening');
  const aboveSinceRef = useRef<number | null>(null);
  const meterRef = useRef<DbaMeter | null>(null);

  // Trim sample buffer when historySeconds decreases
  useEffect(() => {
    const maxSamples = Math.floor(settings.historySeconds * 10);
    setSamples(prev => (prev.length > maxSamples ? prev.slice(-maxSamples) : prev));
  }, [settings.historySeconds]);

  // Stable callback — reads fresh settings from ref each invocation
  const handleSample = useCallback((rawDba: number) => {
    const { calibrationOffset, thresholdDba, sustainSeconds, historySeconds } =
      settingsRef.current;
    const dba = rawDba + calibrationOffset;
    const maxSamples = Math.floor(historySeconds * 10);

    setCurrentDba(dba);
    setSamples(prev => {
      const next = [...prev, dba];
      return next.length > maxSamples ? next.slice(-maxSamples) : next;
    });

    const now = Date.now();
    const result = computeAlertState(
      dba,
      thresholdDba,
      sustainSeconds * 1000,
      aboveSinceRef.current,
      now,
    );
    aboveSinceRef.current = result.aboveSince;
    setAlertState(result.state);
  }, []);

  const start = useCallback(async () => {
    const meter = new DbaMeter();
    meterRef.current = meter;
    await meter.start(handleSample);
    setRunning(true);
    setSamples([]);
    setCurrentDba(null);
    setAlertState('listening');
    aboveSinceRef.current = null;
  }, [handleSample]);

  const stop = useCallback(() => {
    meterRef.current?.stop();
    meterRef.current = null;
    setRunning(false);
    setAlertState('listening');
    aboveSinceRef.current = null;
  }, []);

  const toggleRunning = useCallback(() => {
    if (running) {
      stop();
    } else {
      start().catch((err: unknown) => {
        console.error('Mic error:', err);
        alert('Could not access microphone. Please allow mic access and try again.');
      });
    }
  }, [running, start, stop]);

  useEffect(() => {
    return () => { meterRef.current?.stop(); };
  }, []);

  const bgClass =
    alertState === 'alert-flash' ? 'bg-flash'
    : alertState === 'alert-solid' ? 'bg-alert'
    : 'bg-normal';

  return (
    <div className={`app ${bgClass}`}>
      <header className="app-header">
        <span className="app-title">dBA Alert</span>
        <span className={`current-dba ${alertState !== 'listening' ? 'current-dba--alert' : ''}`}>
          {currentDba !== null ? `${Math.round(currentDba)} dBA` : '— dBA'}
        </span>
      </header>
      <div className="graph-area">
        <Graph
          samples={samples}
          threshold={settings.thresholdDba}
          historySeconds={settings.historySeconds}
        />
      </div>
      <Controls
        settings={settings}
        onChange={updateSettings}
        running={running}
        onToggle={toggleRunning}
      />
    </div>
  );
}
