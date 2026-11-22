import { freezePress } from "./freeze.js";
import { createMotion, observeMotion } from "../../shared/motion.js";
import { bladeEdge, initialEdge, liftStart, pullStart, sheetHeight, strokeDuration } from "./stroke.js";

const find = selector => document.querySelector(selector);
const lang = document.documentElement.lang;
const en = lang === "en";
const copy = en ? {
  still: "Showing the still print proof.",
  starting: "Preparing the press bed.",
  reprint: "Reprint second ink",
  showStart: "View the start of printing",
  showPrinted: "View finished print",
  pulling: "The blade is depositing the second ink.",
  complete: "The second ink is printed.",
  combined: "The fluorescent orange horn overprints the cobalt speaker in deep violet.",
  reduced: "Reduced motion is on. Showing the still print proof.",
  unavailable: "Showing the still print proof. Live registration is unavailable.",
  running: "Live screen print.",
  paused: "Printing motion is paused.",
  pause: "Pause motion",
  resume: "Resume motion",
  orange: "The fluorescent-orange horn on warm paper.",
  error: "Enter a whole number from 25 to 250 copies.",
  copies: count => `${count} copies`,
  days: (min, max) => `${min}–${max} working days`,
  stock: "170 gsm uncoated, cobalt blue + fluorescent orange",
  heading: "AFTERIMAGE PRESS | Print sheet",
  printed: "Your print sheet is ready to download.",
} : {
  still: "目前顯示靜態校樣。",
  starting: "正在準備印台。",
  reprint: "重印第二版",
  showStart: "看印刷起點",
  showPrinted: "看完整印件",
  pulling: "刮刀正在印上第二層油墨。",
  complete: "第二道墨已印好。",
  combined: "螢橘號角印上鈷藍喇叭，交疊處留下深紫。",
  reduced: "已依系統偏好減少動態，目前顯示靜態校樣。",
  unavailable: "即時套印無法使用，目前顯示靜態校樣。",
  running: "即時網版印刷。",
  paused: "已暫停刮墨動態。",
  pause: "暫停動態",
  resume: "繼續動態",
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
const bed = stage.querySelector(".registration");
const inkDetail = stage.querySelector(".ink-detail");
const tool = stage.querySelector(".squeegee");
const pause = find("[data-pause]");
const repeat = find("[data-reprint]");
const status = find("[data-motion-status]");
const controls = [...document.querySelectorAll("[name=press-plate]")];
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const supportsObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const supported = Boolean(navigator.gpu) && supportsObservers;
let still = stage.querySelector("[data-proof]");
const proofs = [null, still, null];
let plate = 0;
let elapsed = 0;
let previousFrame = null;
let frame = 0;
let frozenFrame = null;
let phase = "still";
let rendered = false;
let paused = false;
let staticStart = false;
let printRun = 0;
let shader;

function isStatic() {
  return !supported || preference.matches || phase === "unavailable";
}

function showProof(index) {
  const next = proofs[index];
  if (next && next !== still) {
    still.replaceWith(next);
    still = next;
  }
}

function updateStage() {
  const staticMode = isStatic();
  const progress = staticMode ? Number(!staticStart) : elapsed / strokeDuration;
  const heroState = plate === 1 ? "cobalt" : plate === 2 ? "orange" :
    progress === 1 ? "printed" : progress === 0 ? "ready" : "printing";
  const step = progress < pullStart ? "ready" : progress < liftStart ? "passing" : progress < 1 ? "lifting" : "complete";
  const stepChanged = stage.dataset.printStep !== step || stage.dataset.heroState !== heroState;
  if (stepChanged) {
    stage.dataset.heroState = heroState;
    stage.dataset.printStep = step;
    status.textContent = [copy[phase], heroState === "printed" ? copy.complete :
      step === "passing" ? copy.pulling : ""].filter(Boolean).join(" ");
  }
  stage.toggleAttribute("data-static-start", staticMode && staticStart);
  if (!rendered) showProof(plate || (progress < 1 ? 1 : 0));
  // In normal motion the blade and ink frontier share one stage coordinate.
  // During WebGPU initialization and recovery, keep the static first proof.
  const edge = bladeEdge(rendered ? progress : 0);
  tool.style.setProperty("--blade", String(edge));
  inkDetail.style.setProperty("--ink-cut", `${inkCoverage(edge) * 100}%`);
}

async function loadStill(file, alt, index) {
  const image = new Image(1200, 600);
  image.alt = alt;
  image.dataset.proof = String(index);
  image.src = new URL(file, proofs[1].src).href;
  await image.decode();
  proofs[index] = image;
}

function inkCoverage(edge) {
  return Math.max(0, Math.min(1, (edge - initialEdge) / sheetHeight));
}

function printSettings() {
  const edge = bladeEdge(elapsed / strokeDuration);
  return { plate, inkEdge: inkCoverage(edge) };
}

function draw(time) {
  frame = 0;
  if (phase !== "running" || plate !== 0) return;
  const increment = previousFrame === null ? 0 : Math.min(time - previousFrame, 80);
  previousFrame = time;
  elapsed = Math.min(strokeDuration, elapsed + increment);
  motion.setSettings(printSettings());
  updateStage();
  if (elapsed < strokeDuration) frame = requestAnimationFrame(draw);
}

function startClock() {
  if (!frame && phase === "running" && plate === 0 && elapsed < strokeDuration) {
    frame = requestAnimationFrame(draw);
  }
}

function stopClock() {
  cancelAnimationFrame(frame);
  frame = 0;
  previousFrame = null;
}

function restoreLiveFrame() {
  if (!frozenFrame) return;
  inkDetail.before(canvas);
  frozenFrame.remove();
  frozenFrame = null;
}

function presentFrame(next) {
  if (next === "paused" && rendered) {
    // The GPU queue is locked by createMotion before this read. Retain the
    // detached live canvas and timeline for resume, with one canvas onscreen.
    try {
      frozenFrame = freezePress({
        stage, bed, canvas, inkDetail, tool, plate, coverage: printSettings().inkEdge,
      });
    } catch {
      // A read can fail during device loss. Leave the locked canvas in place
      // so the normal recovery path can present its fallback.
      frozenFrame = null;
    }
    if (frozenFrame) {
      canvas.remove();
      stage.append(frozenFrame);
    }
  }
  stage.dataset.motion = next;
}

const motion = createMotion({
  supported,
  initialSettings: printSettings(),
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializePress(canvas, {
      ...options,
      onError() {
        if (!options.signal.aborted) {
          restoreLiveFrame();
          rendered = false;
          stage.removeAttribute("data-rendered");
        }
        options.onError();
        if (!options.signal.aborted) updateStage();
      },
    });
  },
  applySettings: (renderer, next) => shader.updatePress(renderer, next),
  renderState(next) {
    phase = next;
    if (phase !== "paused") restoreLiveFrame();
    if (phase === "running") {
      rendered = true;
      stage.setAttribute("data-rendered", "");
      startClock();
    } else {
      stopClock();
      if (["starting", "reduced", "unavailable"].includes(phase)) {
        rendered = false;
        stage.removeAttribute("data-rendered");
      }
    }
    pause.hidden = isStatic();
    repeat.textContent = isStatic() ? (staticStart ? copy.showPrinted : copy.showStart) : copy.reprint;
    status.textContent = copy[phase];
    updateStage();
    presentFrame(next);
  },
});

