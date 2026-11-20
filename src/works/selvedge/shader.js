
import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./cloth.wgsl?raw";

const yarn = registerShader(defineShader({
  name: "SelvedgeYarn",
  animatedTime: { speed: "tempo" },
  props: { pattern: { default: 0 }, tempo: { default: 1 / 6 } },
  paint: wgsl(paint),
}));

function bufferDimensions(width, height) {
  // The pinned renderer multiplies these logical dimensions by up to 2× DPR.
  // On a small touch viewport its own 1.5× ceiling can lower the result further.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(1, 1.25 / dpr, 528 / (width * dpr));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function initializeCloth(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id: "cloth", type: yarn.name, props: options.settings },
  ], { ...options, ...bufferDimensions(options.width, options.height) });

  return {
    update: renderer.update,
    pause: renderer.pause,
    resume: renderer.resume,
    destroy: renderer.destroy,
    getFailureReason: renderer.getFailureReason,
    resize(width, height) {
      const size = bufferDimensions(width, height);
      renderer.resize(size.width, size.height);
    },
  };
}

export function applyCloth(renderer, settings) {
  renderer.update("cloth", settings);
}
