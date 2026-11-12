import { initializeStandalone } from "../../shared/standalone.js";

const objects = {
  ring: { shape: { type: "ringSDF", radius: 0.255, innerRatio: 0.077 }, tint: "#e6ebf2", waviness: 0.19 },
  orb: { shape: { type: "circleSDF", radius: 0.33 }, tint: "#c8d9f1", waviness: 0.36 },
  arc: { shape: { type: "crescentSDF", radius: 0.35, innerRatio: 0.84, offset: 0.18 }, tint: "#e9e3d9", waviness: 0.13 },
};

function props(id, angle) {
  const { shape, tint, waviness } = objects[id];
  return {
    shape: JSON.stringify({ ...shape, rotation: angle - 28 }),
    envRotation: angle,
    tint,
    waviness,
  };
}

export function applyLiquid(renderer, { object, angle }) {
  for (const id of Object.keys(objects)) renderer.update(id, { visible: id === object });
  renderer.update(object, props(object, angle));
}

export function initializeLiquid(canvas, options) {
  const { object, angle } = options.settings;
  const metals = Object.keys(objects).map((id) => ({
    id, type: "Chrome",
    props: {
      ...props(id, angle),
      visible: id === object,
      dispersion: 0.05,
      spectral: 0.26,
      speed: 0.13,
      warmColor: "#ddd4c2",
      coolColor: "#8b9ebd",
    },
  }));
  return initializeStandalone(canvas, [
    { type: "SolidColor", props: { color: "#13161d" } },
    ...metals,
  ], options);
}
