import { createMotion, observeMotion } from "../../shared/motion.js";
import {
  CHAPTERS,
  CHAPTER_SECONDS,
  CYCLE_SECONDS,
  sceneIndexFromElapsed,
} from "./scene-state.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const metaCoord = document.querySelector("[data-scene-coord]");
const metaHour = document.querySelector("[data-scene-hour]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing an atmospheric horizon still.",
  starting: "Rendering the live 3D horizon.",
  reduced: "Reduced motion is on. Switch light chapters to view each horizon still.",
  unavailable: "Live WebGPU rendering is unavailable. Switch light chapters to view each horizon still.",
  running: "Live 3D atmospheric horizon running.",
  paused: "Horizon motion paused. Resume to continue the golden-hour drift.",
  pause: "Pause",
} : {
  still: "顯示光影地平線靜態畫面。",
  starting: "正在載入即時 3D 大氣光影實景。",
  reduced: "已減少動態，可切換三幕季節光影檢視靜態實景。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三幕季節光影檢視靜態實景。",
  running: "正在播放即時 3D 大氣光影實景。",
  paused: "已暫停動態。繼續後將恢復微幅鏡頭流動。",
  pause: "暫停",
};

const posters = CHAPTERS.map((c) => new URL(`${c.file}.webp`, poster.src).href);
let settings = { preset: 0, index: 0 };
let autoCycle = true;
let cycleElapsed = 0;
let cycleFrame = 0;
let lastCycleTick = 0;
let currentPhase = "still";
let paused = false;
let rendered = false;
let pageHiding = false;
let shader;

function showStill(index) {
  if (pageHiding) return;
  const safeIndex = ((index % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length;
  const ch = CHAPTERS[safeIndex];
  const source = posters[safeIndex];
  if (poster.src !== source) poster.src = source;
  poster.alt = en ? ch.altEn : ch.altZh;
}

function syncSceneUI(index, { updatePoster = !rendered } = {}) {
  const safeIndex = ((index % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length;
  const ch = CHAPTERS[safeIndex];
  stage.dataset.material = String(safeIndex);
  if (metaCoord) metaCoord.textContent = ch.coord;
  if (metaHour) metaHour.textContent = ch.hour;
  if (radios[safeIndex] && !radios[safeIndex].checked) {
    radios[safeIndex].checked = true;
  }
  if (updatePoster) showStill(safeIndex);
}

function stopCycleLoop() {
  if (cycleFrame) {
    cancelAnimationFrame(cycleFrame);
    cycleFrame = 0;
  }
  lastCycleTick = 0;
}

function startCycleLoop() {
  if (cycleFrame || !autoCycle || paused || currentPhase !== "running") return;
  lastCycleTick = performance.now();
  const tick = (now) => {
    if (!autoCycle || paused || currentPhase !== "running") {
      stopCycleLoop();
      return;
    }
    const dt = Math.min(Math.max((now - lastCycleTick) / 1000, 0), 0.25);
    lastCycleTick = now;
    cycleElapsed = (cycleElapsed + dt) % CYCLE_SECONDS;
    const nextIndex = sceneIndexFromElapsed(cycleElapsed);
    if (nextIndex !== settings.index) {
      settings = { index: nextIndex, preset: nextIndex };
      syncSceneUI(nextIndex, { updatePoster: false });
      motion.setSettings(settings);
    }
    cycleFrame = requestAnimationFrame(tick);
  };
  cycleFrame = requestAnimationFrame(tick);
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeSolstice(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateSolstice(renderer, next);
  },
  renderState(phase) {
    currentPhase = phase;
    stage.dataset.motion = phase;
    if (phase === "running") rendered = true;
    if (["starting", "unavailable", "reduced"].includes(phase)) rendered = false;
    syncSceneUI(settings.index, { updatePoster: !rendered });
    stage.toggleAttribute("data-rendered", rendered);
    pause.disabled = phase === "reduced" || phase === "unavailable";
    status.textContent = labels[phase];
    if (phase === "running" && autoCycle && !paused) startCycleLoop();
    else stopCycleLoop();
  },
});

for (const radio of radios) {
  radio.addEventListener("change", () => {
    autoCycle = false;
    stopCycleLoop();
    const index = Number(radio.value);
    cycleElapsed = index * CHAPTER_SECONDS;
    settings = { index, preset: index };
    syncSceneUI(index, { updatePoster: true });
    motion.setSettings(settings);
  });
}

pause.addEventListener("click", () => {
  paused = !paused;
  if (paused) stopCycleLoop();
  pause.textContent = paused ? pause.dataset.play : labels.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});

window.addEventListener("pagehide", () => {
  pageHiding = true;
  stopCycleLoop();
  rendered = false;
  stage.removeAttribute("data-rendered");
});

window.addEventListener("pageshow", () => {
  pageHiding = false;
});

dial.hidden = false;
pause.hidden = !navigator.gpu || !canWatch;
if (canWatch) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });

// Private Atelier Interactive Configurator (Pill-based luxury dossier builder)
const atelier = document.querySelector("[data-atelier-form]");
const folioDest = document.querySelector("[data-folio-dest]");
const folioMeta = document.querySelector("[data-folio-meta]");
const folioExtras = document.querySelector("[data-folio-extras]");
const folioTotal = document.querySelector("[data-folio-total]");
const feedback = document.querySelector("[data-atelier-feedback]");
const downloadBtn = document.querySelector("[data-download-dossier]");

const journeys = en ? {
  sahara: { title: "I. Sahara Dusk · Erg Chebbi", days: "6 Days / 5 Nights", base: 168000, window: "Oct – Mar" },
  fjord: { title: "II. Fjord Midnight Sun · Lofoten", days: "7 Days / 6 Nights", base: 194000, window: "May – Jul" },
  alpenglow: { title: "III. Alps Alpenglow · Engadin", days: "5 Days / 4 Nights", base: 152000, window: "Dec – Apr" },
} : {
  sahara: { title: "I. 撒哈拉暮金 · 摩洛哥爾格謝比", days: "6 天 5 夜", base: 168000, window: "10 月 – 3 月" },
  fjord: { title: "II. 峽灣極晝 · 挪威羅浮敦群島", days: "7 天 6 夜", base: 194000, window: "5 月 – 7 月" },
  alpenglow: { title: "III. 雲海初陽 · 瑞士恩加丁高地", days: "5 天 4 夜", base: 152000, window: "12 月 – 4 月" },
};

const extraPrices = { heli: 42000, chef: 26000, photo: 22000 };
const extraNames = en ? {
  heli: "Private Helicopter Transfer",
  chef: "In-Villa Michelin Private Chef",
  photo: "Dedicated Analog Film Photographer",
} : {
  heli: "私人直升機專機接駁",
  chef: "駐地米其林主廚私宴",
  photo: "隨行底片紀實攝影師",
};

function getAtelierState() {
  const destKey = atelier.querySelector('input[name="dest"]:checked')?.value ?? "sahara";
  const pace = atelier.querySelector('input[name="pace"]:checked')?.value ?? "immersion";
  const guests = Number(atelier.querySelector('input[name="guests"]:checked')?.value ?? 2);
  const extras = [...atelier.querySelectorAll('input[name="extra"]:checked')].map((el) => el.value);
  const note = atelier.querySelector('textarea[name="note"]')?.value.trim() ?? "";
  const journey = journeys[destKey] ?? journeys.sahara;
  const paceMult = pace === "collector" ? 1.32 : 1.0;
  const extrasSum = extras.reduce((sum, key) => sum + (extraPrices[key] ?? 0), 0);
  const perGuest = Math.round(journey.base * paceMult);
  const total = perGuest * guests + extrasSum;
  return { destKey, journey, pace, guests, extras, note, perGuest, extrasSum, total };
}

function renderFolio() {
  if (!atelier) return;
  const s = getAtelierState();
  folioDest.textContent = s.journey.title;
  const paceLabel = s.pace === "collector"
    ? (en ? "Collector’s Extended Suite (+32%)" : "藏家全景私邸延伸（+32%）")
    : (en ? "Signature Private Immersion" : "經典私密光影行程");
  folioMeta.textContent = en
    ? `${s.journey.days} · ${s.guests} Guests · ${paceLabel} · Ideal window: ${s.journey.window}`
    : `${s.journey.days}｜${s.guests} 位貴賓｜${paceLabel}｜最佳光影季：${s.journey.window}`;
  folioExtras.textContent = s.extras.length
    ? s.extras.map((k) => extraNames[k]).join(en ? " · " : "、")
    : (en ? "No private add-ons selected" : "尚未加選專屬禮賓體驗");
  folioTotal.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
}

for (const trigger of document.querySelectorAll("[data-select-dest]")) {
  trigger.addEventListener("click", () => {
    const key = trigger.dataset.selectDest;
    const radio = atelier?.querySelector(`input[name="dest"][value="${key}"]`);
    if (radio) {
      radio.checked = true;
      renderFolio();
    }
  });
}

if (atelier) {
  atelier.addEventListener("change", renderFolio);
  atelier.addEventListener("input", renderFolio);
  renderFolio();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getAtelierState();
    const lines = en ? [
      "SOLSTICE TRAVEL HOUSE — Private Client Journey Dossier (Concept Brand)",
      "======================================================================",
      `Chapter: ${s.journey.title}`,
      `Duration & Window: ${s.journey.days} (${s.journey.window})`,
      `Travel Style: ${s.pace === "collector" ? "Collector's Extended Suite" : "Signature Private Immersion"}`,
      `Party Size: ${s.guests} Guests`,
      `Private Experiences: ${s.extras.length ? s.extras.map((k) => extraNames[k]).join(", ") : "None"}`,
      `Indicative Private Investment: NT$ ${s.total.toLocaleString("en-US")}`,
      `Bespoke Notes: ${s.note || "None"}`,
      "",
      "Notice: SOLSTICE is a concept luxury travel house created as a commercial portfolio showcase.",
      "No reservation, personal data transmission or payment occurred.",
    ] : [
      "至日行館 SOLSTICE — 私密旅程企劃書（概念品牌商業示範）",
      "======================================================================",
      `光影章節：${s.journey.title}`,
      `天數與季別：${s.journey.days}（最佳光影季：${s.journey.window}）`,
      `旅程規格：${s.pace === "collector" ? "藏家全景私邸延伸" : "經典私密光影行程"}`,
      `貴賓人數：${s.guests} 位`,
      `專屬私密體驗：${s.extras.length ? s.extras.map((k) => extraNames[k]).join("、") : "無"}`,
      `示意旅程總計：NT$ ${s.total.toLocaleString("en-US")}`,
      `私人偏好備註：${s.note || "無"}`,
      "",
      "提醒：至日行館 SOLSTICE 為頂級旅行社商業網站示範作品，本企劃書僅於本機離線下載，未進行任何訂位或扣款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "solstice-private-dossier.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = en
      ? "Private dossier saved locally (solstice-private-dossier.txt). No booking was submitted."
      : "已於本機匯出私密旅程企劃書（solstice-private-dossier.txt），未進行任何線上送出。";
  });
}
