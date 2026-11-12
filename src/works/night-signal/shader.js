import { initializeStandalone } from "../../shared/standalone.js";

const channels = {
  carrier: { glow: "#755f68", light: "#ffe696", trace: "#c0a75d", end: 0.31, rise: 0.12, frequency: 0.61, angle: 7 },
  echo: { glow: "#45427f", light: "#c7c3ff", trace: "#8178cf", end: 0.43, rise: 0.18, frequency: 0.84, angle: 352 },
  dawn: { glow: "#744051", light: "#ffd0aa", trace: "#f09080", end: 0.57, rise: 0.08, frequency: 0.42, angle: 12 },
};

function composition({ channel }) {
  const { glow, light, trace, end, rise, frequency, angle } = channels[channel];
  return [
    { id: "field", type: "SolidColor", props: { color: "#04050c" } },
    { id: "beam", type: "Beam", props: {
      startPosition: { x: 0.12, y: 0.76 }, endPosition: { x: 1, y: end },
      startThickness: 0.004, endThickness: 0.049, startSoftness: 0.18, endSoftness: 0.72,
      insideColor: glow, outsideColor: "#060611", opacity: 0.8,
    } },
    { id: "afterglow", type: "SineWave", props: {
      color: trace, amplitude: rise + 0.028, frequency, speed: 0.19, angle,
      position: { x: 0.51, y: 0.54 }, thickness: 0.022, softness: 0.064, opacity: 0.52,
    } },
    { id: "edge", type: "SineWave", props: {
      color: light, amplitude: rise, frequency, speed: 0.19, angle,
      position: { x: 0.5, y: 0.48 }, thickness: 0.011, softness: 0.012, opacity: 0.86,
    } },
  ];
}

export function applySignal(renderer, settings) {
  for (const { id, props } of composition(settings)) renderer.update(id, props);
}

export function initializeSignal(canvas, options) {
  return initializeStandalone(canvas, composition(options.settings), options);
}
