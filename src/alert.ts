export type AlertState = 'listening' | 'alert-solid' | 'alert-flash';

// Returns true if strictly more than `pct`% of the last `windowSamples` samples
// exceed threshold. Empty window always returns false.
function windowExceeds(
  samples: number[],
  threshold: number,
  windowSamples: number,
  pct: number,
): boolean {
  const w = samples.slice(-windowSamples);
  if (w.length === 0) return false;
  return w.filter(v => v > threshold).length / w.length > pct / 100;
}

export function computeAlertState(
  samples: number[],
  threshold: number,
  solidWindowSamples: number,
  solidPct: number,
  flashWindowSamples: number,
  flashPct: number,
): AlertState {
  if (windowExceeds(samples, threshold, flashWindowSamples, flashPct)) return 'alert-flash';
  if (windowExceeds(samples, threshold, solidWindowSamples, solidPct)) return 'alert-solid';
  return 'listening';
}
