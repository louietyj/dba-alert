import { describe, it, expect } from 'vitest';
import { computeAlertState } from '../src/alert';

const NOW = 1000000; // arbitrary fixed timestamp
const THRESHOLD = 80;
const SUSTAIN_MS = 3000;

describe('computeAlertState', () => {
  it('returns listening when dba is below threshold', () => {
    const result = computeAlertState(75, THRESHOLD, SUSTAIN_MS, null, NOW);
    expect(result.state).toBe('listening');
    expect(result.aboveSince).toBeNull();
  });

  it('returns listening when dba equals threshold', () => {
    const result = computeAlertState(80, THRESHOLD, SUSTAIN_MS, null, NOW);
    expect(result.state).toBe('listening');
  });

  it('returns alert-solid immediately when threshold first exceeded', () => {
    const result = computeAlertState(85, THRESHOLD, SUSTAIN_MS, null, NOW);
    expect(result.state).toBe('alert-solid');
    expect(result.aboveSince).toBe(NOW);
  });

  it('stays alert-solid before sustain duration elapses', () => {
    const aboveSince = NOW - 2000; // 2s ago
    const result = computeAlertState(85, THRESHOLD, SUSTAIN_MS, aboveSince, NOW);
    expect(result.state).toBe('alert-solid');
    expect(result.aboveSince).toBe(aboveSince); // timestamp preserved
  });

  it('transitions to alert-flash after sustain duration', () => {
    const aboveSince = NOW - 3000; // exactly at sustain boundary
    const result = computeAlertState(85, THRESHOLD, SUSTAIN_MS, aboveSince, NOW);
    expect(result.state).toBe('alert-flash');
  });

  it('stays alert-flash well past sustain duration', () => {
    const aboveSince = NOW - 10000;
    const result = computeAlertState(85, THRESHOLD, SUSTAIN_MS, aboveSince, NOW);
    expect(result.state).toBe('alert-flash');
  });

  it('recovers to listening when dba drops below threshold', () => {
    const aboveSince = NOW - 5000; // was flashing
    const result = computeAlertState(70, THRESHOLD, SUSTAIN_MS, aboveSince, NOW);
    expect(result.state).toBe('listening');
    expect(result.aboveSince).toBeNull();
  });

  it('aboveSince is preserved while above threshold', () => {
    const aboveSince = NOW - 1000;
    const result = computeAlertState(90, THRESHOLD, SUSTAIN_MS, aboveSince, NOW + 500);
    expect(result.aboveSince).toBe(aboveSince);
  });
});
