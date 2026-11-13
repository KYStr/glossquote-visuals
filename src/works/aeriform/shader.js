import { initializeStandalone } from "../../shared/standalone.js";

const tilt = (outputMin, outputMax, speed = 0.5) => ({
  type: "auto-animate", mode: "ping-pong", outputMin, outputMax, speed,
});

const forms = {
  identity: {
    shape: { type: "torus3D", radius: 0.295, tube: 0.112, rotX: tilt(61, 76), rotY: tilt(-14, 18), rotZ: 0 },
    colorA: "#f94b26", colorB: "#ffb583", rotation: -23, scale: 1,
  },
  motion: {
    shape: { type: "helix3D", radius: 0.22, tube: 0.086, pitch: 0.205, rotX: tilt(-17, 2), rotY: tilt(-30, 20), rotZ: 0 },
    colorA: "#ff784e", colorB: "#ffe2d0", rotation: 31, scale: 1.03,
  },
  digital: {
    shape: { type: "cube3D", sizeX: 0.31, sizeY: 0.25, sizeZ: 0.17, rounding: 0.037, rotX: tilt(24, 42), rotY: tilt(-32, -11), rotZ: 0 },
    colorA: "#ffc4b3", colorB: "#ff6b43", rotation: -18, scale: 0.94,
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
      count: matchMedia("(pointer: coarse)").matches ? 4300 : 5900,
      size: 2.15, softness: 0.08, exposure: 1.34, damping: 0.42,
      mouseRadius: 0.26, particleShape: "dot",
      center: { x: 0.5, y: 0.5 },
    } },
  ], options);
}
