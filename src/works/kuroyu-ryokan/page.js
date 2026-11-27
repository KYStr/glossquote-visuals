import { createMotion, observeMotion } from "../../shared/motion.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const locEl = document.querySelector("[data-onsen-loc]");
const tempEl = document.querySelector("[data-onsen-temp]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing an architectural onsen sanctuary still.",
  starting: "Preparing the live mountain mist and hot-spring reflection.",
  reduced: "Reduced motion is on. Switch seasons to view each sanctuary still.",
  unavailable: "Live WebGPU rendering is unavailable. Switch seasons to view each sanctuary still.",
  running: "Live hot-spring steam and lantern reflections running.",
  paused: "Motion paused. Resume to watch the thermal steam drift.",
  pause: "Pause",
} : {
  still: "顯示秘湯建築靜態實景畫面。",
  starting: "正在載入即時山嵐水鏡與湯煙實景。",
  reduced: "已減少動態，可切換三季秘湯檢視靜態實景。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三季秘湯檢視靜態實景。",
  running: "正在播放即時露天風呂湯煙與行燈水鏡。",
  paused: "已暫停動態。繼續後湯煙與水波將恢復微幅流動。",
  pause: "暫停",
};

const seasons = [
  { file: "winter", loc: "42°45'N 141°20'E · SHIKOTSU, HOKKAIDO", temp: "SOURCE 42.5°C · SNOWFALL" },
  { file: "autumn", loc: "35°14'N 139°01'E · HAKONE, KANAGAWA", temp: "SOURCE 41.8°C · DAWN MIST" },
  { file: "summer", loc: "35°00'N 135°40'E · ARASHIYAMA, KYOTO", temp: "SOURCE 40.5°C · CEDAR RAIN" },
];
const posters = seasons.map((s) => new URL(`${s.file}.webp`, poster.src).href);
let settings = { preset: -1, index: 0 };
let paused = false;
let rendered = false;
let shader;

function showStill(index) {
  const s = seasons[index] ?? seasons[0];
  const source = posters[index] ?? posters[0];
  if (poster.src !== source) poster.src = source;
  if (locEl) locEl.textContent = s.loc;
  if (tempEl) tempEl.textContent = s.temp;
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeOnsen(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateOnsen(renderer, next);
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

// Private Sanctuary Concierge (Pill-based, zero native <form> submission)
const salon = document.querySelector("[data-sanctuary-salon]");
const folioTitle = document.querySelector("[data-sanctuary-title]");
const folioMeta = document.querySelector("[data-sanctuary-meta]");
const folioExtras = document.querySelector("[data-sanctuary-extras]");
const folioTotal = document.querySelector("[data-sanctuary-total]");
const feedback = document.querySelector("[data-sanctuary-feedback]");
const downloadBtn = document.querySelector("[data-download-sanctuary]");

const sanctuaries = en ? {
  winter: { title: "I. Shikotsu Basalt Sanctuary · Hokkaido", days: "5 Days / 4 Nights", base: 146000, spring: "Bicarbonate Dark Spring" },
  autumn: { title: "II. Hakone Cedar Pavilion · Kanagawa", days: "4 Days / 3 Nights", base: 118000, spring: "Milky Sulfur Valley Spring" },
  summer: { title: "III. Arashiyama River Villa · Kyoto", days: "4 Days / 3 Nights", base: 124000, spring: "Alkaline Soft Mineral Spring" },
} : {
  winter: { title: "I. 支笏湖玄武岩秘湯 · 北海道", days: "5 天 4 夜", base: 146000, spring: "美肌碳酸氫鹽泉" },
  autumn: { title: "II. 箱根檜木楓谷離宮 · 神奈川", days: "4 天 3 夜", base: 118000, spring: "乳白硫磺山谷泉" },
  summer: { title: "III. 嵐山青嵐川畔別邸 · 京都", days: "4 天 3 夜", base: 124000, spring: "弱鹼性柔和名泉" },
};

const ritualPrices = { kaiseki: 24000, tea: 14000, arch: 18000 };
const ritualNames = en ? {
  kaiseki: "Private Counter Kaiseki & Rare Sake Pairing",
  tea: "Dawn Matcha Ceremony in a Historic Tea House",
  arch: "Private Architect-Led Timber Studio Visit",
} : {
  kaiseki: "割烹板前私密懷石與十四代清酒配餐",
  tea: "清晨無人古茶室裏千家點茶體驗",
  arch: "建築師同行木構古民家私密參訪",
};

function getSanctuaryState() {
  const key = salon.querySelector('input[name="sanctuary"]:checked')?.value ?? "winter";
  const villa = salon.querySelector('input[name="villa"]:checked')?.value ?? "hanare";
  const guests = Number(salon.querySelector('input[name="guests"]:checked')?.value ?? 2);
  const rituals = [...salon.querySelectorAll('input[name="ritual"]:checked')].map((el) => el.value);
  const note = salon.querySelector('textarea[name="note"]')?.value.trim() ?? "";
  const item = sanctuaries[key] ?? sanctuaries.winter;
  const mult = villa === "buyout" ? 1.40 : 1.0;
  const perGuest = Math.round(item.base * mult);
  const ritualsSum = rituals.reduce((s, k) => s + (ritualPrices[k] ?? 0), 0);
  const total = perGuest * guests + ritualsSum;
  return { key, item, villa, guests, rituals, note, perGuest, total };
}

function renderSanctuary() {
  if (!salon) return;
  const s = getSanctuaryState();
  folioTitle.textContent = s.item.title;
  const villaLabel = s.villa === "buyout"
    ? (en ? "Full-Estate Architectural Buyout (+40%)" : "整棟建築貸切包棟（+40%）")
    : (en ? "Private Rotenburo Hanare Villa" : "附專屬露天風呂獨棟離宮");
  folioMeta.textContent = en
    ? `${s.item.days} · ${s.guests} Guests · ${villaLabel} · ${s.item.spring}`
    : `${s.item.days}｜${s.guests} 位貴賓｜${villaLabel}｜泉質：${s.item.spring}`;
  folioExtras.textContent = s.rituals.length
    ? s.rituals.map((k) => ritualNames[k]).join(en ? " · " : "、")
    : (en ? "Private airport sedan & seasonal kaiseki included" : "已含專車接駁、源泉掛流私湯與一泊二食懷石");
  folioTotal.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
}

for (const trigger of document.querySelectorAll("[data-select-sanctuary]")) {
  trigger.addEventListener("click", () => {
    const radio = salon?.querySelector(`input[name="sanctuary"][value="${trigger.dataset.selectSanctuary}"]`);
    if (radio) {
      radio.checked = true;
      renderSanctuary();
    }
  });
}

if (salon) {
  salon.addEventListener("change", renderSanctuary);
  salon.addEventListener("input", renderSanctuary);
  renderSanctuary();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getSanctuaryState();
    const lines = en ? [
      "KUROYU SANCTUARY — Private Onsen & Architecture Dossier (Concept Brand)",
      "=========================================================================",
      `Sanctuary: ${s.item.title}`,
      `Duration & Spring: ${s.item.days} (${s.item.spring})`,
      `Residence: ${s.villa === "buyout" ? "Full-Estate Architectural Buyout" : "Private Rotenburo Hanare Villa"}`,
      `Guests: ${s.guests}`,
      `Private Cultural Rituals: ${s.rituals.length ? s.rituals.map((k) => ritualNames[k]).join(", ") : "Standard kaiseki & private transfer"}`,
      `Indicative Stay Total: NT$ ${s.total.toLocaleString("en-US")}`,
      `Dietary & Stay Notes: ${s.note || "None"}`,
      "",
      "Notice: KUROYU is a concept luxury travel house demo. No reservation or payment occurred.",
    ] : [
      "黑湯行旅 KUROYU — 私密秘湯泊宿企劃書（概念品牌示範）",
      "=========================================================================",
      `秘湯章節：${s.item.title}`,
      `天數與泉質：${s.item.days}（${s.item.spring}）`,
      `客室規格：${s.villa === "buyout" ? "整棟建築貸切包棟" : "附專屬露天風呂獨棟離宮"}`,
      `貴賓人數：${s.guests} 位`,
      `私密文化體驗：${s.rituals.length ? s.rituals.map((k) => ritualNames[k]).join("、") : "標準專車接駁與一泊二食懷石"}`,
      `示意泊宿總計：NT$ ${s.total.toLocaleString("en-US")}`,
      `餐飲忌口與備註：${s.note || "無"}`,
      "",
      "提醒：黑湯行旅為頂級旅行社商業網站示範作品，本企劃書僅於本機離線下載，未進行任何訂房或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kuroyu-sanctuary-dossier.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = en
      ? "Sanctuary dossier saved locally (kuroyu-sanctuary-dossier.txt). No booking was made."
      : "已於本機匯出私密泊宿企劃書（kuroyu-sanctuary-dossier.txt），未進行任何線上送出。";
  });
}