function setPause(next) {
  paused = next;
  pause.textContent = paused ? copy.resume : copy.pause;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
}

for (const control of controls) {
  control.addEventListener("change", () => {
    stopClock();
    plate = Number(control.value);
    stage.dataset.material = control.value;
    elapsed = strokeDuration;
    staticStart = false;
    motion.setSettings(printSettings());
    if (paused && !isStatic()) setPause(false);
    repeat.textContent = isStatic() ? copy.showStart : copy.reprint;
    updateStage();
  });
}
pause.addEventListener("click", () => setPause(!paused));
repeat.addEventListener("click", () => {
  stopClock();
  controls[0].checked = true;
  plate = 0;
  stage.dataset.material = "0";
  stage.dataset.printRun = String(++printRun);
  if (isStatic()) {
    staticStart = !staticStart;
    repeat.textContent = staticStart ? copy.showPrinted : copy.showStart;
    // A later change back to motion keeps the selected still until reprint.
    elapsed = strokeDuration;
  } else {
    elapsed = 0;
    stage.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  motion.setSettings(printSettings());
  if (paused && !isStatic()) setPause(false);
  updateStage();
  startClock();
});
void Promise.allSettled([
  loadStill("plate-both.webp", copy.combined, 0),
  loadStill("plate-orange.webp", copy.orange, 2),
]).then(results => {
  controls[2].disabled = results[1].status === "rejected" && !rendered;
  updateStage();
  find("[data-console]").hidden = false;
});
if (supportsObservers) observeMotion(stage, motion, preference);
else motion.update({ active: true });
