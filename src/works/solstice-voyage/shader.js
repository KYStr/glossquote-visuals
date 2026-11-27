import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import horizon from "./horizon.wgsl?raw";

const id = "solstice-voyage-horizon";
const cinemaWorld = registerShader(defineShader({
  name: "SolsticeHorizonCinema",
  animatedTime: { speed: "clockSpeed" },
  props: { preset: { default: 0 }, clockSpeed: { default: 1 } },
  paint: wgsl(horizon),
}));

function renderSize(width, height) {
  // Bound both axes so tall mobile viewports stay fast and pause cleanly on software GPUs.
  const scale = Math.min(0.62, 600 / Math.max(width, height, 1));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export async function initializeSolstice(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: cinemaWorld.name, props: { preset: options.settings.preset } },
  ], { ...options, ...renderSize(options.width, options.height) });
  if (!renderer) return null;
  return {
    ...renderer,
    resize(width, height) {
      const size = renderSize(width, height);
      renderer.resize(size.width, size.height);
    },
  };
}

export function updateSolstice(renderer, { preset }) {
  renderer.update(id, { preset });
}
