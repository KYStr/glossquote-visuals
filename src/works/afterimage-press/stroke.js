export const strokeDuration = 3_750;
export const initialEdge = 0.106;
export const sheetHeight = 608 / 720;
export const pullStart = 0.09;
export const liftStart = 0.84;

// Engage at the top edge, pull in one direction and lift beyond the table.
export function bladeEdge(progress) {
  if (progress < pullStart) return initialEdge;
  if (progress < liftStart) {
    const pull = (progress - pullStart) / (liftStart - pullStart);
    return initialEdge + sheetHeight * pull * pull * (3 - 2 * pull);
  }
  const lift = (progress - liftStart) / (1 - liftStart);
  return initialEdge + sheetHeight + 0.37 * lift * lift;
}
