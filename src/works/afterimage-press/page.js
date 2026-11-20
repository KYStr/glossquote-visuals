import { createMotion, observeMotion } from "../../shared/motion.js";

const find = selector => document.querySelector(selector);
const lang = document.documentElement.lang;
const en = lang === "en";
const copy = en ? {
  still: "Showing the still print proof.",
  starting: "Preparing ink registration.",
  reduced: "Reduced motion is on. Showing the still print proof.",
  unavailable: "Showing the still print proof. Live registration is unavailable.",
  running: "The ink plates are in motion.",
  paused: "Motion is paused. Resume to apply a new plate to the live proof.",
  pause: "Pause motion",
  resume: "Resume motion",
  cobalt: "The cobalt speaker cabinet on warm paper.",
  orange: "The fluorescent-orange horn on warm paper.",
  error: "Enter a whole number from 25 to 250 copies.",
  copies: count => `${count} copies`,
  days: (min, max) => `${min}–${max} working days`,
  stock: "170 gsm uncoated, cobalt blue + fluorescent orange",
  heading: "AFTERIMAGE PRESS | Print sheet",
  printed: "Your print sheet is ready to download.",
} : {
  still: "目前顯示靜態校樣。",
  starting: "正在準備油墨套準。",
  reduced: "已依系統偏好減少動態，目前顯示靜態校樣。",
  unavailable: "即時套印無法使用，目前顯示靜態校樣。",
  running: "印版正在移動。",
  paused: "已暫停動態。繼續播放後，即時校樣會套用新選的色版。",
  pause: "暫停動態",
  resume: "繼續動態",
  cobalt: "暖白紙上的鈷藍喇叭音箱。",
  orange: "暖白紙上的螢橘號角。",
  error: "請輸入 25 至 250 之間的整數。",
  copies: count => `${count} 張`,
  days: (min, max) => `${min}–${max} 個工作天`,
  stock: "170 g/m² 未塗佈紙，鈷藍與螢橘雙色",
  heading: "疊印 AFTERIMAGE PRESS｜印件製作單",
  printed: "已產生可下載的印件製作單。",
};

const form = find("[data-form]");
const art = form.elements.art;
const size = form.elements.size;
const paper = form.elements.paper;
const copies = form.elements.copies;
const download = find("[data-download]");
const downloadStatus = find("[data-download-status]");
const feedback = find("[data-feedback]");
const fields = [...document.querySelectorAll("[data-result]")];
const pricing = {
  A3: { setup: 950, unit: 22, min: 5, max: 7 },
  A2: { setup: 1350, unit: 32, min: 7, max: 9 },
};
const number = new Intl.NumberFormat(lang);

function printJob() {
  const count = copies.valueAsNumber;
  if (!copies.validity.valid || !Number.isInteger(count)) return null;
  const rate = pricing[size.value];
  const price = rate.setup + count * (rate.unit + (paper.value === "oat" ? 5 : 0));
  const extra = count > 150 ? 2 : 0;
  return {
    art: art.selectedOptions[0].textContent,
    size: size.selectedOptions[0].textContent,
    copies: copy.copies(count),
    paper: paper.selectedOptions[0].textContent,
    price: `NT$${number.format(price)}`,
    lead: copy.days(rate.min + extra, rate.max + extra),
  };
}

function updateJob() {
  const details = printJob();
  download.disabled = !details;
  copies.setAttribute("aria-invalid", String(!details));
  feedback.textContent = details ? "" : copy.error;
  downloadStatus.textContent = "";
  for (const field of fields) field.textContent = details?.[field.dataset.result] ?? "—";
  return details;
}

form.addEventListener("input", updateJob);
form.addEventListener("change", updateJob);
for (const link of document.querySelectorAll("[data-use-art]")) {
  link.addEventListener("click", () => {
    art.value = link.dataset.useArt;
    updateJob();
    requestAnimationFrame(() => art.focus({ preventScroll: true }));
  });
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const details = updateJob();
  if (!details) {
    copies.focus();
    return;
  }
  const rows = fields.map(field => {
    const label = field.previousElementSibling.textContent;
    return `${label} ${details[field.dataset.result]}`;
  });
  const sheet = [copy.heading, "", ...rows, copy.stock, "", find("[data-concept]").textContent, ""].join("\n");
  const url = URL.createObjectURL(new Blob([sheet], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `afterimage-print-sheet-${lang}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  downloadStatus.textContent = copy.printed;
});
updateJob();
form.hidden = false;
find("[data-receipt]").hidden = false;

const stage = find("[data-stage]");
const canvas = stage.querySelector("canvas");
const pause = find("[data-pause]");
const status = find("[data-motion-status]");
const controls = [...document.querySelectorAll("[name=press-plate]")];
const supportsObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const supported = Boolean(navigator.gpu) && supportsObservers;
let still = stage.querySelector("img");
const proofs = [still];
let settings = { plate: 0 };
let rendered = false;
let paused = false;
let shader;

function paintStill({ plate }) {
  if (proofs[plate] !== still && proofs[plate]) {
    still.replaceWith(proofs[plate]);
    still = proofs[plate];
  }
}
function hideLive() {
  rendered = false;
  stage.removeAttribute("data-rendered");
  paintStill(settings);
}

async function loadStill(file, alt, index) {
  const image = new Image(1200, 600);
  image.alt = alt;
  image.dataset.proof = String(index);
  image.src = new URL(file, proofs[0].src).href;
  await image.decode();
  proofs[index] = image;
}

const motion = createMotion({
  supported,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializePress(canvas, {
      ...options,
      onError() {
        if (!options.signal.aborted) hideLive();
        options.onError();
      },
    });
  },
  applySettings: (renderer, next) => shader.updatePress(renderer, next),
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") {
      rendered = true;
      stage.setAttribute("data-rendered", "");
    } else if (["starting", "reduced", "unavailable"].includes(phase)) {
      hideLive();
    }
    pause.disabled = phase === "reduced" || phase === "unavailable";
    status.textContent = copy[phase];
  },
});

for (const control of controls) {
  control.addEventListener("change", () => {
    settings = { plate: Number(control.value) };
    stage.dataset.material = control.value;
    if (!rendered) paintStill(settings);
    motion.setSettings(settings);
  });
}
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
pause.hidden = !supported;
void Promise.allSettled([
  loadStill("plate-cobalt.webp", copy.cobalt, 1),
  loadStill("plate-orange.webp", copy.orange, 2),
]).then(results => {
  for (const [index, result] of results.entries()) controls[index + 1].disabled = result.status === "rejected";
  find("[data-console]").hidden = false;
});
if (supportsObservers) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });
