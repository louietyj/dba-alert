export type AlertState = 'listening' | 'alert-solid' | 'alert-flash';

const SOLID_WINDOW = 10;  // last 1 s at 100 ms/sample
const FLASH_WINDOW = 20;  // last 2 s at 100 ms/sample

// solid:  any sample in the last 1 s exceeded threshold
// flash:  >50% of samples in the last 2 s exceeded threshold
export function computeAlertState(samples: number[], threshold: number): AlertState {
  const flash = samples.slice(-FLASH_WINDOW);
  const aboveInFlash = flash.filter(v => v > threshold).length;
  if (flash.length > 0 && aboveInFlash / flash.length > 0.5) {
    return 'alert-flash';
  }

  const solid = samples.slice(-SOLID_WINDOW);
  if (solid.some(v => v > threshold)) {
    return 'alert-solid';
  }

  return 'listening';
}
