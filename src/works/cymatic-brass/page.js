import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const readout = document.querySelector("[data-freq-readout]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing a Chladni resonance plate still.",
  starting: "Calibrating the live brass resonator.",
  reduced: "Reduced motion is on. Switch harmonic modes to inspect each nodal figure.",
  unavailable: "Live WebGPU rendering is unavailable. Switch harmonic modes to inspect each nodal figure.",
  running: "Live Chladni resonance sweep running.",
  paused: "Motion is paused. Resume to watch the standing wave transition.",
  pause: "Pause sweep",
} : {
  still: "顯示銅板共振節線靜態畫面。",
  starting: "正在啟動即時聲學共振銅盤。",
  reduced: "已減少動態，可切換三個共振頻率檢視靜態節線圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三個共振頻率檢視靜態節線圖。",
  running: "正在播放即時銅板共振掃頻。",
  paused: "已暫停動態。繼續後將重新掃描所選共振頻率。",
  pause: "暫停掃頻",
};

const modes = [
  { file: "quad", freq: "288 Hz · (2, 1)" },
  { file: "hex", freq: "512 Hz · (3, 2)" },
  { file: "lotus", freq: "768 Hz · (4, 3)" },
];
const posters = modes.map((m) => new URL(`${m.file}.webp`, poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const source = posters[index];
  if (poster.src !== source) poster.src = source;
  if (readout) readout.textContent = modes[index].freq;
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeBrass(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateBrass(renderer, next);
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

// Commercial flow: Room Acoustic Specifier & Brief Download
const form = document.querySelector("[data-acoustic-form]");
const summaryEl = document.querySelector("[data-acoustic-summary]");
const totalEl = document.querySelector("[data-acoustic-total]");
const feedbackEl = document.querySelector("[data-acoustic-feedback]");
const downloadBtn = document.querySelector("[data-download-brief]");

const systems = en ? {
  desk: { name: "Desk Resonator Ø280 mm (C260 2.5 mm)", price: 14800 },
  wall: { name: "Wall Diffuser Panel 600×600 mm (C260 3.0 mm)", price: 32000 },
  array: { name: "Spatial Acoustic Array · 4-Plate Matrix", price: 78000 },
} : {
  desk: { name: "桌面共振盤 Ø280 mm（C260 2.5 mm 黃銅）", price: 14800 },
  wall: { name: "壁面擴散銅板 600×600 mm（C260 3.0 mm 黃銅）", price: 32000 },
  array: { name: "展演場域聲學矩陣（四盤連動系統）", price: 78000 },
};

const finishCosts = { brushed: 0, oxidized: 2400 };

function getSpec() {
  const sysKey = form.elements.system.value;
  const area = Math.max(8, Math.min(400, Number(form.elements.area.value) || 24));
  const reverb = form.elements.reverb.value;
  const finish = form.elements.finish.value;
  const qty = Math.max(1, Math.min(12, Number(form.elements.quantity.value) || 1));
  const sys = systems[sysKey] ?? systems.desk;
  const total = (sys.price + (finishCosts[finish] ?? 0)) * qty;
  return { sysKey, sys, area, reverb, finish, qty, total };
}

function updateSpec() {
  if (!form) return;
  const s = getSpec();
  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const finishName = s.finish === "oxidized"
    ? (en ? "Hand-Oxidized Bronze (+NT$ 2,400/unit)" : "手工氧化古銅（每組 +NT$ 2,400）")
    : (en ? "Radial Brushed Brass (standard)" : "同心拉絲原銅（標準表面）");
  summaryEl.textContent = en
    ? `${s.qty} × ${s.sys.name} · ${finishName} · Room ${s.area} m² · Target RT60: ${s.reverb}`
    : `${s.qty} 組 × ${s.sys.name}｜${finishName}｜空間 ${s.area} m²｜殘響取向：${s.reverb}`;
}

for (const btn of document.querySelectorAll("[data-choose-system]")) {
  btn.addEventListener("click", () => {
    if (form && form.elements.system) {
      form.elements.system.value = btn.dataset.chooseSystem;
      updateSpec();
    }
  });
}

if (form) {
  form.addEventListener("input", updateSpec);
  form.addEventListener("change", updateSpec);
  updateSpec();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getSpec();
    const lines = en ? [
      "CYMATIC BRASS — Offline Acoustic Installation Brief (Concept Brand)",
      "===================================================================",
      `System: ${s.sys.name}`,
      `Quantity: ${s.qty}`,
      `Surface Finish: ${s.finish === "oxidized" ? "Hand-Oxidized Bronze" : "Radial Brushed Brass"}`,
      `Room Floor Area: ${s.area} m²`,
      `Reverberation Profile: ${s.reverb}`,
      `Indicative Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "Notice: CYMATIC BRASS is a concept studio showcase. No inquiry or payment was transmitted.",
    ] : [
      "銅頻 CYMATIC BRASS — 離線聲學配置提案單（概念品牌示意）",
      "===================================================================",
      `聲學方案：${s.sys.name}`,
      `配置組數：${s.qty} 組`,
      `表面處理：${s.finish === "oxidized" ? "手工氧化古銅" : "同心拉絲原銅"}`,
      `空間面積：${s.area} m²`,
      `殘響目標：${s.reverb}`,
      `示意估算費用：NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "提醒：銅頻為概念品牌作品展示，本操作僅於本機匯出文字提案單，未送出任何委託或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cymatic-brass-brief.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Acoustic brief saved locally (cymatic-brass-brief.txt). No online request was sent."
      : "已於本機下載聲學配置提案單（cymatic-brass-brief.txt），未進行線上傳送。";
  });
}
