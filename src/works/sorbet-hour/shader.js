import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./sorbet.wgsl?raw";

const id = "sorbet-surface";
const surface = registerShader(defineShader({
  name: "SorbetHourSurface",
  animatedTime: { speed: "scoopSpeed" },
  props: { flavor: { default: 0 }, scoopSpeed: { default: 1 / 8 } },
  paint: wgsl(paint),
}));

export function initializeSorbet(canvas, options) {
  return initializeStandalone(canvas, [
    { id, type: surface.name, props: { flavor: options.settings.flavor } },
  ], options);
}

export function updateSorbet(renderer, settings) {
  renderer.update(id, { flavor: settings.flavor });
}
