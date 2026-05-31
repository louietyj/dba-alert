import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from './settings';
import type { Settings } from './settings';
import { DbaMeter } from './audio';
import { computeAlertState } from './alert';
import type { AlertState } from './alert';
import { Graph } from './graph';
import { Controls } from './controls';

const FLASH_WINDOW = 20; // samples for 2 s flash window

export default function App() {
  const [settings, updateSettings] = useSettings();
  const settingsRef = useRef<Settings>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [running, setRunning] = useState(false);
  const [currentDba, setCurrentDba] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [alertState, setAlertState] = useState<AlertState>('listening');
  const recentSamplesRef = useRef<number[]>([]);
  const meterRef = useRef<DbaMeter | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  // Trim sample buffer when historySeconds decreases
  useEffect(() => {
    const maxSamples = Math.floor(settings.historySeconds * 10);
    setSamples(prev => (prev.length > maxSamples ? prev.slice(-maxSamples) : prev));
  }, [settings.historySeconds]);

  const handleSample = useCallback((rawDba: number) => {
    const { calibrationOffset, thresholdDba, historySeconds } = settingsRef.current;
    const dba = rawDba + calibrationOffset;
    const maxSamples = Math.floor(historySeconds * 10);

    setCurrentDba(dba);
    setSamples(prev => {
      const next = [...prev, dba];
      return next.length > maxSamples ? next.slice(-maxSamples) : next;
    });

    const recent = recentSamplesRef.current;
    recentSamplesRef.current = [...recent, dba].slice(-FLASH_WINDOW);
    setAlertState(computeAlertState(recentSamplesRef.current, thresholdDba));
  }, []);

  const start = useCallback(async () => {
    const meter = new DbaMeter();
    meterRef.current = meter;
    await meter.start(handleSample);
    setRunning(true);
    setSamples([]);
    setCurrentDba(null);
    setAlertState('listening');
    recentSamplesRef.current = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLockRef.current = await (navigator as any).wakeLock?.request('screen');
    } catch {
      // wake lock unavailable or denied — not fatal
    }
  }, [handleSample]);

  const stop = useCallback(() => {
    meterRef.current?.stop();
    meterRef.current = null;
    setRunning(false);
    setAlertState('listening');
    recentSamplesRef.current = [];
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
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
        <div className="header-left">
          <span className="app-title">dBA Alert</span>
          <button
            className="icon-button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        </div>
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
