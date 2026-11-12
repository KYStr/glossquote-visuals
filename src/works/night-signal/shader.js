import { initializeStandalone } from "../../shared/standalone.js";

const channels = {
  carrier: { field: "#1c214f", stripe: "#665776", angle: 55, cells: 14, density: 6, frequency: 2.65, wave: 8, position: 0.45 },
  echo: { field: "#25204b", stripe: "#556a9a", angle: 105, cells: 22, density: 9, frequency: 3.6, wave: 31, position: 0.58 },
  dawn: { field: "#382944", stripe: "#7b516b", angle: -25, cells: 10, density: 5, frequency: 1.7, wave: 351, position: 0.51 },
};

function composition({ channel, intensity }) {
  const { field, stripe, angle, cells, density, frequency, wave, position } = channels[channel];
  const strength = intensity / 100;
  return [
    { id: "field", type: "SolidColor", props: { color: field } },
    { id: "grid", type: "Grid", props: { color: "#9caacb", cells, thickness: 1, softness: 0.28, opacity: 0.29 } },
    { id: "stripes", type: "Stripes", props: {
      colorA: stripe, colorB: field, angle, density, softness: 0.12, balance: 0.29, speed: 0, opacity: 0.52,
    } },
    { id: "echo", type: "SineWave", props: {
      color: "#bc6c7e", amplitude: 0.07 + strength * 0.115, frequency, speed: 0.11, angle: wave,
      position: { x: 0.5, y: position + 0.105 }, thickness: 0.047, softness: 0.25, opacity: 0.72,
    } },
    { id: "carrier", type: "SineWave", props: {
      color: "#f5e3a4", amplitude: 0.065 + strength * 0.17, frequency, speed: 0.11, angle: wave,
      position: { x: 0.5, y: position }, thickness: 0.068, softness: 0.23, opacity: 0.5 + strength * 0.43,
    } },
  ];
}

export function applySignal(renderer, settings) {
  for (const { id, props } of composition(settings)) renderer.update(id, props);
}

export function initializeSignal(canvas, options) {
  return initializeStandalone(canvas, composition(options.settings), options);
}
