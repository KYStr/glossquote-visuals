import { createMotion, observeMotion } from "../../shared/motion.js";

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
  still: "Showing a stoneware glaze still.",
  starting: "Warming up the live kiln glaze.",
  reduced: "Reduced motion is on. Switch glazes to inspect each fired still.",
  unavailable: "Live WebGPU rendering is unavailable. Switch glazes to inspect each fired still.",
  running: "Live kiln glaze flow running.",
  paused: "Motion is paused. Resume to see a new glaze melt live.",
  pause: "Pause motion",
} : {
  still: "顯示柴窯釉色靜態畫面。",
  starting: "正在準備即時窯釉流動畫。",
  reduced: "已減少動態，可切換三種釉色檢視燒成靜圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三種釉色檢視燒成靜圖。",
  running: "正在播放即時窯釉流動畫面。",
  paused: "已暫停動態。繼續播放後會顯示新選釉色的即時流動。",
  pause: "暫停動態",
};

const names = ["celadon", "tenmoku", "ash"];
const posters = names.map((name) => new URL(`${name}.webp`, poster.src).href);
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
    return shader.initializeKiln(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateKiln(renderer, next);
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
    const glazeSelect = document.querySelector("#kiln-glaze-select");
    if (glazeSelect && glazeSelect.options[index]) {
      glazeSelect.selectedIndex = index;
      updateCommission();
    }
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

// Commercial flow: Kiln commission builder & offline specification download
const form = document.querySelector("[data-commission-form]");
const summaryEl = document.querySelector("[data-commission-summary]");
const totalEl = document.querySelector("[data-commission-total]");
const feedbackEl = document.querySelector("[data-commission-feedback]");
const downloadBtn = document.querySelector("[data-download-spec]");

const vessels = en ? {
  chawan: { name: "Chawan Tea Bowl (Ø12.5 × H7.8 cm)", price: 2400 },
  plate: { name: "Rim Dining Plate (Ø24.0 × H2.6 cm)", price: 1850 },
  pitcher: { name: "Katakuchi Pouring Pitcher (320 ml)", price: 3100 },
} : {
  chawan: { name: "茶碗 Chawan（口徑 12.5 × 高 7.8 cm）", price: 2400 },
  plate: { name: "平皿 Rim Plate（直徑 24.0 × 高 2.6 cm）", price: 1850 },
  pitcher: { name: "片口 Pouring Pitcher（容量 320 ml）", price: 3100 },
};

const glazeLabels = en
  ? ["Celadon Crackle (1280°C Reduction)", "Iron Oil-Spot Tenmoku (1280°C)", "Natural Wood-Ash Melt (1280°C)"]
  : ["青瓷冰裂（1280°C 還原燒）", "天目油滴（1280°C 高溫結晶）", "草木灰流（1280°C 自然落灰）"];

const packCosts = { kraft: 0, paulownia: 380 };

function getCommissionState() {
  const vesselKey = form.elements.vessel.value;
  const glazeIndex = Number(form.elements.glaze.value);
  const qty = Math.max(1, Math.min(24, Number(form.elements.quantity.value) || 1));
  const batch = form.elements.batch.value;
  const packaging = form.elements.packaging.value;
  const note = form.elements.note.value.trim();
  const vessel = vessels[vesselKey] ?? vessels.chawan;
  const unit = vessel.price + (packCosts[packaging] ?? 0);
  const total = unit * qty;
  return { vesselKey, vessel, glazeIndex, glazeName: glazeLabels[glazeIndex] ?? glazeLabels[0], qty, batch, packaging, note, unit, total };
}

function updateCommission() {
  if (!form) return;
  const s = getCommissionState();
  const fmt = (n) => `NT$ ${n.toLocaleString("en-US")}`;
  totalEl.textContent = fmt(s.total);
  const packLabel = s.packaging === "paulownia"
    ? (en ? "Paulownia wood box (+NT$ 380/pc)" : "桐木收藏盒（每件 +NT$ 380）")
    : (en ? "Recycled studio wrap (included)" : "工坊再生紙包（含於售價）");

  summaryEl.textContent = en
    ? `${s.qty} × ${s.vessel.name} · ${s.glazeName} · ${packLabel} · Indicative firing: ${s.batch}`
    : `${s.qty} 件 × ${s.vessel.name}｜${s.glazeName}｜${packLabel}｜示意窯期：${s.batch}`;
}

for (const btn of document.querySelectorAll("[data-choose-vessel]")) {
  btn.addEventListener("click", () => {
    const key = btn.dataset.chooseVessel;
    if (form && form.elements.vessel) {
      form.elements.vessel.value = key;
      updateCommission();
    }
  });
}

if (form) {
  form.addEventListener("input", updateCommission);
  form.addEventListener("change", updateCommission);
  updateCommission();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getCommissionState();
    const lines = en ? [
      "KILN GLAZE — Offline Commission Specification (Concept Brand)",
      "============================================================",
      `Vessel: ${s.vessel.name}`,
      `Glaze Formula: ${s.glazeName}`,
      `Quantity: ${s.qty}`,
      `Packaging: ${s.packaging === "paulownia" ? "Paulownia wood box (+NT$ 380/pc)" : "Recycled studio wrap"}`,
      `Indicative Firing Batch: ${s.batch}`,
      `Indicative Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      `Notes: ${s.note || "None"}`,
      "",
      "Notice: KILN GLAZE is a concept studio showcase. No order or payment was submitted.",
    ] : [
      "窯釉 KILN GLAZE — 離線器皿訂製規格單（概念品牌示意）",
      "============================================================",
      `器皿款式：${s.vessel.name}`,
      `釉色配方：${s.glazeName}`,
      `訂製數量：${s.qty} 件`,
      `包裝方式：${s.packaging === "paulownia" ? "桐木收藏盒（每件 +NT$ 380）" : "工坊再生紙包"}`,
      `示意窯期：${s.batch}`,
      `示意估算總計：NT$ ${s.total.toLocaleString("en-US")}`,
      `客製備註：${s.note || "無"}`,
      "",
      "提醒：窯釉為概念品牌作品展示，本操作僅於本機匯出規格單，未送出任何訂單或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kiln-glaze-commission.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Specification sheet downloaded (kiln-glaze-commission.txt). No online order was placed."
      : "已下載離線訂製規格單（kiln-glaze-commission.txt），未進行任何線上送出或扣款。";
  });
}
