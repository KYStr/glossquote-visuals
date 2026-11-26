import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import cyanotype from "./cyanotype.wgsl?raw";

const id = "botanica-press-plate";
const sunPrint = registerShader(defineShader({
  name: "BotanicaCyanotypePlate",
  animatedTime: { speed: "clockSpeed" },
  props: { preset: { default: -1 }, clockSpeed: { default: 1 } },
  paint: wgsl(cyanotype),
}));

function renderSize(width, height) {
  const scale = Math.min(0.75, 560 / Math.max(width, 1));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export async function initializeCyanotype(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: sunPrint.name, props: { preset: options.settings.preset } },
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

export function updateCyanotype(renderer, { preset }) {
  renderer.update(id, { preset });
}
