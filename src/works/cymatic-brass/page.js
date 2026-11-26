import { createMotion, observeMotion } from "../../shared/motion.js";
import {
  CYCLE_SECONDS,
  RESONANCE_MODES,
  SLOT_SECONDS,
  activeModeFromPos,
  computeModePos,
} from "./mode-state.js";

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const canvas = stage.querySelector("[data-canvas]");
const pause = document.querySelector("[data-pause]");
const status = document.querySelector("[data-motion-status]");
const dial = document.querySelector("[data-instrument]");
const radios = [...dial.querySelectorAll("input")];
const readout = document.querySelector("[data-freq-readout]");
const canWatch = "IntersectionObserver" in window && "ResizeObserver" in window;
const en = document.documentElement.lang === "en";

const labels = en ? {
  still: "Showing a Chladni resonance plate still.",
  starting: "Calibrating the live brass resonator.",
  reduced: "Reduced motion is on. Switch harmonic modes to inspect each nodal figure.",
  unavailable: "Live WebGPU rendering is unavailable. Switch harmonic modes to inspect each nodal figure.",
  running: "Live Chladni resonance sweep running.",
  paused: "Motion is paused. Resume to watch the standing wave transition.",
  pause: "Pause sweep",
} : {
  still: "顯示銅板共振節線靜態畫面。",
  starting: "正在啟動即時聲學共振銅盤。",
  reduced: "已減少動態，可切換三個共振頻率檢視靜態節線圖。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三個共振頻率檢視靜態節線圖。",
  running: "正在播放即時銅板共振掃頻。",
  paused: "已暫停動態。繼續後將重新掃描所選共振頻率。",
  pause: "暫停掃頻",
};

const posters = RESONANCE_MODES.map((m) => new URL(`${m.file}.webp`, poster.src).href);
let settings = { index: 0, modePos: 0 };
let autoSweep = true;
let sweepElapsed = 0;
let sweepFrame = 0;
let lastSweepTick = 0;
let currentPhase = "still";
let paused = false;
let rendered = false;
let shader;

function syncModeUI(index) {
  const safeIndex = ((index % RESONANCE_MODES.length) + RESONANCE_MODES.length) % RESONANCE_MODES.length;
  stage.dataset.material = String(safeIndex);
  if (readout) readout.textContent = RESONANCE_MODES[safeIndex].freq;
  if (radios[safeIndex] && !radios[safeIndex].checked) {
    radios[safeIndex].checked = true;
  }
  if (!rendered) {
    const source = posters[safeIndex];
    if (poster.src !== source) poster.src = source;
  }
}

function stopSweepLoop() {
  if (sweepFrame) {
    cancelAnimationFrame(sweepFrame);
    sweepFrame = 0;
  }
  lastSweepTick = 0;
}

function startSweepLoop() {
  if (sweepFrame || !autoSweep || currentPhase !== "running") return;
  lastSweepTick = performance.now();
  const tick = (now) => {
    if (!autoSweep || currentPhase !== "running") {
      stopSweepLoop();
      return;
    }
    const dt = Math.min(Math.max((now - lastSweepTick) / 1000, 0), 0.1);
    lastSweepTick = now;
    sweepElapsed = (sweepElapsed + dt) % CYCLE_SECONDS;
    const nextPos = computeModePos(sweepElapsed);
    const nextIndex = activeModeFromPos(nextPos);
    if (nextIndex !== settings.index) {
      syncModeUI(nextIndex);
    }
    if (Math.abs(nextPos - settings.modePos) > 1e-4 || nextIndex !== settings.index) {
      settings = { index: nextIndex, modePos: nextPos };
      motion.setSettings(settings);
    }
    sweepFrame = requestAnimationFrame(tick);
  };
  sweepFrame = requestAnimationFrame(tick);
}

