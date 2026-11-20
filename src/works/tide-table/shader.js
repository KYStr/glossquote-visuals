import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./coast.wgsl?raw";

const coast = registerShader(defineShader({
  name: "TideTableCoast",
  animatedTime: { speed: "tempo" },
  props: {
    tempo: { default: 1 },
    tide: { default: -0.055 },
    manual: { default: 0 },
  },
  paint: wgsl(paint),
}));

const tides = { low: -0.055, mid: 0.2675, high: 0.59 };

function props({ level }) {
  return level === "cycle"
    ? { manual: 0 }
    : { tide: tides[level], manual: 1 };
}

export function applyTide(renderer, settings) {
  renderer.update("shore", props(settings));
}

export function initializeTide(canvas, options) {
  return initializeStandalone(canvas, [
    { id: "shore", type: coast.name, props: props(options.settings) },
  ], options);
}
