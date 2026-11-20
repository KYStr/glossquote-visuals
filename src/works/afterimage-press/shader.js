import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import art from "./press.wgsl?raw";

const id = "press-plates";
const maxBackingWidth = 352;
const press = registerShader(defineShader({
  name: "AfterimagePressPlates",
  animatedTime: { speed: "registrationSpeed" },
  props: { plate: { default: 0 }, registrationSpeed: { default: 1 / 8 } },
  paint: wgsl(art),
}));

function displayDpr() {
  // Shaders 4.0.7 caps its device pixel ratio at no more than 2.
  return Math.min(2, window.devicePixelRatio || 1);
}

function printArea(width, height, dpr) {
  const renderWidth = Math.max(1, Math.min(width, Math.floor(maxBackingWidth / dpr)));
  return { width: renderWidth, height: Math.max(1, Math.round(height * renderWidth / width)) };
}

export async function initializePress(canvas, options) {
  let width = options.width;
  let height = options.height;
  let rendererDpr = displayDpr();
  const area = () => printArea(width, height, Math.max(rendererDpr, displayDpr()));
  const renderer = await initializeStandalone(canvas, [
    { id, type: press.name, props: { plate: options.settings.plate } },
  ], {
    ...options,
    ...area(),
    onError() {
      options.onError();
      if (options.signal.aborted) return;
      // Shaders remeasures the canvas on device rebuild. The error callback
      // reveals the still and restores the bounded CSS box before that read.
      rendererDpr = displayDpr();
      const size = area();
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    },
  });
  if (!renderer) return null;
  return {
    ...renderer,
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const size = area();
      renderer.resize(size.width, size.height);
    },
  };
}

export function updatePress(renderer, settings) {
  renderer.update(id, { plate: settings.plate });
}
