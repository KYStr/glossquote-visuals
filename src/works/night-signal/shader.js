import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./signal.wgsl?raw";

const sculpture = registerShader(defineShader({
  name: "NightSignalSculpture",
  animatedTime: { speed: "tempo" },
  props: {
    wide: { default: 1 },
    echoMix: { default: 0 },
    dawnMix: { default: 0 },
    tempo: { default: 1 / 10 },
  },
  paint: wgsl(paint),
}));

const channels = {
  carrier: { echoMix: 0, dawnMix: 0, tempo: 1 / 10 },
  echo: { echoMix: 1, dawnMix: 0, tempo: 1 / 8 },
  dawn: { echoMix: 0, dawnMix: 1, tempo: 1 / 12 },
};
const layer = "signal";
const duration = 940;
const isWide = () => matchMedia("(min-width: 55.001rem)").matches ? 1 : 0;

export function applySignal(renderer, { channel }) {
  renderer.select(channel);
}

export async function initializeSignal(canvas, options) {
  let current = channels[options.settings.channel];
  let channel = options.settings.channel;
  let start = current;
  let elapsed = duration;
  let previous;
  let animation;
  const renderer = await initializeStandalone(canvas, [
    { id: layer, type: sculpture.name, props: { ...current, wide: isWide() } },
  ], options);

  function stop() {
    if (animation !== undefined) cancelAnimationFrame(animation);
    animation = undefined;
    previous = undefined;
  }

  function animate(now) {
    if (previous !== undefined) elapsed = Math.min(duration, elapsed + now - previous);
    previous = now;
    const fraction = elapsed / duration;
    const weight = fraction * fraction * (3 - 2 * fraction);
    const end = channels[channel];
    current = {
      echoMix: start.echoMix + (end.echoMix - start.echoMix) * weight,
      dawnMix: start.dawnMix + (end.dawnMix - start.dawnMix) * weight,
      tempo: start.tempo + (end.tempo - start.tempo) * weight,
    };
    renderer.update(layer, current);
    animation = elapsed < duration ? requestAnimationFrame(animate) : undefined;
  }

  return {
    select(next) {
      if (next === channel) return;
      stop();
      start = current;
      channel = next;
      elapsed = 0;
      animation = requestAnimationFrame(animate);
    },
    pause() {
      stop();
      renderer.pause();
    },
    resume() {
      renderer.resume();
      if (elapsed < duration && animation === undefined) animation = requestAnimationFrame(animate);
    },
    resize(width, height) {
      renderer.update(layer, { wide: isWide() });
      renderer.resize(width, height);
    },
    destroy() {
      stop();
      renderer.destroy();
    },
    getFailureReason: renderer.getFailureReason,
  };
}
