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
  still: "Showing a cyanotype botanical print still.",
  starting: "Preparing the live sunlight exposure.",
  reduced: "Reduced motion is on. Switch specimens to inspect each archival print.",
  unavailable: "Live WebGPU rendering is unavailable. Switch specimens to inspect each archival print.",
  running: "Live UV cyanotype exposure running.",
  paused: "Exposure paused. Resume to see a new specimen develop.",
  pause: "Pause exposure",
} : {
  still: "顯示藍曬植物標本靜態畫面。",
  starting: "正在準備即時日光藍曬顯影。",
  reduced: "已減少動態，可切換三種植物標本檢視藍曬成品。",
  unavailable: "即時 WebGPU 畫面目前無法使用，可切換三種植物標本檢視藍曬成品。",
  running: "正在播放即時日光藍曬顯影。",
  paused: "已暫停顯影。繼續後將顯示新選標本的日光曝光。",
  pause: "暫停顯影",
};

const names = ["ginkgo", "fern", "eucalyptus"];
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
    return shader.initializeCyanotype(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updateCyanotype(renderer, next);
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
    const specSelect = document.querySelector("#bp-specimen");
    if (specSelect && specSelect.options[index]) {
      specSelect.selectedIndex = index;
      updateEdition();
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

// Commercial flow: Herbarium Edition Configurator & Offline Order Sheet
const form = document.querySelector("[data-edition-form]");
const summaryEl = document.querySelector("[data-edition-summary]");
const totalEl = document.querySelector("[data-edition-total]");
const feedbackEl = document.querySelector("[data-edition-feedback]");
const downloadBtn = document.querySelector("[data-download-edition]");
const qtyErrorEl = document.querySelector("[data-qty-error]");

const field = (name) => form?.querySelector(`[name="${name}"]`);

const editions = en ? {
  single: { name: "Single Specimen Frame (30 × 40 cm · 300 gsm Cotton)", price: 2800 },
  diptych: { name: "Diptych Botanical Study (2 × 30 × 40 cm)", price: 5200 },
  kit: { name: "Home Cyanotype Sun-Print Kit (12 sheets + UV glass)", price: 1650 },
} : {
  single: { name: "單幅標本框（30 × 40 cm · 300 gsm 棉紙）", price: 2800 },
  diptych: { name: "雙聯對照組（兩幅 30 × 40 cm 標本框）", price: 5200 },
  kit: { name: "工作坊藍曬組（12 張棉紙＋壓花玻璃框）", price: 1650 },
};

const specimenNames = en
  ? ["Ginkgo Biloba (No. 01)", "Maidenhair Fern (No. 02)", "Eucalyptus Sprig (No. 03)"]
  : ["銀杏葉脈 Ginkgo（編號 01）", "鐵線蕨羽片 Fern（編號 02）", "尤加利果枝 Eucalyptus（編號 03）"];

const frameCosts = { ash: 0, oak: 420, unframed: -400 };

function validateQuantity(input, min, max) {
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
        ? `Quantity must be a whole number (${min}–${max}); decimals are not supported.`
        : `數量須為 ${min} 至 ${max} 的整數，不接受小數。`,
    };
  }
  const value = Number.parseInt(raw, 10);
  if (value < min) {
    return {
      valid: false,
      value: null,
      error: en
        ? `Minimum quantity is ${min} (enter ${min}–${max}).`
        : `數量不可小於 ${min} 組（範圍 ${min}–${max} 組）。`,
    };
  }
  if (value > max) {
    return {
      valid: false,
      value: null,
      error: en
        ? `Maximum quantity is ${max} (enter ${min}–${max}).`
        : `數量不可超過上限 ${max} 組（範圍 ${min}–${max} 組）。`,
    };
  }
  return { valid: true, value, error: "" };
}

function getEditionState() {
  const edKey = field("edition").value;
  const specIdx = Number(field("specimen").value);
  const paper = field("paper").value;
  const frame = field("frame").value;
  const qtyInput = field("quantity");
  const qtyCheck = validateQuantity(qtyInput, 1, 20);
  const ed = editions[edKey] ?? editions.single;
  const frameDelta = edKey === "kit" ? 0 : (frameCosts[frame] ?? 0);
  const total = qtyCheck.valid ? Math.max(500, ed.price + frameDelta) * qtyCheck.value : null;
  return {
    edKey,
    ed,
    specIdx,
    specName: specimenNames[specIdx] ?? specimenNames[0],
    paper,
    frame,
    qtyInput,
    qtyCheck,
    qty: qtyCheck.value,
    total,
  };
}

