import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import paint from "./jelly.wgsl?raw";

const id = "jelly-surface";
const settledIntro = 1.23;
const travelMs = 480;
const maxBackingWidth = 392;
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

function backingRatio() {
  // Match the pixel ratio applied by the pinned Shaders standalone renderer.
  const viewportLength = Math.max(innerWidth, innerHeight);
  const mobile = matchMedia("(pointer: coarse)").matches && viewportLength > 0 && viewportLength <= 1366;
  return Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
}

function renderSize(width, height, ratio) {
  const scale = Math.min(1, maxBackingWidth / width) / ratio;
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export async function initializeJelly(canvas, options) {
  const { settings, skipOpening, onScoopSettled } = options;
  const introOffset = skipOpening ? settledIntro : 0;
  let currentCut = settings.cut;
  let elapsed = travelMs;
  let frame;
  let lastFrame;
  let playing = true;
  let ratio = backingRatio();
  let { width, height } = options;
  const initialSize = renderSize(width, height, ratio);
  // Core reads the actual rectangle during each device initialization.
  // Expand it for display only after the renderer has sized its backing store.
  delete canvas.dataset.displaySize;

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
    ...initialSize,
    onReady() {
      if (ready) {
        skipRecoveredOpening = true;
        raw?.update(id, { introOffset: settledIntro });
        if (playing && elapsed < travelMs && frame === undefined) frame = requestAnimationFrame(tick);
      }
      canvas.dataset.displaySize = "";
      ready = true;
      options.onReady();
    },
    onError(reason) {
      stop();
      delete canvas.dataset.displaySize;
      ratio = backingRatio();
      const size = renderSize(width, height, ratio);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
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
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const size = renderSize(width, height, ratio);
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
      delete canvas.dataset.displaySize;
      raw.destroy();
    },
  };
}
