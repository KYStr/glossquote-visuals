import { initializeStandalone } from "../../shared/standalone.js";

const tilt = (outputMin, outputMax, speed = 0.5) => ({
  type: "auto-animate", mode: "ping-pong", outputMin, outputMax, speed,
});

const forms = {
  identity: {
    shape: { type: "torus3D", radius: 0.29, tube: 0.126, rotX: tilt(46, 68), rotY: tilt(-15, 28), rotZ: 0 },
    colorA: "#be422f", colorB: "#ffa879", rotation: -23, scale: 1,
  },
  motion: {
    shape: { type: "helix3D", radius: 0.22, tube: 0.075, pitch: 0.215, rotX: tilt(-17, 2), rotY: tilt(-27, 22), rotZ: 0 },
    colorA: "#a8414c", colorB: "#ffb48b", rotation: 28, scale: 0.99,
  },
  digital: {
    shape: {
      type: "ribbon3D", width: 0.163, thickness: 0.029, length: 0.383,
      wave: 0.075, waveFrequency: 5.5, twist: 172, speed: 0,
      rotX: tilt(9, 25), rotY: tilt(-20, 17), rotZ: 0,
    },
    colorA: "#c78194", colorB: "#ffe4ce", rotation: -32, scale: 1.02,
  },
};

function particleProps({ form, pulse, pointer }) {
  const { shape, ...look } = forms[form];
  return {
    ...look, shape: JSON.stringify(shape), shapeType: shape.type,
    mouseInfluence: pointer ? 3.1 : 0,
    spread: pulse ? 2.75 : 0.78,
    agitation: pulse ? 0.74 : 0.14,
  };
}

export function applyAeriform(renderer, next, previous) {
  if (next.form !== previous?.form) {
    renderer.update("volume", particleProps(next));
    return;
  }
  const { spread, agitation, mouseInfluence } = particleProps(next);
  renderer.update("volume", { spread, agitation, mouseInfluence });
}

export function initializeAeriform(canvas, options) {
  return initializeStandalone(canvas, [
    { id: "volume", type: "Particles", props: {
      ...particleProps(options.settings),
      count: matchMedia("(pointer: coarse)").matches ? 5750 : 11200,
      size: 1.72, softness: 0.04, exposure: 1.76, damping: 0.42,
      mouseRadius: 0.26, particleShape: "dot",
      center: { x: 0.5, y: 0.5 },
    } },
  ], options);
}
