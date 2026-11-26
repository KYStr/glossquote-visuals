import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import chladni from "./chladni.wgsl?raw";

const id = "cymatic-brass-plate";
const resonance = registerShader(defineShader({
  name: "CymaticBrassPlate",
  animatedTime: { speed: "clockSpeed" },
  props: { preset: { default: -1 }, clockSpeed: { default: 1 } },
  paint: wgsl(chladni),
}));

function renderSize(width, height) {
  const scale = Math.min(0.75, 560 / Math.max(width, 1));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export async function initializeBrass(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: resonance.name, props: { preset: options.settings.preset } },
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

export function updateBrass(renderer, { preset }) {
  renderer.update(id, { preset });
}
