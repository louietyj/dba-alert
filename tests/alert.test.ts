import { describe, it, expect } from 'vitest';
import { computeAlertState } from '../src/alert';

const THRESHOLD = 80;
const below = (n: number) => Array<number>(n).fill(70);
const above = (n: number) => Array<number>(n).fill(90);

describe('computeAlertState', () => {
  it('returns listening when all samples below threshold', () => {
    expect(computeAlertState(below(20), THRESHOLD)).toBe('listening');
  });

  it('returns listening when sample array is empty', () => {
    expect(computeAlertState([], THRESHOLD)).toBe('listening');
  });

  it('returns alert-solid when any sample in the last 1 s exceeds threshold', () => {
    // 9 below then 1 above — above lands in the solid window (last 10)
    expect(computeAlertState([...below(9), ...above(1)], THRESHOLD)).toBe('alert-solid');
  });

  it('returns listening when exceedance is older than 1 s', () => {
    // 1 above followed by 19 below — pushed out of solid window (last 10)
    expect(computeAlertState([...above(1), ...below(19)], THRESHOLD)).toBe('listening');
  });

  it('returns alert-flash when >50% of last 2 s exceeds threshold', () => {
    // 11 above out of 20 = 55%
    expect(computeAlertState([...below(9), ...above(11)], THRESHOLD)).toBe('alert-flash');
  });

  it('stays alert-solid when exactly 50% of last 2 s exceeds threshold', () => {
    // 10 above out of 20 = 50% — not strictly greater
    expect(computeAlertState([...below(10), ...above(10)], THRESHOLD)).toBe('alert-solid');
  });

  it('returns alert-flash even when the most recent sample is below threshold', () => {
    // 11 above then 9 below — flash window (last 20) still has 55% above
    expect(computeAlertState([...above(11), ...below(9)], THRESHOLD)).toBe('alert-flash');
  });

  it('flash takes priority when both conditions are met', () => {
    expect(computeAlertState(above(20), THRESHOLD)).toBe('alert-flash');
  });

  it('recovers to listening after enough below-threshold samples accumulate', () => {
    // Old above samples pushed out of both windows by 20 below samples
    expect(computeAlertState([...above(5), ...below(20)], THRESHOLD)).toBe('listening');
  });
});
