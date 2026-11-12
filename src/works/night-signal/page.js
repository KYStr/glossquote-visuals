import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const poster = stage.querySelector("img");
const controls = document.querySelector("[data-controls]");
const intensity = controls.querySelector("[type=range]");
const output = controls.querySelector("output");
const pause = controls.querySelector("[data-pause]");
const status = controls.querySelector("[data-motion-status]");
const title = document.querySelector("[data-channel-title]");
const summary = document.querySelector("[data-channel-summary]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const labels = document.documentElement.lang === "en" ? {
  still: "Showing the still poster.", reduced: "Reduced motion is on. Channels change the still poster.",
  unavailable: "Live rendering is unavailable. Channels change the still poster.",
  paused: "Motion paused. You can still tune the poster.",
  starting: "Preparing the live signal.", running: "Live signal.",
  pause: "Pause motion", resume: "Resume motion",
} : {
  still: "顯示靜態海報。", reduced: "已依系統偏好減少動態，切換頻道可調整靜態海報。",
  unavailable: "目前無法即時渲染，切換頻道可調整靜態海報。",
  paused: "動態已暫停，仍可調整靜態海報。",
  starting: "正在準備即時訊號。", running: "正在即時呈現訊號。",
  pause: "暫停動態", resume: "繼續動態",
};

const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = { intensity: Number(intensity.defaultValue), channel: "carrier" };
let paused = false;
let shaderModule;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: settings,
  async initialize(options) {
    shaderModule = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shaderModule.initializeSignal(canvas, options);
  },
  applySettings(renderer, next) {
    shaderModule.applySignal(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    status.textContent = labels[phase];
    pause.disabled = phase === "reduced" || phase === "unavailable";
  },
});

intensity.addEventListener("input", () => {
  settings = { ...settings, intensity: intensity.valueAsNumber };
  stage.style.setProperty("--stripe-opacity", String(0.15 + settings.intensity * 0.003));
  output.value = `${settings.intensity}%`;
  motion.setSettings(settings);
});
controls.addEventListener("change", (event) => {
  if (event.target.name !== "channel") return;
  const channel = event.target.value;
  const program = document.getElementById(`program-${channel}`);
  settings = { ...settings, channel };
  stage.dataset.channel = channel;
  title.textContent = program.querySelector("h3").textContent;
  summary.textContent = program.dataset.summary;
  poster.alt = program.dataset.summary;
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
