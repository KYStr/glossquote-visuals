import { createMotion, observeMotion } from "../../shared/motion.js";
import positions from "./scoop-positions.json" with { type: "json" };

const en = document.documentElement.lang === "en";
const limit = 6;
const copy = en ? {
  still: "Showing the still fruit jelly.",
  starting: "Preparing the live fruit jelly.",
  reduced: "Reduced motion is on. Showing the still fruit jelly.",
  unavailable: "Showing the still fruit jelly. Live rendering is unavailable.",
  running: "The fruit jelly is interactive.",
  paused: "Motion is paused. You can still scoop and reset the jelly.",
  pause: "Pause motion", resume: "Resume motion",
  count: total => total === limit ? "6 of 6 cups selected. Your recipe is ready." :
    `${total} of 6 cups selected. ${limit - total} ${total === 5 ? "slot" : "slots"} left.`,
  full: "The box is full. Remove a cup to change the mix.",
  none: name => `There are no cups of ${name} to remove.`,
  downloaded: "Your recipe was generated for download.",
  recipe: "Jelly Hour | Fruit jelly gift box recipe",
  overall: "Total: 6 cups × 100 mL = 600 mL",
  line: (name, count) => `${name}: ${count} × 100 mL`,
  ingredients: "Ingredients", allergy: "Allergens", storage: "Storage",
  spots: ["Left", "Center", "Right"],
  aiming: spot => `${spot} scoop position selected.`,
  scooped: spot => `One scoop taken at the ${spot.toLowerCase()}. Reset to scoop again.`,
  cutAlt: name => `${name} with a curved hollow and a separate spoonful on the plate`,
  reset: "The jelly is whole again.",
} : {
  still: "目前顯示靜態果凍。",
  starting: "正在準備動態果凍。",
  reduced: "已依系統偏好減少動態，目前顯示靜態切面。",
  unavailable: "即時畫面目前無法使用，已顯示靜態果凍。",
  running: "現在可以挖取果凍。",
  paused: "已暫停動態，仍可挖取與重設。",
  pause: "暫停動態", resume: "繼續動態",
  count: total => total === limit ? "已選 6／6 杯，可以下載禮盒配方。" :
    `已選 ${total}／6 杯，還可選 ${limit - total} 杯。`,
  full: "禮盒已滿六杯。先減少一杯，即可調整口味。",
  none: name => `目前沒有${name}可移除。`,
  downloaded: "已產生可下載的禮盒配方。",
  recipe: "果時 JELLY HOUR｜果凍禮盒配方",
  overall: "合計：6 杯 × 100 毫升 = 600 毫升",
  line: (name, count) => `${name}：${count} 杯 × 100 毫升`,
  ingredients: "成分", allergy: "過敏原", storage: "保存方式",
  spots: ["左側", "中央", "右側"],
  aiming: spot => `已選擇${spot}挖取位置。`,
  scooped: spot => `已從${spot}挖走一勺。重設即可再試。`,
  cutAlt: name => `${name}留著一處凹面，旁邊的盤上有一勺挖出的果凍`,
  reset: "果凍已恢復完整。",
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
  link.download = en ? "jelly-hour-recipe-en.txt" : "jelly-hour-recipe-zh-Hant.txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = copy.downloaded;
});
renderBox();
find("[data-builder]").hidden = false;

const stage = find("[data-stage]");
const poster = find("[data-poster]");
const canvas = stage.querySelector("canvas");
const pause = find("[data-pause]");
const scoop = find("[data-scoop-hit]");
const reset = find("[data-scoop-reset]");
const scoopStatus = find("[data-scoop-status]");
const motionStatus = find("[data-motion-status]");
const controls = [...document.querySelectorAll("[name=sorbet-flavor]")];
const supportsObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = { flavor: 0, cut: null, skipOpening: false, animate: false };
let paused = false;
let rendered = false;
let openingSeen = false;
let aim = 1;
let pointer = null;
let shader;

function settle(cut) {
  if (settings.cut === cut) stage.dataset.scoopVisual = "ready";
}

function showPoster(next) {
  const product = flavors[next.flavor];
  const url = new URL(product.poster.src);
  if (next.cut) url.pathname = url.pathname.replace(/\.webp$/, `-${next.cut.name}.webp`);
  poster.alt = next.cut ? copy.cutAlt(product.name) : product.poster.alt;
  if (poster.src !== url.href) poster.src = url.href;
  if (!rendered && stage.dataset.scoopVisual !== "ready") {
    const cut = next.cut;
    poster.decode().then(() => {
      if (settings === next) settle(cut);
    }, () => {
      // If a still is interrupted or unavailable, retain the intact composition.
      if (settings === next && poster.src === url.href) poster.src = product.poster.src;
    });
  }
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && supportsObservers,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeJelly(canvas, {
      ...options,
      skipOpening: openingSeen || options.settings.skipOpening,
      onReady() {
        openingSeen = true;
        settle(options.settings.cut);
        options.onReady();
      },
      onScoopSettled: settle,
    });
  },
  applySettings(renderer, next) {
    renderer.select(next);
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

function updateScene(next) {
  settings = next;
  if (paused && rendered) {
    rendered = false;
    stage.removeAttribute("data-rendered");
  }
  if (!rendered) showPoster(settings);
  motion.setSettings(settings);
}

function selectSpot(index, announce) {
  aim = Math.max(0, Math.min(positions.length - 1, index));
  stage.dataset.scoopAim = positions[aim].name;
  if (announce) scoopStatus.textContent = copy.aiming(copy.spots[aim]);
}

function spotFromPointer(clientX) {
  const rect = scoop.getBoundingClientRect();
  selectSpot(Math.floor((clientX - rect.left) / rect.width * positions.length), false);
}

function takeScoop() {
  if (settings.cut) return;
  const cut = positions[aim];
  stage.dataset.heroState = "scooped";
  stage.dataset.scoopPosition = cut.name;
  stage.dataset.scoopVisual = "moving";
  scoop.setAttribute("aria-disabled", "true");
  reset.disabled = false;
  scoopStatus.textContent = copy.scooped(copy.spots[aim]);
  updateScene({ ...settings, cut, skipOpening: true, animate: rendered && !paused });
}

scoop.addEventListener("keydown", event => {
  if (settings.cut || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  selectSpot(aim + (event.key === "ArrowLeft" ? -1 : 1), true);
});
scoop.addEventListener("pointerdown", event => {
  if (settings.cut || !event.isPrimary || event.button !== 0) return;
  pointer = event.pointerId;
  scoop.setPointerCapture(pointer);
  spotFromPointer(event.clientX);
});
scoop.addEventListener("pointermove", event => {
  if (event.pointerId === pointer) spotFromPointer(event.clientX);
});
scoop.addEventListener("pointercancel", event => {
  if (event.pointerId === pointer) pointer = null;
});
scoop.addEventListener("pointerup", event => {
  if (event.pointerId !== pointer) return;
  pointer = null;
  spotFromPointer(event.clientX);
  takeScoop();
});
scoop.addEventListener("click", event => {
  if (event.detail === 0) takeScoop();
});
reset.addEventListener("click", event => {
  if (!settings.cut) return;
  stage.dataset.heroState = "intact";
  stage.dataset.scoopPosition = "none";
  stage.dataset.scoopVisual = rendered && !paused ? "ready" : "loading";
  scoop.setAttribute("aria-disabled", "false");
  reset.disabled = true;
  selectSpot(1, false);
  scoopStatus.textContent = copy.reset;
  updateScene({ ...settings, cut: null, skipOpening: true, animate: false });
  if (event.detail === 0) scoop.focus({ preventScroll: true });
});

for (const control of controls) {
  control.addEventListener("change", () => {
    const flavor = Number(control.value);
    stage.dataset.material = control.value;
    updateScene({ ...settings, flavor });
  });
}
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
find("[data-instrument]").hidden = false;
find("[data-scoop-controls]").hidden = false;
scoop.hidden = false;
pause.hidden = !navigator.gpu || !supportsObservers;
if (supportsObservers) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });
