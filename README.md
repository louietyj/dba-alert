# dBA Alert

Wall-mounted tablet app for home karaoke. Measures ambient sound in A-weighted decibels (dBA) and flashes the screen red when things get too loud.

## Features

- Real-time dBA measurement via Web Audio API (IEC 61672 A-weighting)
- Rolling graph of the last N seconds
- Configurable alert threshold — background turns red when exceeded
- Flashing alert after sustained loud noise
- Calibration offset to approximate absolute dBSPL
- All settings persist in localStorage

## Getting started

```
npm install
npm run dev
```

Then open `http://localhost:5173`, click **▶ Start**, and grant microphone access.

## Controls

| Control | Description |
|---|---|
| **Threshold** | dBA level that triggers the red alert (default 85) |
| **History** | How many seconds of audio to show on the graph |
| **Sustain** | Seconds above threshold before the screen starts flashing |
| **Cal. offset** | Shift readings ±30 dB to match a reference SPL meter |

## Calibration

The raw dBA readings include a +94 dB reference offset (a common approximation for converting dBFS to dBSPL). Actual values depend on your device's microphone sensitivity and OS gain settings. To calibrate:

1. Place a reference SPL meter (or phone app) next to your device
2. Play a steady tone
3. Adjust **Cal. offset** until the reading matches the reference

## Building

```
npm run build   # outputs to dist/
npm test        # run unit tests
```

## Tech stack

- React + Vite + TypeScript
- Chart.js + chartjs-plugin-annotation
- Web Audio API
- Vitest
