import { describe, it, expect } from 'vitest';
import { computeAlertState } from '../src/alert';

const THRESHOLD = 80;
const below = (n: number) => Array<number>(n).fill(70);
const above = (n: number) => Array<number>(n).fill(90);

// Default params matching app defaults: solid > 0% of 10 samples, flash > 50% of 20 samples
const SOLID_W = 10;
const SOLID_PCT = 0;
const FLASH_W = 20;
const FLASH_PCT = 50;
const compute = (s: number[]) =>
  computeAlertState(s, THRESHOLD, SOLID_W, SOLID_PCT, FLASH_W, FLASH_PCT);

describe('computeAlertState', () => {
  it('returns listening when all samples below threshold', () => {
    expect(compute(below(20))).toBe('listening');
  });

  it('returns listening for an empty sample array', () => {
    expect(compute([])).toBe('listening');
  });

  it('returns alert-solid when any sample in the last 1 s exceeds threshold', () => {
    expect(compute([...below(9), ...above(1)])).toBe('alert-solid');
  });

  it('returns listening when exceedance is older than 1 s window', () => {
    expect(compute([...above(1), ...below(19)])).toBe('listening');
  });

  it('returns alert-flash when >50% of last 2 s exceeds threshold', () => {
    expect(compute([...below(9), ...above(11)])).toBe('alert-flash');
  });

  it('stays alert-solid when exactly 50% of last 2 s exceeds threshold', () => {
    // 50% is not strictly > 50%
    expect(compute([...below(10), ...above(10)])).toBe('alert-solid');
  });

  it('returns alert-flash even when the most recent sample is below threshold', () => {
    // flash window has 11/20 = 55% above
    expect(compute([...above(11), ...below(9)])).toBe('alert-flash');
  });

  it('flash takes priority when both conditions are met', () => {
    expect(compute(above(20))).toBe('alert-flash');
  });

  it('recovers to listening after enough below-threshold samples accumulate', () => {
    expect(compute([...above(5), ...below(20)])).toBe('listening');
  });

  it('respects custom pct threshold (e.g. solid at 25%)', () => {
    // 2 above / 10 = 20% — below 25% threshold → listening
    const r1 = computeAlertState([...below(8), ...above(2)], THRESHOLD, 10, 25, 20, 50);
    expect(r1).toBe('listening');
    // 3 above / 10 = 30% — above 25% threshold → solid
    const r2 = computeAlertState([...below(7), ...above(3)], THRESHOLD, 10, 25, 20, 50);
    expect(r2).toBe('alert-solid');
  });

  it('respects custom window sizes', () => {
    // solid window = 5, 1 above at the end → solid
    const r = computeAlertState([...below(15), ...above(1)], THRESHOLD, 5, 0, 10, 50);
    expect(r).toBe('alert-solid');
  });
});
