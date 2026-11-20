import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import art from "./press.wgsl?raw";

const id = "press-plates";
const press = registerShader(defineShader({
  name: "AfterimagePressPlates",
  animatedTime: { speed: "registrationSpeed" },
  props: { plate: { default: 0 }, registrationSpeed: { default: 1 / 8 } },
  paint: wgsl(art),
}));

function printArea(width, height) {
  // Shaders 4.0.7 multiplies the logical dimensions by the device's DPR cap.
  // Keep live color coverage bounded while the DOM poster type stays sharp.
  const scale = Math.min(1, 440 / width);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function initializePress(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: press.name, props: { plate: options.settings.plate } },
  ], { ...options, ...printArea(options.width, options.height) });
  if (!renderer) return null;
  return {
    ...renderer,
    resize(width, height) {
      const size = printArea(width, height);
      renderer.resize(size.width, size.height);
    },
  };
}

export function updatePress(renderer, settings) {
  renderer.update(id, { plate: settings.plate });
}
