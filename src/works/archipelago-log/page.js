import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const coordEl = document.querySelector("[data-sea-coord]");
const windEl = document.querySelector("[data-sea-wind]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing a sunlit sea horizon still.",
  starting: "Preparing the live ocean horizon.",
  reduced: "Reduced motion is on. Switch seas to view each coastal horizon still.",
  unavailable: "Live WebGPU rendering is unavailable. Switch seas to view each coastal horizon still.",
  running: "Live sunlit ocean horizon running.",
  paused: "Ocean motion paused. Resume to continue the swell and sun glitter.",
  pause: "Pause",
} : {
  still: "顯示海平面靜態實景畫面。",
  starting: "正在載入即時海面波光實景。",
  reduced: "已減少動態，可切換三片海域檢視海平面靜圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三片海域檢視海平面靜圖。",
  running: "正在播放即時海面波光實景。",
  paused: "已暫停動態。繼續後海浪與日光波影將恢復流動。",
  pause: "暫停",
};

const seas = [
  { file: "cyclades", coord: "36°43'N 24°25'E · MILOS, CYCLADES", wind: "SW 11 KT · 17:48" },
  { file: "miyako", coord: "24°48'N 125°17'E · MIYAKO STRAIT", wind: "SE 08 KT · 12:15" },
  { file: "amalfi", coord: "40°38'N 14°36'E · AMALFI COAST", wind: "W 06 KT · 19:22" },
];
const posters = seas.map((s) => new URL(`${s.file}.webp`, poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const s = seas[index] ?? seas[0];
  const source = posters[index] ?? posters[0];
  if (poster.src !== source) poster.src = source;
  if (coordEl) coordEl.textContent = s.coord;
  if (windEl) windEl.textContent = s.wind;
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

// Private Charter Salon (Pill-based, zero native <form> submission)
const salon = document.querySelector("[data-charter-salon]");
const folioTitle = document.querySelector("[data-charter-title]");
const folioMeta = document.querySelector("[data-charter-meta]");
const folioExtras = document.querySelector("[data-charter-extras]");
const folioTotal = document.querySelector("[data-charter-total]");
const feedback = document.querySelector("[data-charter-feedback]");
const downloadBtn = document.querySelector("[data-download-voyage]");

const voyages = en ? {
  cyclades: { title: "I. Cyclades Golden Hour · Milos & Sifnos", days: "6 Days / 5 Nights", base: 138000, season: "May – Oct" },
  miyako: { title: "II. Miyako Turquoise Reef · Okinawa", days: "5 Days / 4 Nights", base: 92000, season: "Apr – Nov" },
  amalfi: { title: "III. Amalfi Rose Dusk · Capri & Positano", days: "6 Days / 5 Nights", base: 162000, season: "May – Sep" },
} : {
  cyclades: { title: "I. 愛琴海白崖 · 米洛斯與錫夫諾斯", days: "6 天 5 夜", base: 138000, season: "5 月 – 10 月" },
  miyako: { title: "II. 宮古藍淺海 · 沖繩八重干瀨", days: "5 天 4 夜", base: 92000, season: "4 月 – 11 月" },
  amalfi: { title: "III. 阿瑪菲暮色 · 卡布里與波西塔諾", days: "6 天 5 夜", base: 162000, season: "5 月 – 9 月" },
};

const addonPrices = { chef: 28000, dive: 19000, tender: 24000 };
const addonLabels = en ? {
  chef: "Onboard Mediterranean Private Chef",
  dive: "Private Freediving & Reef Instructor",
  tender: "Sunset Sandbar Table & Champagne Tender",
} : {
  chef: "駐船地中海主廚私宴",
  dive: "隨船自由潛水與珊瑚礁教練",
  tender: "無人海灣夕陽餐桌與香檳快艇接駁",
};

function getCharterState() {
  const seaKey = salon.querySelector('input[name="sea"]:checked')?.value ?? "cyclades";
  const yacht = salon.querySelector('input[name="yacht"]:checked')?.value ?? "cat55";
  const guests = Number(salon.querySelector('input[name="guests"]:checked')?.value ?? 4);
  const addons = [...salon.querySelectorAll('input[name="addon"]:checked')].map((el) => el.value);
  const note = salon.querySelector('textarea[name="note"]')?.value.trim() ?? "";
  const item = voyages[seaKey] ?? voyages.cyclades;
  const mult = yacht === "super68" ? 1.35 : 1.0;
  const perGuest = Math.round(item.base * mult);
  const addonsSum = addons.reduce((s, k) => s + (addonPrices[k] ?? 0), 0);
  const total = perGuest * guests + addonsSum;
  return { seaKey, item, yacht, guests, addons, note, perGuest, total };
}

function renderCharter() {
  if (!salon) return;
  const s = getCharterState();
  folioTitle.textContent = s.item.title;
  const yachtName = s.yacht === "super68"
    ? (en ? "68-ft Flagship Sailing Catamaran (+35%)" : "68 呎旗艦雙體帆船包船（+35%）")
    : (en ? "55-ft Boutique Sailing Catamaran" : "55 呎精品雙體帆船包船");
  folioMeta.textContent = en
    ? `${s.item.days} · ${s.guests} Guests · ${yachtName} · Best wind: ${s.item.season}`
    : `${s.item.days}｜${s.guests} 位貴賓｜${yachtName}｜最佳航季：${s.item.season}`;
  folioExtras.textContent = s.addons.length
    ? s.addons.map((k) => addonLabels[k]).join(en ? " · " : "、")
    : (en ? "Standard skipper, steward & water toys included" : "已含認證船長、海上管家與立槳浮潛配備");
  folioTotal.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
}

for (const trigger of document.querySelectorAll("[data-select-sea]")) {
  trigger.addEventListener("click", () => {
    const radio = salon?.querySelector(`input[name="sea"][value="${trigger.dataset.selectSea}"]`);
    if (radio) {
      radio.checked = true;
      renderCharter();
    }
  });
}

if (salon) {
  salon.addEventListener("change", renderCharter);
  salon.addEventListener("input", renderCharter);
  renderCharter();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getCharterState();
    const lines = en ? [
      "ARCHIPELAGO LOG — Private Yacht Charter Dossier (Concept Travel House)",
      "======================================================================",
      `Sea Chapter: ${s.item.title}`,
      `Duration & Season: ${s.item.days} (${s.item.season})`,
      `Vessel: ${s.yacht === "super68" ? "68-ft Flagship Sailing Catamaran" : "55-ft Boutique Sailing Catamaran"}`,
      `Party Size: ${s.guests} Guests`,
      `Onboard Experiences: ${s.addons.length ? s.addons.map((k) => addonLabels[k]).join(", ") : "Standard crew & water toys"}`,
      `Indicative Charter Total: NT$ ${s.total.toLocaleString("en-US")}`,
      `Notes: ${s.note || "None"}`,
      "",
      "Notice: ARCHIPELAGO LOG is a concept luxury travel showcase. No booking or payment occurred.",
    ] : [
      "群島航誌 ARCHIPELAGO LOG — 私人帆船慢旅企劃書（概念品牌示範）",
      "======================================================================",
      `海域章節：${s.item.title}`,
      `航程天數與季別：${s.item.days}（最佳航季：${s.item.season}）`,
      `帆船規格：${s.yacht === "super68" ? "68 呎旗艦雙體帆船包船" : "55 呎精品雙體帆船包船"}`,
      `同行人數：${s.guests} 位貴賓`,
      `海上專屬加選：${s.addons.length ? s.addons.map((k) => addonLabels[k]).join("、") : "標準船長、海上管家與水上配備"}`,
      `示意包船總計：NT$ ${s.total.toLocaleString("en-US")}`,
      `客製航程備註：${s.note || "無"}`,
      "",
      "提醒：群島航誌為精品旅行社商業網站示範作品，本企劃書僅於本機離線下載，無線上訂位或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "archipelago-log-voyage.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = en
      ? "Charter dossier saved locally (archipelago-log-voyage.txt). No booking was made."
      : "已於本機下載私人帆船企劃書（archipelago-log-voyage.txt），未進行任何線上送出。";
  });
}
