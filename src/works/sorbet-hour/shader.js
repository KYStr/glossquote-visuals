import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import patch from "./patch-bounds.json";
import paint from "./sorbet.wgsl?raw";

const id = "sorbet-surface";
const surface = registerShader(defineShader({
  name: "SorbetHourSurface",
  animatedTime: { speed: "scoopSpeed" },
  props: { flavor: { default: 0 }, scoopSpeed: { default: 1 / 8 } },
  paint: wgsl(`
    const livePatch = true;
    const patchOrigin = vec2f(${patch.x}, ${patch.y});
    const patchSize = vec2f(${patch.width}, ${patch.height});
    ${paint}
  `),
}));

function renderSize(width, height) {
  return {
    width: Math.max(1, Math.round(width * patch.width)),
    height: Math.max(1, Math.round(height * patch.height)),
  };
}

export async function initializeSorbet(canvas, options) {
  // Keep native pixel density inside the bounded patch. The still covers the
  // entire unchanged stage and the portion cleared by the shader's feather.
  canvas.style.left = `${patch.x * 100}%`;
  canvas.style.top = `${patch.y * 100}%`;
  canvas.style.setProperty("--patch-width", `${patch.width * 100}%`);
  canvas.style.setProperty("--patch-height", `${patch.height * 100}%`);
  const renderer = await initializeStandalone(canvas, [
    { id, type: surface.name, props: { flavor: options.settings.flavor } },
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

export function updateSorbet(renderer, settings) {
  renderer.update(id, { flavor: settings.flavor });
}
