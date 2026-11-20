import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./jelly.wgsl?raw";

const id = "jelly-surface";
const settledIntro = 1.23;
const travelMs = 480;
const surface = registerShader(defineShader({
  name: "JellyHourMold",
  animatedTime: { speed: "speed" },
  props: {
    speed: { default: 1 },
    flavor: { default: 0 },
    introOffset: { default: 0 },
    scooped: { default: 0 },
    cutX: { default: 0 },
    cutZ: { default: 0 },
    scoopProgress: { default: 1 },
  },
  paint: wgsl(paint),
}));

function renderSize(width, height) {
  // The soft reflections tolerate a fixed upper pixel budget on wide stages.
  const scale = Math.min(1, 560 / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function initializeJelly(canvas, options) {
  const { settings, skipOpening, onScoopSettled } = options;
  const introOffset = skipOpening ? settledIntro : 0;
  let currentCut = settings.cut;
  let elapsed = travelMs;
  let frame;
  let lastFrame;
  let playing = true;

  let ready = false;
  let skipRecoveredOpening = false;
  let raw;
  raw = await initializeStandalone(canvas, [
    { id, type: surface.name, props: {
      flavor: settings.flavor, introOffset,
      scooped: Number(Boolean(currentCut)), cutX: currentCut?.x ?? 0, cutZ: currentCut?.z ?? 0,
    } },
  ], {
    ...options,
    ...renderSize(options.width, options.height),
    onReady() {
      if (ready) {
        skipRecoveredOpening = true;
        raw?.update(id, { introOffset: settledIntro });
        if (playing && elapsed < travelMs && frame === undefined) frame = requestAnimationFrame(tick);
      }
      ready = true;
      options.onReady();
    },
    onError(reason) {
      stop();
      options.onError(reason);
    },
  });
  if (!raw) return null;

  function stop() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    lastFrame = undefined;
  }

  function tick(now) {
    frame = undefined;
    if (lastFrame !== undefined) elapsed = Math.min(travelMs, elapsed + now - lastFrame);
    lastFrame = now;
    raw.update(id, { scoopProgress: elapsed / travelMs });
    if (elapsed < travelMs) frame = requestAnimationFrame(tick);
    else onScoopSettled(currentCut);
  }

  return {
    getFailureReason: raw.getFailureReason,
    resize(width, height) {
      const size = renderSize(width, height);
      raw.resize(size.width, size.height);
    },
    select(next) {
      const moved = currentCut !== next.cut;
      currentCut = next.cut;
      if (moved) {
        stop();
        elapsed = currentCut && next.animate ? 0 : travelMs;
      }
      raw.update(id, {
        flavor: next.flavor,
        introOffset: next.skipOpening || skipRecoveredOpening ? settledIntro : introOffset,
        scooped: Number(Boolean(currentCut)),
        cutX: currentCut?.x ?? 0,
        cutZ: currentCut?.z ?? 0,
        scoopProgress: elapsed / travelMs,
      });
      if (moved && currentCut) {
        if (elapsed < travelMs && playing) frame = requestAnimationFrame(tick);
        else if (elapsed === travelMs) onScoopSettled(currentCut);
      }
    },
    pause() {
      playing = false;
      stop();
      raw.pause();
    },
    resume() {
      playing = true;
      raw.resume();
      if (elapsed < travelMs && frame === undefined) frame = requestAnimationFrame(tick);
    },
    destroy() {
      stop();
      raw.destroy();
    },
  };
}
