import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const still = stage.querySelector("img");
const controls = document.querySelector("[data-controls]");
const angle = controls.querySelector("[type=range]");
const output = controls.querySelector("output");
const pause = controls.querySelector("[data-pause]");
const status = controls.querySelector("[data-motion-status]");
const title = document.querySelector("[data-object-title]");
const note = document.querySelector("[data-object-note]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const labels = document.documentElement.lang === "en" ? {
  still: "Showing the still object.", reduced: "Reduced motion is on. The still objects remain adjustable.",
  unavailable: "Live rendering is unavailable. The still objects remain adjustable.",
  paused: "Motion paused. The still objects remain adjustable.",
  starting: "Preparing the live reflection.", running: "Live reflection study.",
  pause: "Pause motion", resume: "Resume motion",
} : {
  still: "顯示靜態物件。", reduced: "已依系統偏好減少動態，仍可切換靜態物件。",
  unavailable: "目前無法即時渲染，仍可切換靜態物件。",
  paused: "動態已暫停，仍可調整靜態物件。",
  starting: "正在準備即時反射。", running: "正在即時呈現反射。",
  pause: "暫停動態", resume: "繼續動態",
};

const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = { angle: Number(angle.defaultValue), object: "ring" };
let paused = false;
let shaderModule;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: settings,
  async initialize(options) {
    shaderModule = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shaderModule.initializeLiquid(canvas, options);
  },
  applySettings(renderer, next) {
    shaderModule.applyLiquid(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    status.textContent = labels[phase];
    pause.disabled = phase === "reduced" || phase === "unavailable";
  },
});

angle.addEventListener("input", () => {
  settings = { ...settings, angle: angle.valueAsNumber };
  stage.style.setProperty("--orientation", `${settings.angle}deg`);
  output.value = `${settings.angle}°`;
  motion.setSettings(settings);
});
controls.addEventListener("change", (event) => {
  if (event.target.name !== "object") return;
  const object = event.target.value;
  const description = document.getElementById(`object-${object}`);
  settings = { ...settings, object };
  stage.dataset.object = object;
  still.src = `${import.meta.env.BASE_URL}media/liquid-${object}.svg`;
  still.alt = description.dataset.summary;
  title.textContent = description.querySelector("h3").textContent;
  note.textContent = description.dataset.summary;
  motion.setSettings(settings);
});
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = labels[paused ? "resume" : "pause"];
  motion.update({ paused });
});
controls.hidden = false;
if (hasObservers) {
  observeMotion(stage, motion, preference);
} else {
  motion.update({ active: true, reduced: preference.matches });
  preference.addEventListener("change", () => motion.update({ reduced: preference.matches }));
}