function updateEdition() {
  if (!form) return;
  const s = getEditionState();
  if (!s.qtyCheck.valid) {
    s.qtyInput.setAttribute("aria-invalid", "true");
    if (qtyErrorEl) {
      qtyErrorEl.textContent = s.qtyCheck.error;
      qtyErrorEl.hidden = false;
    }
    totalEl.textContent = "—";
    summaryEl.textContent = en
      ? "Enter a valid quantity (whole number 1–20) to update the estimate and download."
      : "請先輸入有效數量（1–20 的整數），再檢視估算總計與下載明細。";
    if (downloadBtn) downloadBtn.disabled = true;
    if (feedbackEl) feedbackEl.textContent = "";
    return;
  }

  s.qtyInput.removeAttribute("aria-invalid");
  if (qtyErrorEl) {
    qtyErrorEl.textContent = "";
    qtyErrorEl.hidden = true;
  }
  if (downloadBtn) downloadBtn.disabled = false;

  totalEl.textContent = `NT$ ${s.total.toLocaleString("en-US")}`;
  const frameLabel = s.edKey === "kit"
    ? (en ? "Includes contact printing glass" : "內含日光壓花玻璃框")
    : s.frame === "oak"
      ? (en ? "Smoked Oak Frame (+NT$ 420)" : "煙燻橡木框（+NT$ 420）")
      : s.frame === "unframed"
        ? (en ? "Unframed archival sleeve (-NT$ 400)" : "無框棉紙收藏袋（-NT$ 400）")
        : (en ? "Natural Ash Wood Frame (included)" : "白蠟木實木框（標準配置）");
  summaryEl.textContent = en
    ? `${s.qty} × ${s.ed.name} · ${s.specName} · ${s.paper} · ${frameLabel}`
    : `${s.qty} 組 × ${s.ed.name}｜${s.specName}｜${s.paper}｜${frameLabel}`;
}

for (const btn of document.querySelectorAll("[data-choose-edition]")) {
  btn.addEventListener("click", () => {
    const editionSelect = field("edition");
    if (editionSelect) {
      editionSelect.value = btn.dataset.chooseEdition;
      updateEdition();
    }
  });
}

if (form) {
  form.addEventListener("input", updateEdition);
  form.addEventListener("change", updateEdition);
  updateEdition();
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const s = getEditionState();
    if (!s.qtyCheck.valid) {
      updateEdition();
      s.qtyInput.focus();
      if (feedbackEl) feedbackEl.textContent = s.qtyCheck.error;
      return;
    }
    const lines = en ? [
      "BOTANICA PRESS — Offline Archival Edition Sheet (Concept Brand)",
      "===============================================================",
      `Edition: ${s.ed.name}`,
      `Botanical Specimen: ${s.specName}`,
      `Paper Stock: ${s.paper}`,
      `Framing: ${s.edKey === "kit" ? "UV Contact Glass Included" : s.frame}`,
      `Quantity: ${s.qty}`,
      `Indicative Estimate: NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "Notice: BOTANICA PRESS is a concept botanical studio for GlossQuote Visuals. No purchase or upload occurred.",
    ] : [
      "葉脈壓標本 BOTANICA PRESS — 離線標本收藏明細（概念品牌示意）",
      "===============================================================",
      `收藏品項：${s.ed.name}`,
      `植物標本：${s.specName}`,
      `紙材色調：${s.paper}`,
      `裝框選擇：${s.edKey === "kit" ? "內含日光壓花玻璃框" : s.frame}`,
      `數量：${s.qty} 組`,
      `示意估算總計：NT$ ${s.total.toLocaleString("en-US")}`,
      "",
      "提醒：葉脈壓標本為概念品牌作品展示，本清單僅於本機匯出留存，無線上訂購或付款行為。",
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "botanica-press-edition.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedbackEl.textContent = en
      ? "Edition sheet downloaded (botanica-press-edition.txt). No online checkout was performed."
      : "已於本機下載收藏明細（botanica-press-edition.txt），未進行任何線上結帳。";
  });
}
