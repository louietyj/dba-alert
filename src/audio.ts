const A1_SQ = 20.6 ** 2;
const A2_SQ = 107.7 ** 2;
const A3_SQ = 737.9 ** 2;
const A4_SQ = 12194 ** 2;

// Approximate dBFS→dBSPL reference (device-dependent; user trims with calibrationOffset)
const REFERENCE_DB = 94;

// IEC 61672 A-weighting correction in dB for frequency f (Hz)
export function aWeightingDb(f: number): number {
  if (f <= 0) return -Infinity;
  const f2 = f * f;
  const f4 = f2 * f2;
  const Ra =
    (A4_SQ * f4) /
    ((f2 + A1_SQ) *
      Math.sqrt((f2 + A2_SQ) * (f2 + A3_SQ)) *
      (f2 + A4_SQ));
  return 20 * Math.log10(Ra) + 2.0;
}

export class DbaMeter {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private aWeights: Float32Array<ArrayBuffer> | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private lastSampleTime = 0;
  readonly sampleIntervalMs = 100;

  async start(onSample: (dba: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.1;

    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.context.sampleRate;
    this.buffer = new Float32Array(binCount);

    // Pre-compute A-weighting table — done once, not per frame
    this.aWeights = new Float32Array(binCount);
    for (let k = 0; k < binCount; k++) {
      const f = (k * sampleRate) / (binCount * 2);
      this.aWeights[k] = aWeightingDb(f);
    }

    const tick = (timestamp: number) => {
      if (timestamp - this.lastSampleTime >= this.sampleIntervalMs) {
        this.lastSampleTime = timestamp;
        const raw = this.computeAWeightedDb();
        if (raw !== null) onSample(raw + REFERENCE_DB);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private computeAWeightedDb(): number | null {
    if (!this.analyser || !this.buffer || !this.aWeights) return null;

    this.analyser.getFloatFrequencyData(this.buffer);

    let weightedPower = 0;
    const n = this.buffer.length;
    for (let k = 1; k < n; k++) {
      const dbfs = this.buffer[k];
      if (dbfs <= -140) continue; // below noise floor
      const linearPower = 10 ** (dbfs / 10);
      const aCorr = 10 ** (this.aWeights[k] / 10);
      weightedPower += linearPower * aCorr;
    }

    if (weightedPower <= 0) return null;
    return 10 * Math.log10(weightedPower);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.source?.disconnect();
    this.analyser = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.context?.close().catch(() => undefined);
    this.context = null;
    this.buffer = null;
    this.aWeights = null;
  }
}
