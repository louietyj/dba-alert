import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from './settings';
import type { Settings } from './settings';
import { DbaMeter } from './audio';
import { computeAlertState } from './alert';
import type { AlertState } from './alert';
import { Graph } from './graph';
import { Controls } from './controls';

const CURSOR_TIMEOUT_MS = 3000;
const HISTORY_SECONDS = 30;

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

  // Fullscreen
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

  // Hide cursor after inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onActive = () => {
      document.body.classList.remove('cursor-inactive');
      clearTimeout(timer);
      timer = setTimeout(
        () => document.body.classList.add('cursor-inactive'),
        CURSOR_TIMEOUT_MS,
      );
    };
    document.addEventListener('mousemove', onActive);
    document.addEventListener('mousedown', onActive);
    // Start the timer immediately so cursor hides if user never moves the mouse
    timer = setTimeout(
      () => document.body.classList.add('cursor-inactive'),
      CURSOR_TIMEOUT_MS,
    );
    return () => {
      document.removeEventListener('mousemove', onActive);
      document.removeEventListener('mousedown', onActive);
      clearTimeout(timer);
      document.body.classList.remove('cursor-inactive');
    };
  }, []);

  const handleSample = useCallback((rawDba: number) => {
    const {
      calibrationOffset, thresholdDba,
      solidWindowSec, solidPct, flashWindowSec, flashPct,
    } = settingsRef.current;
    const dba = rawDba + calibrationOffset;
    const maxSamples = HISTORY_SECONDS * 10;

    setCurrentDba(dba);
    setSamples(prev => {
      const next = [...prev, dba];
      return next.length > maxSamples ? next.slice(-maxSamples) : next;
    });

    const solidW = Math.max(1, Math.round(solidWindowSec * 10));
    const flashW = Math.max(1, Math.round(flashWindowSec * 10));
    const bufferSize = Math.max(solidW, flashW);
    recentSamplesRef.current = [...recentSamplesRef.current, dba].slice(-bufferSize);

    setAlertState(computeAlertState(
      recentSamplesRef.current, thresholdDba, solidW, solidPct, flashW, flashPct,
    ));
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
          historySeconds={HISTORY_SECONDS}
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
