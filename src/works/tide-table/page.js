import { createMotion, observeMotion } from "../../shared/motion.js";
import { initializePlanner } from "./planner.js";

initializePlanner();

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const controls = document.querySelector("[data-controls]");
const buttons = [...controls.querySelectorAll("[data-tide]")];
const cycle = controls.querySelector("[data-cycle]");
const pause = controls.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const english = document.documentElement.lang === "en";
const copy = english ? {
  unavailable: "Showing still charts.",
  reduced: "Showing still charts for reduced motion.",
  pause: "Pause", resume: "Resume",
} : {
  unavailable: "目前顯示靜態圖。",
  reduced: "依減少動態偏好顯示靜態圖。",
  pause: "暫停", resume: "繼續",
};

let settings = { level: "cycle" };
let shader;
let paused = false;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeTide(canvas, options);
  },
  applySettings(renderer, next) {
    shader.applyTide(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") stage.dataset.live = "true";
    if (["starting", "reduced", "unavailable", "still"].includes(phase)) delete stage.dataset.live;
    const fallback = phase === "reduced" || phase === "unavailable";
    pause.hidden = cycle.hidden = fallback;
    status.textContent = copy[phase] ?? "";
    reflectSelection();
  },
});

function reflectSelection() {
  const playingCycle = settings.level === "cycle" && !cycle.hidden;
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(!playingCycle && button.dataset.tide === stage.dataset.tide));
  }
  cycle.setAttribute("aria-pressed", String(playingCycle));
}

function select(level, index) {
  settings = { level };
  stage.dataset.level = level === "cycle" ? "low" : level;
  stage.dataset.tide = index;
  if (paused) delete stage.dataset.live;
  reflectSelection();
  motion.setSettings(settings);
}

stage.dataset.tide = "0";
for (const button of buttons) {
  button.addEventListener("click", () => {
    const index = button.dataset.tide;
    select(["low", "mid", "high"][Number(index)], index);
  });
}
cycle.addEventListener("click", () => select("cycle", "0"));
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});

controls.hidden = false;
if (hasObservers) observeMotion(stage, motion, preference);
else motion.update({ active: true, reduced: preference.matches });
