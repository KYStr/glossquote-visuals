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
const renderWidthLimit = 576;

function props({ level }) {
  return level === "cycle"
    ? { manual: 0 }
    : { tide: tides[level], manual: 1 };
}

export function applyTide(renderer, settings) {
  renderer.update("shore", props(settings));
}

function rasterSize(width, height) {
  const scale = Math.min(1, renderWidthLimit / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function initializeTide(canvas, options) {
  // Bound the logical raster independently of the chart's CSS box. The
  // renderer still applies its own DPR so high-density displays retain detail.
  const initial = rasterSize(options.width, options.height);
  const renderer = await initializeStandalone(canvas, [
    { id: "shore", type: coast.name, props: props(options.settings) },
  ], { ...options, ...initial });
  return {
    ...renderer,
    resize(width, height) {
      const raster = rasterSize(width, height);
      renderer.resize(raster.width, raster.height);
    },
  };
}
