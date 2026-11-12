import { createShader, setShadersDebug } from "shaders/js";

const palettes = {
  dawn: { light: "#fff6df", shade: "#b79b82", edge: "#8f715a" },
  honey: { light: "#ffe4b4", shade: "#c38a4d", edge: "#ab7335" },
  overcast: { light: "#e4efff", shade: "#879bb3", edge: "#6b7d98" },
};

function lightLayers({ angle, preset }) {
  const { light, shade, edge } = palettes[preset];
  const radians = angle * Math.PI / 180;
  const x = Math.sin(radians) * 0.46;
  const y = Math.cos(radians) * 0.46;
  return {
    field: { colorA: shade, colorB: light, angle: (450 - angle) % 360 },
    shaft: {
      startPosition: { x: 0.5 - x, y: 0.5 + y },
      endPosition: { x: 0.5 + x, y: 0.5 - y },
      insideColor: light,
      outsideColor: edge,
    },
  };
}

export function applyPaperLight(renderer, settings) {
  const { field, shaft } = lightLayers(settings);
  renderer.update("field", field);
  renderer.update("shaft", shaft);
}

export function initializePaperLight(canvas, { width, height, settings, onReady, onError }) {
  const { field, shaft } = lightLayers(settings);
  setShadersDebug(false);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return createShader(canvas, {
    components: [
      { id: "field", type: "LinearGradient", props: { ...field, colorSpace: "oklab" } },
      { id: "shaft", type: "Beam", props: {
        ...shaft,
        startThickness: { type: "auto-animate", mode: "ping-pong", outputMin: 0.13, outputMax: 0.21, speed: 0.08 },
        endThickness: 0.3,
        startSoftness: 1.05,
        endSoftness: 1.35,
        opacity: 0.58,
        blendMode: "screen",
      } },
      { id: "fiber-light", type: "SimplexNoise", props: {
        colorA: "#f9eee0",
        colorB: "#4e4034",
        scale: -1.2,
        speed: 0.06,
        seed: 23,
        opacity: 0.13,
        blendMode: "softLight",
      } },
    ],
  }, { disableTelemetry: true, observeElement: false, colorSpace: "srgb", onReady, onError });
}
