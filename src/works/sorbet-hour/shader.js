import { defineShader, registerShader, schema } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";
import { paintCachedPose, prepareJellyMaterial } from "./pose-cache.js";

const id = "jelly-surface";
const duration = 3650;
const maxBackingWidth = 576;
const targetBackingRatio = 1.15;
const surface = registerShader(defineShader({
  name: "JellyHourMold",
  animatedTime: { speed: "speed" },
  props: {
    speed: { default: 1 },
    flavor: { default: 0 },
    biteTime: { default: 0 },
    scooped: { default: 0 },
    cutX: { default: 0 },
    cutZ: { default: 0 },
    retained: { default: 0 },
  },
  extraFields: { glintDrift: { schema: schema.f32, initial: 0 } },
  gpu: { fragment: paintCachedPose },
}));

function backingRatio() {
  // Match the pixel ratio applied by the pinned Shaders standalone renderer.
  const viewportLength = Math.max(innerWidth, innerHeight);
  const mobile = matchMedia("(pointer: coarse)").matches && viewportLength > 0 && viewportLength <= 1366;
  return Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
}

function renderSize(width, ratio) {
  const logicalWidth = Math.max(1, Math.floor(Math.min(width * targetBackingRatio, maxBackingWidth) / ratio));
  // The photographed stage keeps a 3:2 aspect ratio at every breakpoint.
  return { width: logicalWidth, height: Math.max(1, Math.round(logicalWidth * 2 / 3)) };
}

function phaseAt(elapsed) {
  if (elapsed < 1230) return "approach";
  if (elapsed < 1630) return "press";
  if (elapsed < 1940) return "cut";
  if (elapsed < duration) return "lift";
  return "held";
}

export async function initializeJelly(canvas, options) {
  await prepareJellyMaterial();
  if (options.signal.aborted) return null;
  const { onProgress } = options;
  let scene = options.settings;
  let elapsed = scene.cut && scene.animate ? 0 : duration;
  let frame;
  let previous;
  let playing = true;
  let drawable = false;
  let ratio = backingRatio();
  let { width } = options;
  let raw;
  delete canvas.dataset.displaySize;

  function props() {
    return {
      flavor: scene.flavor,
      scooped: Number(Boolean(scene.cut)),
      cutX: scene.cut?.x ?? 0,
      cutZ: scene.cut?.z ?? 0,
      retained: scene.retained ?? 0,
      biteTime: scene.cut ? elapsed / 1000 : 0,
    };
  }

  function stop() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    previous = undefined;
  }

  function advance(now) {
    frame = undefined;
    if (previous !== undefined) elapsed = Math.min(duration, elapsed + now - previous);
    previous = now;
    raw.update(id, { biteTime: elapsed / 1000 });
    onProgress(scene.run, phaseAt(elapsed), elapsed);
    schedule();
  }

  function schedule() {
    if (raw && drawable && playing && scene.cut && elapsed < duration && frame === undefined) {
      frame = requestAnimationFrame(advance);
    }
  }

  raw = await initializeStandalone(canvas, [{ id, type: surface.name, props: props() }], {
    ...options,
    ...renderSize(width, ratio),
    onReady() {
      drawable = true;
      canvas.dataset.displaySize = "";
      if (scene.cut && elapsed >= duration) onProgress(scene.run, "held", elapsed);
      options.onReady();
      schedule();
    },
    onError(reason) {
      drawable = false;
      stop();
      delete canvas.dataset.displaySize;
      ratio = backingRatio();
      const size = renderSize(width, ratio);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
      options.onError(reason);
    },
  });
  if (!raw) return null;
  if (!options.signal.aborted) schedule();

  return {
    getFailureReason: raw.getFailureReason,
    resize(nextWidth) {
      width = nextWidth;
      const size = renderSize(width, ratio);
      raw.resize(size.width, size.height);
    },
    select(next) {
      if (scene.run !== next.run) {
        stop();
        elapsed = next.cut && next.animate ? 0 : duration;
      }
      scene = next;
      raw.update(id, props());
      if (scene.cut) onProgress(scene.run, phaseAt(elapsed), elapsed);
      schedule();
    },
    pause() {
      playing = false;
      stop();
      raw.pause();
    },
    resume() {
      playing = true;
      raw.resume();
      schedule();
    },
    destroy() {
      stop();
      delete canvas.dataset.displaySize;
      raw.destroy();
    },
  };
}
