import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const elevEl = document.querySelector("[data-elev-readout]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing a Swiss topographic relief map still.",
  starting: "Rendering live elevation contours and route.",
  reduced: "Reduced motion is on. Switch expedition routes to view each terrain sheet.",
  unavailable: "Live WebGPU rendering is unavailable. Switch expedition routes to view each terrain sheet.",
  running: "Live topographic route trace and hillshade running.",
  paused: "Map motion is paused. Resume to continue tracing the ridge.",
  pause: "Pause trace",
} : {
  still: "顯示立體等高線地形圖靜態畫面。",
  starting: "正在載入即時立體山影與稜線路徑。",
  reduced: "已減少動態，可切換三條山岳路線檢視靜態地形圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三條山岳路線檢視靜態地形圖。",
  running: "正在播放即時山影與橘色稜線推進。",
  paused: "已暫停動態。繼續後將沿稜線推進至主峰。",
  pause: "暫停路徑",
};

const regions = [
  { file: "montblanc", elev: "MAX 2,665 m · 170 km" },
  { file: "alps", elev: "MAX 3,180 m · 54 km" },
  { file: "patagonia", elev: "MAX 1,920 m · 88 km" },
];
const posters = regions.map((r) => new URL(`${r.file}.webp`, poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const source = posters[index];
  if (poster.src !== source) poster.src = source;
  if (elevEl) elevEl.textContent = regions[index].elev;
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeTopo(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateTopo(renderer, next);
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
    const trekSelect = document.querySelector("#ce-trek");
    if (trekSelect && trekSelect.options[index]) {
      trekSelect.selectedIndex = index;
      updatePlan();
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

// Commercial flow: Expedition Readiness Quote & Gear Checklist Export
const form = document.querySelector("[data-trek-form]");
const summaryEl = document.querySelector("[data-trek-summary]");
const totalEl = document.querySelector("[data-trek-total]");
const feedbackEl = document.querySelector("[data-trek-feedback]");
const downloadBtn = document.querySelector("[data-download-plan]");

const treks = en ? {
  montblanc: { name: "Tour du Mont Blanc Circuit (8 Days · Grade B · 1:4 Guide)", price: 112000 },
  alps: { name: "Japan Northern Alps Ridge (6 Days · Grade B+ · 1:4 Guide)", price: 68000 },
  patagonia: { name: "Patagonia Icefield Traverse (10 Days · Grade A · 1:4 Guide)", price: 168000 },
} : {
  montblanc: { name: "瑞士白朗峰環線 8 日（難度 B・嚮導比 1:4）", price: 112000 },
  alps: { name: "日本北阿爾卑斯縱走 6 日（難度 B+・嚮導比 1:4）", price: 68000 },
  patagonia: { name: "巴塔哥尼亞冰原遠征 10 日（難度 A・嚮導比 1:4）", price: 168000 },
};

const lodgeCost = { hut: 0, lodge: 16500 };
const gearCost = { own: 0, pack: 4800 };

function getPlan() {
  const trekKey = form.elements.trek.value;
  const hikers = Math.max(1, Math.min(8, Number(form.elements.hikers.value) || 2));
  const stay = form.elements.stay.value;
  const gear = form.elements.gear.value;
  const item = treks[trekKey] ?? treks.montblanc;
  const perHiker = item.price + (lodgeCost[stay] ?? 0) + (gearCost[gear] ?? 0);
  const total = perHiker * hikers;
  return { trekKey, item, hikers, stay, gear, perHiker, total };
}

function updatePlan() {
  if (!form) return;
  const s = getPlan();
  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const stayLabel = s.stay === "lodge"
    ? (en ? "Valley Boutique Lodge (+NT$ 16,500/person)" : "山谷雙人旅宿升級（+NT$ 16,500／人）")
    : (en ? "Alpine Mountain Huts (standard)" : "經典高山山屋（含早晚餐）");
  summaryEl.textContent = en
    ? `${s.hikers} hikers × ${s.item.name} · ${stayLabel}`
    : `${s.hikers} 位隊員 × ${s.item.name}｜${stayLabel}`;
}

for (const btn of document.querySelectorAll("[data-choose-trek]")) {
  btn.addEventListener("click", () => {
    if (form && form.elements.trek) {
      form.elements.trek.value = btn.dataset.chooseTrek;
      updatePlan();
    }
  });
}

if (form) {
  form.addEventListener("input", updatePlan);
  form.addEventListener("change", updatePlan);
  updatePlan();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getPlan();
    const lines = en ? [
      "CONTOUR EXPEDITION — Offline Trekking Plan & Gear Checklist (Concept Agency)",
      "============================================================================",
      `Expedition: ${s.item.name}`,
      `Party Size: ${s.hikers} hikers`,
      `Accommodation: ${s.stay === "lodge" ? "Valley Boutique Lodge" : "Alpine Mountain Huts"}`,
      `Technical Gear Rental: ${s.gear === "pack" ? "Included (Poles + 3-Layer Shell + Crampons)" : "Bringing own gear"}`,
      `Per-Hiker Estimate: NT$ ${s.perHiker.toLocaleString("en-US")}`,
      `Total Group Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "Essential Packing Checklist:",
      "  [ ] Waterproof mid-cut hiking boots (broken in)",
      "  [ ] 30–38L daypack with rain cover",
      "  [ ] Merino base layer + windproof hardshell",
      "  [ ] Headlamp + 1.5L hydration bottle + sunglasses",
      "",
      "Notice: CONTOUR EXPEDITION is a concept travel-agency demo. No registration or payment occurred.",
    ] : [
      "等高線行旅 CONTOUR EXPEDITION — 離線遠征行程與裝備清單（概念旅行社示範）",
      "============================================================================",
      `遠征路線：${s.item.name}`,
      `報名人數：${s.hikers} 位`,
      `住宿配置：${s.stay === "lodge" ? "山谷雙人旅宿升級" : "經典高山山屋（含早晚餐）"}`,
      `技術裝備租借：${s.gear === "pack" ? "含登山杖、三層防水外套與簡易冰爪" : "自備全套裝備"}`,
      `每人示意費用：NT$ ${s.perHiker.toLocaleString("en-US")}`,
      `團體估算總計：NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "行前必備裝備檢核：",
      "  [ ] 已馴鞋之中高筒防水健行鞋",
      "  [ ] 30–38L 健行背包與防水套",
      "  [ ] 羊毛排汗底層＋防風防水衝鋒衣",
      "  [ ] 頭燈、1.5L 水袋與抗 UV 太陽眼鏡",
      "",
      "提醒：等高線行旅為旅行社商業網站示範作品，本清單僅於本機匯出，無線上報名或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contour-expedition-plan.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Expedition plan & gear checklist saved (contour-expedition-plan.txt). No booking was made."
      : "已於本機下載行程與裝備清單（contour-expedition-plan.txt），未進行線上報名。";
  });
}
