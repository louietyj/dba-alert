import { useState, useEffect } from 'react';

export interface Settings {
  thresholdDba: number;
  historySeconds: number;
  calibrationOffset: number;
}

const DEFAULTS: Settings = {
  thresholdDba: 75,
  historySeconds: 30,
  calibrationOffset: 0,
};

const STORAGE_KEY = 'dba-alert-settings';

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULTS, ...(JSON.parse(stored) as Partial<Settings>) };
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULTS };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  return [settings, update];
}
