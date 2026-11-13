import { createMotion, observeMotion } from "../../shared/motion.js";
import { initializeBrief } from "./brief.js";

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const controls = document.querySelector("[data-controls]");
const pause = controls.querySelector("[data-pause]");
const pulse = controls.querySelector("[data-pulse]");
const status = document.querySelector("[data-motion-status]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const english = document.documentElement.lang === "en";
const copy = english ? {
  still: "Still form",
  reduced: "Still form · reduced motion",
  unavailable: "Still form · live motion unavailable",
  paused: "Live form paused",
  starting: "Preparing the live form",
  running: "Move over the form or tap Scatter",
  pause: "Pause", resume: "Resume",
} : {
  still: "靜態造型",
  reduced: "靜態造型・已減少動態",
  unavailable: "靜態造型・無法即時渲染",
  paused: "即時造型已暫停",
  starting: "正在準備即時造型",
  running: "移過造型或點選「散開」",
  pause: "暫停", resume: "繼續",
};

let settings = { form: "identity", pulse: false, pointer: false };
let lastApplied;
let paused = false;
let pulseTimer;
let shader;
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    lastApplied = options.settings;
    return shader.initializeAeriform(canvas, options);
  },
  applySettings(renderer, next) {
    shader.applyAeriform(renderer, next, lastApplied);
    lastApplied = next;
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") stage.dataset.live = "true";
    if (["starting", "reduced", "unavailable"].includes(phase)) delete stage.dataset.live;
    if (phase === "still" && !stage.getBoundingClientRect().width) delete stage.dataset.live;
    status.textContent = copy[phase];
    pause.hidden = phase === "reduced" || phase === "unavailable";
    pulse.hidden = pause.hidden;
    pulse.disabled = phase !== "running";
  },
});

const formButtons = [...controls.querySelectorAll("[data-form]")];
function chooseForm(form) {
  clearTimeout(pulseTimer);
  settings = { ...settings, form, pulse: false };
  for (const button of formButtons) button.setAttribute("aria-pressed", String(button.dataset.form === form));
  stage.dataset.form = form;
  motion.setSettings(settings);
}

function setPulse(value) {
  settings = { ...settings, pulse: value };
  motion.setSettings(settings);
}

function setPointer(active) {
  if (settings.pointer === active) return;
  settings = { ...settings, pointer: active };
  motion.setSettings(settings);
}

stage.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") setPointer(true);
});
stage.addEventListener("pointerleave", () => setPointer(false));

for (const button of formButtons) button.addEventListener("click", () => chooseForm(button.dataset.form));
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
pulse.addEventListener("click", () => {
  clearTimeout(pulseTimer);
  setPulse(true);
  pulseTimer = setTimeout(() => setPulse(false), 850);
});
window.addEventListener("pagehide", () => {
  delete stage.dataset.live;
  clearTimeout(pulseTimer);
  setPulse(false);
});

controls.hidden = false;
initializeBrief(chooseForm);
if (hasObservers) observeMotion(stage, motion, preference);
else motion.update({ active: true, reduced: preference.matches });