const motion = createMotion({
  supported: Boolean(navigator.gpu) && canWatch,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeBrass(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateBrass(renderer, next);
  },
  renderState(phase) {
    currentPhase = phase;
    stage.dataset.motion = phase;
    if (phase === "running") rendered = true;
    if (["starting", "unavailable", "reduced"].includes(phase)) rendered = false;
    syncModeUI(settings.index);
    stage.toggleAttribute("data-rendered", rendered);
    pause.disabled = phase === "reduced" || phase === "unavailable";
    status.textContent = labels[phase];
    if (phase === "running" && autoSweep) startSweepLoop();
    else stopSweepLoop();
  },
});

for (const radio of radios) {
  radio.addEventListener("change", () => {
    autoSweep = false;
    stopSweepLoop();
    const index = Number(radio.value);
    sweepElapsed = index * SLOT_SECONDS;
    settings = { index, modePos: index };
    syncModeUI(index);
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
  stopSweepLoop();
  rendered = false;
  stage.removeAttribute("data-rendered");
});

dial.hidden = false;
pause.hidden = !navigator.gpu || !canWatch;
if (canWatch) observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));
else motion.update({ active: true });

// Commercial flow: Room Acoustic Specifier & Brief Download
const form = document.querySelector("[data-acoustic-form]");
const summaryEl = document.querySelector("[data-acoustic-summary]");
const totalEl = document.querySelector("[data-acoustic-total]");
const feedbackEl = document.querySelector("[data-acoustic-feedback]");
const downloadBtn = document.querySelector("[data-download-brief]");
const areaErrorEl = document.querySelector("[data-area-error]");
const qtyErrorEl = document.querySelector("[data-qty-error]");

const field = (name) => form?.querySelector(`[name="${name}"]`);

const systems = en ? {
  desk: { name: "Desk Resonator Ø280 mm (C260 2.5 mm)", price: 14800 },
  wall: { name: "Wall Diffuser Panel 600×600 mm (C260 3.0 mm)", price: 32000 },
  array: { name: "Spatial Acoustic Array · 4-Plate Matrix", price: 78000 },
} : {
  desk: { name: "桌面共振盤 Ø280 mm（C260 2.5 mm 黃銅）", price: 14800 },
  wall: { name: "壁面擴散銅板 600×600 mm（C260 3.0 mm 黃銅）", price: 32000 },
  array: { name: "展演場域聲學矩陣（四盤連動系統）", price: 78000 },
};

const finishCosts = { brushed: 0, oxidized: 2400 };

function validateInteger(input, min, max, label) {
  const raw = String(input?.value ?? "").trim();
  if (!raw || input?.validity?.badInput) {
    return {
      valid: false,
      value: null,
      error: en
        ? `Enter a whole number between ${min} and ${max}.`
        : `請輸入 ${min} 至 ${max} 的整數。`,
    };
  }
  if (!/^[+-]?\d+$/.test(raw)) {
    return {
      valid: false,
      value: null,
      error: en
        ? `${label} must be a whole number (${min}–${max}); decimals are not supported.`
        : `${label}須為 ${min} 至 ${max} 的整數，不接受小數。`,
    };
  }
  const value = Number.parseInt(raw, 10);
  if (value < min) {
    return {
      valid: false,
      value: null,
      error: en
        ? `Minimum ${label.toLowerCase()} is ${min} (enter ${min}–${max}).`
        : `${label}不可小於 ${min}（範圍 ${min}–${max}）。`,
    };
  }
  if (value > max) {
    return {
      valid: false,
      value: null,
      error: en
        ? `Maximum ${label.toLowerCase()} is ${max} (enter ${min}–${max}).`
        : `${label}不可超過上限 ${max}（範圍 ${min}–${max}）。`,
    };
  }
  return { valid: true, value, error: "" };
}

function setFieldError(input, errorEl, check) {
  if (!input) return;
  if (!check.valid) {
    input.setAttribute("aria-invalid", "true");
    if (errorEl) {
      errorEl.textContent = check.error;
      errorEl.hidden = false;
    }
  } else {
    input.removeAttribute("aria-invalid");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  }
}

