import { initializeStandalone } from "../../shared/standalone.js";

const shape = JSON.stringify({ type: "circleSDF", radius: 0.58 });
const finishes = {
  polished: {
    type: "Chrome",
    tint: "#dcd3c6", warmColor: "#edccb1", coolColor: "#a3a9ad",
    bevelWidth: 0.06, curvature: 0.78, waviness: 0.18,
    dispersion: 0.025, spectral: 0.14, softness: 0.24, shadows: 0.78,
  },
  satin: {
    type: "BrushedMetal",
    lightColor: "#bdb2a5", darkColor: "#28241f",
    brushAngle: 13, anisotropy: 0.7, grain: 0.56, roughness: 0.68,
  },
};

function studioLight(angle) {
  return {
    type: "auto-animate",
    mode: "ping-pong",
    outputMin: angle - 24,
    outputMax: angle + 24,
    speed: 0.23,
  };
}

export function applyLiquid(renderer, { finish, angle }) {
  for (const id of Object.keys(finishes)) renderer.update(id, { visible: id === finish });
  renderer.update(finish, { envRotation: studioLight(angle) });
}

export function initializeLiquid(canvas, options) {
  const { finish, angle } = options.settings;
  const layers = Object.entries(finishes).map(([id, { type, ...surface }]) => ({
    id,
    type,
    props: { ...surface, shape, envRotation: studioLight(angle), speed: 0.18, visible: id === finish },
  }));
  return initializeStandalone(canvas, layers, options);
}
