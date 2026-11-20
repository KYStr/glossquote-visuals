import { createMotion, observeMotion } from "../../shared/motion.js";

const en = document.documentElement.lang === "en";
const limit = 6;
const copy = en ? {
  still: "Showing the still sorbet cut.",
  starting: "Preparing the live sorbet cut.",
  reduced: "Reduced motion is on. Showing the still sorbet cut.",
  unavailable: "Showing the still sorbet cut. Live rendering is unavailable.",
  running: "The sorbet cut is moving.",
  paused: "Motion is paused. Resume to show a new flavor in the live cut.",
  pause: "Pause motion", resume: "Resume motion",
  count: total => total === limit ? "6 of 6 cups selected. Your recipe is ready." :
    `${total} of 6 cups selected. ${limit - total} ${total === 5 ? "slot" : "slots"} left.`,
  full: "The box is full. Remove a cup to change the mix.",
  none: name => `There are no cups of ${name} to remove.`,
  downloaded: "Your recipe was generated for download.",
  recipe: "Sorbet Hour | Gift box recipe",
  overall: "Total: 6 cups × 100 mL = 600 mL",
  line: (name, count) => `${name}: ${count} × 100 mL`,
  ingredients: "Ingredients", allergy: "Allergens", storage: "Storage",
} : {
  still: "目前顯示靜態果冰切面。",
  starting: "正在準備動態果冰切面。",
  reduced: "已依系統偏好減少動態，目前顯示靜態切面。",
  unavailable: "即時畫面目前無法使用，已顯示靜態果冰切面。",
  running: "正在播放動態果冰切面。",
  paused: "已暫停動態。繼續播放後，動態切面會顯示新選的口味。",
  pause: "暫停動態", resume: "繼續動態",
  count: total => total === limit ? "已選 6／6 杯，可以下載禮盒配方。" :
    `已選 ${total}／6 杯，還可選 ${limit - total} 杯。`,
  full: "禮盒已滿六杯。先減少一杯，即可調整口味。",
  none: name => `目前沒有${name}可移除。`,
  downloaded: "已產生可下載的禮盒配方。",
  recipe: "果時 SORBET HOUR｜禮盒配方",
  overall: "合計：6 杯 × 100 毫升 = 600 毫升",
  line: (name, count) => `${name}：${count} 杯 × 100 毫升`,
  ingredients: "成分", allergy: "過敏原", storage: "保存方式",
};

const find = selector => document.querySelector(selector);
const read = selector => find(selector).textContent.trim();
const flavors = [...document.querySelectorAll("[data-product]")].map(product => {
  const key = product.dataset.product;
  return {
    key,
    name: product.querySelector("[data-name]").textContent,
    ingredients: product.querySelector("[data-ingredients]").textContent,
    poster: product.querySelector("img"),
    tone: ["sun", "rose", "leaf"].find(tone => product.classList.contains(tone)),
    add: find(`[data-add="${key}"]`),
    remove: find(`[data-remove="${key}"]`),
    output: find(`[data-count="${key}"]`),
    count: 0,
  };
});
const totalOutput = find("[data-total]");
const slots = [...document.querySelectorAll("[data-slots] span")];
const download = find("[data-download]");
const feedback = find("[data-feedback]");
let total = 0;

function renderBox() {
  let slot = 0;
  for (const item of flavors) {
    item.output.value = item.count;
    item.add.setAttribute("aria-disabled", String(total === limit));
    item.remove.setAttribute("aria-disabled", String(item.count === 0));
    for (let i = 0; i < item.count; i++) {
      slots[slot].className = item.tone;
      slots[slot].setAttribute("data-filled", item.key);
      slot++;
    }
  }
  for (; slot < limit; slot++) {
    slots[slot].className = "";
    slots[slot].removeAttribute("data-filled");
  }
  totalOutput.dataset.total = total;
  totalOutput.textContent = copy.count(total);
  download.disabled = total !== limit;
}

function changeQuantity(item, step) {
  if (step === 1 && total === limit) {
    feedback.textContent = copy.full;
    return;
  }
  if (step === -1 && item.count === 0) {
    feedback.textContent = copy.none(item.name);
    return;
  }
  item.count += step;
  total += step;
  feedback.textContent = "";
  renderBox();
}

for (const item of flavors) {
  item.add.addEventListener("click", () => changeQuantity(item, 1));
  item.remove.addEventListener("click", () => changeQuantity(item, -1));
}
download.addEventListener("click", () => {
  if (total !== limit) return;
  const chosen = flavors.filter(item => item.count > 0);
  const recipe = [
    copy.recipe, "", ...chosen.map(item => copy.line(item.name, item.count)), copy.overall,
    "", copy.ingredients, ...chosen.map(item => `${item.name} — ${item.ingredients}`),
    "", copy.allergy, read("[data-allergy]"),
    "", copy.storage, read("[data-storage]"),
    "", read("[data-concept]"), "",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([recipe], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = en ? "sorbet-hour-recipe-en.txt" : "sorbet-hour-recipe-zh-Hant.txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = copy.downloaded;
});
renderBox();
find("[data-builder]").hidden = false;

const stage = find("[data-stage]");
let poster = find("[data-poster]");
const canvas = stage.querySelector("canvas");
const pause = find("[data-pause]");
const motionStatus = find("[data-motion-status]");
const controls = [...document.querySelectorAll("[name=sorbet-flavor]")];
const supportsObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = { flavor: 0, poster };
const posters = [poster];
let paused = false;
let rendered = false;
let shader;

function showPoster(next) {
  if (next.poster !== poster) {
    poster.replaceWith(next.poster);
    poster = next.poster;
  }
  stage.dataset.material = String(next.flavor);
}

async function decodePoster(source) {
  const image = new Image(1200, 800);
  image.alt = source.alt;
  image.dataset.poster = "";
  image.src = source.src;
  await image.decode();
  return image;
}

// Begin decoding the two selectable stills alongside shader initialization.
// Each control becomes available with its decoded still, so selecting a flavor
// can update the baked surface and live uniforms together.
const posterReady = Promise.allSettled(flavors.slice(1).map(item => decodePoster(item.poster)))
  .then(results => {
    results.forEach((result, index) => {
      if (result.status === "fulfilled") posters[index + 1] = result.value;
      else controls[index + 1].disabled = true;
    });
    find("[data-instrument]").hidden = false;
  });

const motion = createMotion({
  supported: Boolean(navigator.gpu) && supportsObservers,
  initialSettings: settings,
  async initialize(options) {
    [shader] = await Promise.all([import("./shader.js"), posterReady]);
    if (options.signal.aborted) return null;
    return shader.initializeSorbet(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateSorbet(renderer, next);
    showPoster(next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") rendered = true;
    if (["starting", "reduced", "unavailable"].includes(phase)) rendered = false;
    if (!rendered) showPoster(settings);
    stage.toggleAttribute("data-rendered", rendered);
    pause.disabled = phase === "reduced" || phase === "unavailable";
    motionStatus.textContent = copy[phase];
  },
});

for (const control of controls) {
  control.addEventListener("change", () => {
    const flavor = Number(control.value);
    if (!posters[flavor]) return;
    settings = { flavor, poster: posters[flavor] };
    // A live poster and its patch advance together, including on resume.
    if (!rendered) showPoster(settings);
    motion.setSettings(settings);
  });
}
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
pause.hidden = !navigator.gpu || !supportsObservers;
if (supportsObservers) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });
