import { describe, it, expect } from 'vitest';
import { aWeightingDb } from '../src/audio';

describe('aWeightingDb', () => {
  it('returns ~0 dB at 1000 Hz (normalisation reference)', () => {
    expect(aWeightingDb(1000)).toBeCloseTo(0, 0);
  });

  it('returns ~-19.1 dB at 100 Hz', () => {
    // Standard A-weighting table value
    expect(aWeightingDb(100)).toBeCloseTo(-19.1, 0);
  });

  it('returns positive correction near 3–4 kHz (human hearing peak)', () => {
    expect(aWeightingDb(3150)).toBeGreaterThan(0);
  });

  it('returns ~-2.5 dB at 10 kHz', () => {
    expect(aWeightingDb(10000)).toBeCloseTo(-2.5, 0);
  });

  it('returns a large negative value at very low frequencies', () => {
    expect(aWeightingDb(50)).toBeLessThan(-25);
  });

  it('returns -Infinity at 0 Hz', () => {
    expect(aWeightingDb(0)).toBe(-Infinity);
  });

  it('is monotonically increasing from 20 Hz to 2 kHz', () => {
    // A-weighting rises steeply to its plateau (~+1.2 dB) around 2–4 kHz
    const freqs = [20, 50, 100, 200, 500, 1000, 2000];
    for (let i = 1; i < freqs.length; i++) {
      expect(aWeightingDb(freqs[i])).toBeGreaterThan(aWeightingDb(freqs[i - 1]));
    }
  });

  it('decreases above ~4 kHz', () => {
    // After the ~3.5 kHz peak the curve falls
    expect(aWeightingDb(10000)).toBeLessThan(aWeightingDb(4000));
  });
});
