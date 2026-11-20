
import { createMotion, observeMotion } from "../../shared/motion.js";
import { initializeSheet } from "./sheet.js";

const stage = document.querySelector("[data-stage]");
const controls = document.querySelector("[data-controls]");
const buttons = [...controls.querySelectorAll("[data-weave-control]")];
const pause = controls.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const plateId = document.querySelector("[data-plate-id]");
const plateName = document.querySelector("[data-plate-name]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const english = document.documentElement.lang === "en";
const labels = english ? {
  still: "Still swatch",
  starting: "Preparing raking light",
  running: "Raking light",
  paused: "Light paused",
  reduced: "Still swatch · reduced motion",
  unavailable: "Still swatch · live light unavailable",
  pause: "Pause light",
  resume: "Resume light",
} : {
  still: "靜態布樣",
  starting: "準備斜側光中",
  running: "斜側光觀察",
  paused: "側光已暫停",
  reduced: "靜態布樣・已減少動態",
  unavailable: "靜態布樣・即時照明無法使用",
  pause: "暫停側光",
  resume: "繼續側光",
};

let shader;
let paused = false;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: { pattern: 0 },
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeCloth(stage.querySelector("canvas"), options);
  },
  applySettings(renderer, settings) {
    shader.applyCloth(renderer, settings);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") stage.dataset.live = "true";
    if (["starting", "reduced", "unavailable"].includes(phase)) delete stage.dataset.live;
    status.textContent = labels[phase];
    pause.hidden = phase === "reduced" || phase === "unavailable";
  },
});

for (const [pattern, button] of buttons.entries()) {
  button.addEventListener("click", () => {
    const weave = button.dataset.weaveControl;
    if (weave === stage.dataset.weave) return;
    if (stage.dataset.motion !== "running") delete stage.dataset.live;
    stage.dataset.weave = weave;
    plateId.textContent = document.querySelector(`[data-fabric="${weave}"]`).dataset.id;
    plateName.textContent = button.querySelector("[data-weave-name]").textContent;
    for (const choice of buttons) choice.setAttribute("aria-pressed", String(choice === button));
    motion.setSettings({ pattern });
  });
}

pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? labels.resume : labels.pause;
  motion.update({ paused });
});

window.addEventListener("pagehide", () => delete stage.dataset.live);
controls.hidden = false;
if (hasObservers) observeMotion(stage, motion, preference);
else motion.update({ active: true, reduced: preference.matches });

initializeSheet(english);
