import { createShader, setShadersDebug } from "shaders/js";

export function initializeStandalone(canvas, components, { width, height, onReady, onError }) {
  setShadersDebug(false);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return createShader(canvas, { components }, {
    disableTelemetry: true, observeElement: false, colorSpace: "srgb", onReady, onError,
  });
}
