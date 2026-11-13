import { createMotion, observeMotion } from "../../shared/motion.js";
import { initializeBrief } from "./brief.js";

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const controls = document.querySelector("[data-controls]");
const angle = controls.querySelector("[type=range]");
const angleOutput = controls.querySelector("output");
const pause = controls.querySelector("[data-pause]");
const reset = controls.querySelector("[data-reset]");
const status = controls.querySelector("[data-motion-status]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const english = document.documentElement.lang === "en";
const copy = english ? {
  still: "Showing the still paper surface.",
  reduced: "Reduced motion is on. You can still adjust the light.",
  unavailable: "The still paper surface is shown. You can adjust the light.",
  paused: "Light and paper are frozen. Resume to apply any light adjustments.",
  starting: "Preparing the light.",
  running: "Move across the paper to change the light.",
  pause: "Pause motion",
  resume: "Resume motion",
} : {
  still: "顯示靜態紙面。",
  reduced: "已依系統偏好減少動態，仍可調整靜態紙面的光線。",
  unavailable: "目前無法即時渲染，仍可調整靜態紙面的光線。",
  paused: "已凍結紙面與光線。繼續動態後套用新的光線設定。",
  starting: "正在準備即時光線。",
  running: "在紙面上移動即可改變光線。",
  pause: "暫停動態",
  resume: "繼續動態",
};

const defaults = { angle: Number(angle.defaultValue), preset: "dawn" };
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = defaults;
let manuallyPaused = false;
let shaderModule;

const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: defaults,
  async initialize(options) {
    shaderModule = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shaderModule.initializePaperLight(canvas, options);
  },
  applySettings(renderer, next) {
    shaderModule.applyPaperLight(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") stage.dataset.surface = "rendered";
    if (phase === "starting" || phase === "reduced" || phase === "unavailable") delete stage.dataset.surface;
    status.textContent = copy[phase];
    pause.disabled = phase === "reduced" || phase === "unavailable";
  },
});

function applyLight(next) {
  settings = next;
  angleOutput.value = `${settings.angle}°`;
  stage.style.setProperty("--light-angle", `${settings.angle}deg`);
  stage.dataset.preset = settings.preset;
  motion.setSettings(settings);
}

function setPause(next) {
  manuallyPaused = next;
  pause.textContent = manuallyPaused ? copy.resume : copy.pause;
  motion.update({ paused: manuallyPaused });
}

let pointerFrame = 0;
let pointerX = 0;
function moveLight(event) {
  if (!event.isPrimary || (event.pointerType === "touch" && event.type === "pointermove" && !event.buttons)) return;
  pointerX = event.clientX;
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = 0;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width) return;
    const degrees = Math.max(0, Math.min(180, Math.round(180 * (pointerX - bounds.left) / bounds.width)));
    if (settings.angle === degrees) return;
    angle.value = degrees;
    applyLight({ ...settings, angle: degrees });
  });
}

stage.addEventListener("pointerdown", moveLight);
stage.addEventListener("pointermove", moveLight);
angle.addEventListener("input", () => applyLight({ ...settings, angle: angle.valueAsNumber }));
controls.addEventListener("change", (event) => {
  if (event.target.name === "light-preset") applyLight({ ...settings, preset: event.target.value });
});
pause.addEventListener("click", () => setPause(!manuallyPaused));
reset.addEventListener("click", () => {
  angle.value = defaults.angle;
  controls.querySelector('[value="dawn"]').checked = true;
  applyLight(defaults);
  setPause(false);
});

controls.hidden = false;
initializeBrief();
window.addEventListener("pagehide", () => { delete stage.dataset.surface; });
if (hasObservers) {
  observeMotion(stage, motion, preference);
} else {
  motion.update({ active: true, reduced: preference.matches });
  preference.addEventListener("change", () => motion.update({ reduced: preference.matches }));
}