function getSpec() {
  const sysKey = field("system").value;
  const areaInput = field("area");
  const qtyInput = field("quantity");
  const areaCheck = validateInteger(areaInput, 8, 400, en ? "Room area" : "空間面積");
  const qtyCheck = validateInteger(qtyInput, 1, 12, en ? "Units" : "配置組數");
  const reverb = field("reverb").value;
  const finish = field("finish").value;
  const sys = systems[sysKey] ?? systems.desk;
  const valid = areaCheck.valid && qtyCheck.valid;
  const total = valid ? (sys.price + (finishCosts[finish] ?? 0)) * qtyCheck.value : null;
  return {
    sysKey,
    sys,
    areaInput,
    qtyInput,
    areaCheck,
    qtyCheck,
    valid,
    area: areaCheck.value,
    reverb,
    finish,
    qty: qtyCheck.value,
    total,
  };
}

function updateSpec() {
  if (!form) return;
  const s = getSpec();
  setFieldError(s.areaInput, areaErrorEl, s.areaCheck);
  setFieldError(s.qtyInput, qtyErrorEl, s.qtyCheck);

  if (!s.valid) {
    totalEl.textContent = "—";
    summaryEl.textContent = en
      ? "Fix the highlighted numeric field above to update the estimate and download."
      : "請先修正上方無效數字欄位，再檢視估算費用與下載提案單。";
    if (downloadBtn) downloadBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = "";
    return;
  }

  if (downloadBtn) downloadBtn.disabled = false;
  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const finishName = s.finish === "oxidized"
    ? (en ? "Hand-Oxidized Bronze (+NT$ 2,400/unit)" : "手工氧化古銅（每組 +NT$ 2,400）")
    : (en ? "Radial Brushed Brass (standard)" : "同心拉絲原銅（標準表面）");
  summaryEl.textContent = en
    ? `${s.qty} × ${s.sys.name} · ${finishName} · Room ${s.area} m² · Target RT60: ${s.reverb}`
    : `${s.qty} 組 × ${s.sys.name}｜${finishName}｜空間 ${s.area} m²｜殘響取向：${s.reverb}`;
}

for (const btn of document.querySelectorAll("[data-choose-system]")) {
  btn.addEventListener("click", () => {
    const systemSelect = field("system");
    if (systemSelect) {
      systemSelect.value = btn.dataset.chooseSystem;
      updateSpec();
    }
  });
}

if (form) {
  form.addEventListener("input", updateSpec);
  form.addEventListener("change", updateSpec);
  updateSpec();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getSpec();
    if (!s.valid) {
      updateSpec();
      const firstInvalid = !s.areaCheck.valid ? s.areaInput : s.qtyInput;
      firstInvalid?.focus();
      if (feedbackEl) feedbackEl.textContent = !s.areaCheck.valid ? s.areaCheck.error : s.qtyCheck.error;
      return;
    }
    const lines = en ? [
      "CYMATIC BRASS — Offline Acoustic Installation Brief (Concept Brand)",
      "===================================================================",
      `System: ${s.sys.name}`,
      `Quantity: ${s.qty}`,
      `Surface Finish: ${s.finish === "oxidized" ? "Hand-Oxidized Bronze" : "Radial Brushed Brass"}`,
      `Room Floor Area: ${s.area} m²`,
      `Reverberation Profile: ${s.reverb}`,
      `Indicative Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "Notice: CYMATIC BRASS is a concept studio showcase. No inquiry or payment was transmitted.",
    ] : [
      "銅頻 CYMATIC BRASS — 離線聲學配置提案單（概念品牌示意）",
      "===================================================================",
      `聲學方案：${s.sys.name}`,
      `配置組數：${s.qty} 組`,
      `表面處理：${s.finish === "oxidized" ? "手工氧化古銅" : "同心拉絲原銅"}`,
      `空間面積：${s.area} m²`,
      `殘響目標：${s.reverb}`,
      `示意估算費用：NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "提醒：銅頻為概念品牌作品展示，本操作僅於本機匯出文字提案單，未送出任何委託或付款。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cymatic-brass-brief.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Acoustic brief saved locally (cymatic-brass-brief.txt). No online request was sent."
      : "已於本機下載聲學配置提案單（cymatic-brass-brief.txt），未進行線上傳送。";
  });
}
