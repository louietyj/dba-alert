export type AlertState = 'listening' | 'alert-solid' | 'alert-flash';

export interface AlertStatus {
  state: AlertState;
  aboveSince: number | null;
}

export function computeAlertState(
  dba: number,
  threshold: number,
  sustainMs: number,
  aboveSince: number | null,
  now: number,
): AlertStatus {
  if (dba <= threshold) {
    return { state: 'listening', aboveSince: null };
  }

  const since = aboveSince ?? now;
  const elapsed = now - since;
  const state: AlertState = elapsed >= sustainMs ? 'alert-flash' : 'alert-solid';
  return { state, aboveSince: since };
}
