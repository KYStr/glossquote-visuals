export const CYCLE_SECONDS = 12;
export const SLOT_SECONDS = 4;
export const PLATEAU_SECONDS = 3;

export const RESONANCE_MODES = [
  { file: "quad", freq: "288 Hz · (2, 1)" },
  { file: "hex", freq: "512 Hz · (3, 2)" },
  { file: "lotus", freq: "768 Hz · (4, 3)" },
];

export function computeModePos(elapsedSeconds) {
  const cyc = ((elapsedSeconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  const slot = Math.floor(cyc / SLOT_SECONDS);
  const local = cyc - slot * SLOT_SECONDS;
  if (local <= PLATEAU_SECONDS) return slot;
  const transition = (local - PLATEAU_SECONDS) / (SLOT_SECONDS - PLATEAU_SECONDS);
  return (slot + transition) % RESONANCE_MODES.length;
}

export function activeModeFromPos(modePos) {
  const count = RESONANCE_MODES.length;
  const wrapped = ((modePos % count) + count) % count;
  return Math.round(wrapped) % count;
}
