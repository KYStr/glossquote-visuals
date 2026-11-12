import { createMotion, observeMotion } from "../../shared/motion.js";
import { setupTickets } from "./tickets.js";

const english = document.documentElement.lang === "en";
const labels = english ? {
  still: "Showing the still poster.",
  reduced: "Reduced motion is on. Showing the still poster.",
  unavailable: "Live rendering is unavailable. Showing the still poster.",
  paused: "Motion paused. Showing the still poster.",
  starting: "Preparing the live signal.",
  running: "Live signal.",
  static: "Still poster",
  pause: "Pause motion",
  resume: "Resume motion",
} : {
  still: "顯示靜態海報。",
  reduced: "已依系統偏好減少動態，顯示靜態海報。",
  unavailable: "目前無法即時渲染，顯示靜態海報。",
  paused: "動態已暫停，顯示靜態海報。",
  starting: "正在準備即時訊號。",
  running: "正在即時呈現訊號。",
  static: "靜態海報",
  pause: "暫停動態",
  resume: "繼續動態",
};

const stage = document.querySelector("[data-stage]");
const canvas = stage.querySelector("canvas");
const heroProgram = document.querySelector("[data-hero-program]");
const controls = document.querySelector("[data-motion-controls]");
const pause = controls.querySelector("[data-pause]");
const status = controls.querySelector("[data-motion-status]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const programs = [...document.querySelectorAll("[data-act]")].map((row) => ({
  id: row.dataset.act,
  title: row.querySelector("[data-act-title]").textContent,
  description: row.querySelector("[data-act-description]"),
  control: row.querySelector("[data-act-select]"),
  radio: row.querySelector("input"),
}));
const activeProgram = () => programs.find(({ radio }) => radio.checked) ?? programs[0];
const tickets = setupTickets(english);

let paused = false;
let shaderModule;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: { channel: activeProgram().id },
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
    pause.textContent = labels[pause.disabled ? "static" : paused ? "resume" : "pause"];
  },
});

function selectProgram() {
  const active = activeProgram();
  for (const program of programs) program.description.hidden = program !== active;
  stage.dataset.channel = active.id;
  heroProgram.textContent = active.title;
  motion.setSettings({ channel: active.id });
  tickets.suggestSet(active.id);
}

for (const { control, radio } of programs) {
  control.hidden = false;
  radio.addEventListener("change", selectProgram);
}
selectProgram();
document.querySelector("[data-program-hint]").hidden = false;

pause.addEventListener("click", () => {
  paused = !paused;
  motion.update({ paused });
});
controls.hidden = false;
if (hasObservers) {
  observeMotion(stage, motion, preference);
} else {
  motion.update({ active: true, reduced: preference.matches });
  preference.addEventListener("change", () => motion.update({ reduced: preference.matches }));
}
