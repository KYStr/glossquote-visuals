import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import onsen from "./onsen.wgsl?raw";

const id = "kuroyu-ryokan-onsen";
const sanctuary = registerShader(defineShader({
  name: "KuroyuOnsenSanctuary",
  animatedTime: { speed: "clockSpeed" },
  props: { preset: { default: -1 }, clockSpeed: { default: 1 } },
  paint: wgsl(onsen),
}));

function renderSize(width, height) {
  // O(1) shader + capped pixel budget -> 60fps even on 5-year-old integrated GPU office laptops.
  const scale = Math.min(0.65, 720 / Math.max(width, 1));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export async function initializeOnsen(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: sanctuary.name, props: { preset: options.settings.preset } },
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

export function updateOnsen(renderer, { preset }) {
  renderer.update(id, { preset });
}
