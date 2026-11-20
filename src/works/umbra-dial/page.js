import { createMotion, observeMotion } from "../../shared/motion.js";
import "./planner.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";
const labels = en ? {
  still: "Showing an eclipse still.",
  starting: "Preparing the live eclipse.",
  reduced: "Reduced motion is on. Use the phase dial to view eclipse stills.",
  unavailable: "Live rendering is unavailable. Use the phase dial to view eclipse stills.",
  running: "Live eclipse running.",
  paused: "Motion is paused. Resume to see a new phase in the live eclipse.",
  pause: "Pause motion",
} : {
  still: "顯示日食靜態畫面。",
  starting: "正在準備即時日食畫面。",
  reduced: "已減少動態，可切換三個日食階段的靜態畫面。",
  unavailable: "即時畫面目前無法使用，可切換三個日食階段的靜態畫面。",
  running: "正在播放即時日食畫面。",
  paused: "已暫停動態。繼續播放後會顯示新選的日食階段。",
  pause: "暫停動態",
};

const names = ["ingress", "total", "egress"];
const posters = names.map(name => new URL(name + ".webp", poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const source = posters[index];
  if (poster.src !== source) poster.src = source;
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeEclipse(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateEclipse(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") rendered = true;
    if (["starting", "unavailable", "reduced"].includes(phase)) rendered = false;
    if (!rendered) showStill(settings.index);
    stage.toggleAttribute("data-rendered", rendered);
    pause.disabled = phase === "reduced" || phase === "unavailable";
    status.textContent = labels[phase];
  },
});

for (const radio of radios) {
  radio.addEventListener("change", () => {
    const index = Number(radio.value);
    settings = { index, preset: index };
    stage.dataset.material = radio.value;
    showStill(index);
    motion.setSettings(settings);
  });
}
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? pause.dataset.play : labels.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
window.addEventListener("pagehide", () => {
  rendered = false;
  stage.removeAttribute("data-rendered");
});
dial.hidden = false;
pause.hidden = !navigator.gpu || !canWatch;
if (canWatch) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });
