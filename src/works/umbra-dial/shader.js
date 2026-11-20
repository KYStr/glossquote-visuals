import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import eclipse from "./eclipse.wgsl?raw";

const id = "umbra-dial-eclipse";
const projection = registerShader(defineShader({
  name: "UmbraDialProjection",
  animatedTime: { speed: "clockSpeed" },
  props: { preset: { default: -1 }, clockSpeed: { default: 1 } },
  paint: wgsl(eclipse),
}));

function renderSize(width, height) {
  // Keep the optical plate at 3:2 and bound the fragment budget at each DPR.
  const scale = Math.min(0.75, 560 / width);
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export async function initializeEclipse(canvas, options) {
  const renderer = await initializeStandalone(canvas, [
    { id, type: projection.name, props: { preset: options.settings.preset } },
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

export function updateEclipse(renderer, { preset }) {
  renderer.update(id, { preset });
}
