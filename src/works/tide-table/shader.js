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
const renderWidthLimit = 640;

function props({ level }) {
  return level === "cycle"
    ? { manual: 0 }
    : { tide: tides[level], manual: 1 };
}

export function applyTide(renderer, settings) {
  renderer.update("shore", props(settings));
}

export async function initializeTide(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id: "shore", type: coast.name, props: props(options.settings) },
  ], options);

  // The chart fills its usual CSS box. Bound the raster sent to the software
  // adapter separately, using the same scale on both axes to preserve the UVs.
  function resize(width, height) {
    const scale = Math.min(1, renderWidthLimit / width);
    renderer.resize(Math.round(width * scale), Math.round(height * scale));
  }

  if (!options.signal.aborted && options.width > renderWidthLimit) {
    resize(options.width, options.height);
  }
  return { ...renderer, resize };
}
