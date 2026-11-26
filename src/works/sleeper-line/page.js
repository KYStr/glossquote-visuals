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
  still: "Showing a sleeper carriage window still.",
  starting: "Preparing the live night-train view.",
  reduced: "Reduced motion is on. Switch rail routes to inspect each window view.",
  unavailable: "Live WebGPU rendering is unavailable. Switch rail routes to inspect each window view.",
  running: "Live night-train carriage view running.",
  paused: "Motion is paused. Resume to continue the night journey.",
  pause: "Pause journey",
} : {
  still: "顯示臥鋪列車窗景靜態畫面。",
  starting: "正在啟動即時夜行窗景畫面。",
  reduced: "已減少動態，可切換三條鐵道路線檢視窗景靜圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三條鐵道路線檢視窗景靜圖。",
  running: "正在播放即時夜行列車窗景。",
  paused: "已暫停動態。繼續後將沿所選路線行駛。",
  pause: "暫停窗景",
};

const names = ["alpine", "seto", "arctic"];
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
    return shader.initializeSleeper(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateSleeper(renderer, next);
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
    const routeSelect = document.querySelector("#sl-route");
    if (routeSelect && routeSelect.options[index]) {
      routeSelect.selectedIndex = index;
      updateProposal();
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

// Commercial flow: Rail Concierge Itinerary Proposal
const form = document.querySelector("[data-rail-form]");
const summaryEl = document.querySelector("[data-rail-summary]");
const totalEl = document.querySelector("[data-rail-total]");
const feedbackEl = document.querySelector("[data-rail-feedback]");
const downloadBtn = document.querySelector("[data-download-proposal]");

const routes = en ? {
  alpine: { name: "Alpine Pass Sleeper (5 Days · Zurich–Milan–Zermatt)", price: 128000 },
  seto: { name: "Seto Inland Night Rail (4 Days · Kyoto–Kurashiki–Matsuyama)", price: 86000 },
  arctic: { name: "Nordic Aurora Express (6 Days · Stockholm–Abisko–Narvik)", price: 154000 },
} : {
  alpine: { name: "阿爾卑斯雪峰 5 日（蘇黎世—米蘭—策馬特）", price: 128000 },
  seto: { name: "瀨戶內海夜霧 4 日（京都—倉敷—松山）", price: 86000 },
  arctic: { name: "北極光極地線 6 日（斯德哥爾摩—阿比斯庫—納爾維克）", price: 154000 },
};

const cabinMultipliers = { deluxe: 1.0, suite: 1.38 };

function getProposal() {
  const routeKey = form.elements.route.value;
  const cabin = form.elements.cabin.value;
  const guests = Math.max(1, Math.min(8, Number(form.elements.guests.value) || 2));
  const season = form.elements.season.value;
  const note = form.elements.note.value.trim();
  const item = routes[routeKey] ?? routes.alpine;
  const perGuest = Math.round(item.price * (cabinMultipliers[cabin] ?? 1.0));
  const total = perGuest * guests;
  return { routeKey, item, cabin, guests, season, note, perGuest, total };
}

function updateProposal() {
  if (!form) return;
  const s = getProposal();
  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const cabinLabel = s.cabin === "suite"
    ? (en ? "Grand En-Suite Cabin (+38%)" : "全景套房艙（含獨立衛浴 +38%）")
    : (en ? "Deluxe Twin Sleeper (standard)" : "經典雙人臥鋪艙（標準配置）");
  summaryEl.textContent = en
    ? `${s.guests} guests × ${s.item.name} · ${cabinLabel} · Indicative departure: ${s.season}`
    : `${s.guests} 位旅客 × ${s.item.name}｜${cabinLabel}｜示意出發季別：${s.season}`;
}

for (const btn of document.querySelectorAll("[data-choose-route]")) {
  btn.addEventListener("click", () => {
    if (form && form.elements.route) {
      form.elements.route.value = btn.dataset.chooseRoute;
      updateProposal();
    }
  });
}

if (form) {
  form.addEventListener("input", updateProposal);
  form.addEventListener("change", updateProposal);
  updateProposal();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getProposal();
    const lines = en ? [
      "SLEEPER LINE — Offline Luxury Rail Proposal (Concept Travel Agency)",
      "===================================================================",
      `Itinerary: ${s.item.name}`,
      `Cabin Class: ${s.cabin === "suite" ? "Grand En-Suite Cabin" : "Deluxe Twin Sleeper"}`,
      `Passengers: ${s.guests}`,
      `Indicative Season: ${s.season}`,
      `Per-Guest Estimate: NT$ ${s.perGuest.toLocaleString("en-US")}`,
      `Group Total Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      `Concierge Notes: ${s.note || "None"}`,
      "",
      "Notice: SLEEPER LINE is a concept travel agency demo. No booking or payment was submitted.",
    ] : [
      "夜行線 SLEEPER LINE — 離線奢華鐵道行程提案單（概念旅行社示範）",
      "===================================================================",
      `行程路線：${s.item.name}`,
      `臥鋪艙等：${s.cabin === "suite" ? "全景套房艙（獨立衛浴）" : "經典雙人臥鋪艙"}`,
      `同行人數：${s.guests} 位`,
      `示意出發季別：${s.season}`,
      `每人示意旅費：NT$ ${s.perGuest.toLocaleString("en-US")}`,
      `團體估算總計：NT$ ${s.total.toLocaleString("en-US")}`,
      `禮賓需求備註：${s.note || "無"}`,
      "",
      "提醒：夜行線為概念旅行社展示作品，本提案單僅於本機匯出留存，無線上訂位或付款行為。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sleeper-line-proposal.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Proposal downloaded locally (sleeper-line-proposal.txt). No booking was made."
      : "已於本機下載行程提案單（sleeper-line-proposal.txt），未進行線上訂位或扣款。";
  });
}
