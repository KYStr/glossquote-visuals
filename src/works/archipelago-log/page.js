import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const coordEl = document.querySelector("[data-nautical-coord]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing an aerial coral lagoon still.",
  starting: "Charting the live lagoon waters.",
  reduced: "Reduced motion is on. Switch archipelagos to view each aerial still.",
  unavailable: "Live WebGPU rendering is unavailable. Switch archipelagos to view each aerial still.",
  running: "Live lagoon caustics and sailing track running.",
  paused: "Motion is paused. Resume to continue the catamaran crossing.",
  pause: "Pause voyage",
} : {
  still: "顯示珊瑚礁潟湖空拍靜態畫面。",
  starting: "正在載入即時潟湖水光與航跡。",
  reduced: "已減少動態，可切換三片海域檢視空拍海圖靜圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三片海域檢視空拍海圖靜圖。",
  running: "正在播放即時潟湖焦散與帆船航跡。",
  paused: "已暫停動態。繼續後帆船將沿航道前行。",
  pause: "暫停航行",
};

const seas = [
  { file: "miyako", coord: "24°48'N 125°17'E" },
  { file: "cyclades", coord: "36°43'N 24°25'E" },
  { file: "palau", coord: "07°19'N 134°29'E" },
];
const posters = seas.map((s) => new URL(`${s.file}.webp`, poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const source = posters[index];
  if (poster.src !== source) poster.src = source;
  if (coordEl) coordEl.textContent = seas[index].coord;
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeLagoon(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateLagoon(renderer, next);
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
    const seaSelect = document.querySelector("#al-sea");
    if (seaSelect && seaSelect.options[index]) {
      seaSelect.selectedIndex = index;
      updateVoyage();
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

// Commercial flow: Island Voyage Planner & Offline Dossier Export
const form = document.querySelector("[data-voyage-form]");
const summaryEl = document.querySelector("[data-voyage-summary]");
const totalEl = document.querySelector("[data-voyage-total]");
const feedbackEl = document.querySelector("[data-voyage-feedback]");
const downloadBtn = document.querySelector("[data-download-voyage]");

const voyages = en ? {
  miyako: { name: "Miyako Coral Reef Sailing (4 Days · Okinawa)", price: 54000 },
  cyclades: { name: "Cyclades White-Cliff Charter (5 Days · Aegean)", price: 118000 },
  palau: { name: "Palau Milky Lagoon Retreat (6 Days · Rock Islands)", price: 79000 },
} : {
  miyako: { name: "宮古藍珊瑚礁跳島 4 日（沖繩）", price: 54000 },
  cyclades: { name: "愛琴海白崖包船 5 日（希臘基克拉澤斯）", price: 118000 },
  palau: { name: "帛琉牛奶湖慢旅 6 日（洛克群島）", price: 79000 },
};

const addonCost = { none: 0, dive: 6800, sunset: 4200 };

function getVoyage() {
  const seaKey = form.elements.sea.value;
  const vessel = form.elements.vessel.value;
  const guests = form.elements.guests.valueAsNumber;
  if (!form.elements.guests.validity.valid || !Number.isInteger(guests)) return null;
  const month = form.elements.month.value;
  const addon = form.elements.addon.value;
  const item = voyages[seaKey] ?? voyages.miyako;
  const vesselMult = vessel === "private" ? 1.28 : 1.0;
  const perPerson = Math.round(item.price * vesselMult) + (addonCost[addon] ?? 0);
  const total = perPerson * guests;
  return { seaKey, item, vessel, guests, month, addon, perPerson, total };
}

function updateVoyage() {
  if (!form) return;
  const s = getVoyage();
  if (downloadBtn) downloadBtn.disabled = !s;
  if (!s) {
    totalEl.textContent = "—";
    summaryEl.textContent = en ? "Enter a whole number from 2 to 12." : "請輸入 2 到 12 的整數人數。";
    return;
  }
  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const vLabel = s.vessel === "private"
    ? (en ? "Private Catamaran Charter (+28%)" : "私人雙體帆船包船（+28%）")
    : (en ? "Small-Group Shared Sail" : "精緻小團共乘帆船");
  summaryEl.textContent = en
    ? `${s.guests} guests × ${s.item.name} · ${vLabel} · Indicative month: ${s.month}`
    : `${s.guests} 位同行 × ${s.item.name}｜${vLabel}｜示意出發月份：${s.month}`;
}

for (const btn of document.querySelectorAll("[data-choose-voyage]")) {
  btn.addEventListener("click", () => {
    if (form && form.elements.sea) {
      form.elements.sea.value = btn.dataset.chooseVoyage;
      updateVoyage();
    }
  });
}

if (form) {
  form.addEventListener("input", updateVoyage);
  form.addEventListener("change", updateVoyage);
  updateVoyage();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getVoyage();
    if (!s) return;
    const lines = en ? [
      "ARCHIPELAGO LOG — Offline Island Voyage Dossier (Concept Travel Agency)",
      "=======================================================================",
      `Voyage: ${s.item.name}`,
      `Vessel Tier: ${s.vessel === "private" ? "Private Catamaran Charter" : "Small-Group Shared Sail"}`,
      `Guests: ${s.guests}`,
      `Indicative Month: ${s.month}`,
      `Activity Add-on: ${s.addon}`,
      `Per-Guest Estimate: NT$ ${s.perPerson.toLocaleString("en-US")}`,
      `Group Total Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "Notice: ARCHIPELAGO LOG is a concept travel agency demo. No charter or payment was submitted.",
    ] : [
      "群島航誌 ARCHIPELAGO LOG — 離線跳島航行企劃書（概念旅行社示範）",
      "=======================================================================",
      `跳島航程：${s.item.name}`,
      `船型配置：${s.vessel === "private" ? "私人雙體帆船包船" : "精緻小團共乘帆船"}`,
      `同行人數：${s.guests} 位`,
      `示意出發月份：${s.month}`,
      `水上加選項目：${s.addon}`,
      `每人示意旅費：NT$ ${s.perPerson.toLocaleString("en-US")}`,
      `團體估算總計：NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "提醒：群島航誌為概念旅行社展示作品，本企劃書僅於本機匯出留存，無線上訂船或付款行為。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "archipelago-log-voyage.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Voyage dossier downloaded locally (archipelago-log-voyage.txt). No booking was made."
      : "已於本機下載跳島航行企劃書（archipelago-log-voyage.txt），未進行線上訂購。";
  });
}
