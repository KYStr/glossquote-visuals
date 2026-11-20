
import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./cloth.wgsl?raw";

const yarn = registerShader(defineShader({
  name: "SelvedgeYarn",
  animatedTime: { speed: "tempo" },
  props: { pattern: { default: 0 }, tempo: { default: 1 / 8 } },
  paint: wgsl(paint),
}));

export function initializeCloth(canvas, options) {
  return initializeStandalone(canvas, [
    { id: "cloth", type: yarn.name, props: options.settings },
  ], options);
}

export function applyCloth(renderer, settings) {
  renderer.update("cloth", settings);
}
