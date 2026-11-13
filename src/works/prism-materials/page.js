import { createMotion, observeMotion } from "../../shared/motion.js";

const en = document.documentElement.lang === "en";
const copy = en ? {
  brand: "PRISM Materials", title: "Architectural glass sample brief",
  still: "Showing the still specimen.",
  reduced: "Reduced motion is on. Showing the still specimen.",
  unavailable: "Live optics are unavailable. Showing the still specimen.",
  starting: "Preparing the live specimen.",
  running: "Rotate the specimen to see how its edges bend the blue band.",
  paused: "Motion paused. Resume to apply any new surface or angle.",
  add: "Add to list", save: "Save changes", edit: "Edit", remove: "Remove",
  invalid: "Enter a whole number from 1 to 20.",
  lineLimit: "The list already has this surface. Each surface can have up to 20 samples.",
  added: (name, count) => `Added ${count} × ${name}.`,
  saved: name => `Updated ${name}.`, removed: name => `Removed ${name}.`,
  editing: name => `Editing ${name}.`,
  quantity: "Sample quantity", surface: "Surface", size: "Sample size",
  thickness: "Indicative thickness", use: "Applications",
  total: count => `${count} ${count === 1 ? "sample" : "samples"} in the list`,
  download: "Sample brief generated. Check your browser’s downloads. No request was sent and no delivery was arranged.",
  local: "This brief records a concept selection. No request was sent and no delivery was arranged.",
} : {
  brand: "PRISM 折光材料室", title: "建築玻璃選樣需求",
  still: "目前顯示靜態試片。",
  reduced: "已依系統偏好減少動態，顯示靜態試片。",
  unavailable: "目前無法即時顯示折射，改以靜態試片呈現。",
  starting: "正在準備動態試片。",
  running: "轉動試片，觀察玻璃邊緣如何折彎藍色光帶。",
  paused: "動態已暫停。繼續動態後會套用新的表面或角度。",
  add: "加入清單", save: "儲存修改", edit: "修改", remove: "移除",
  invalid: "請輸入 1 至 20 的整數。",
  lineLimit: "清單已有此表面，每種表面最多可選 20 片。",
  added: (name, count) => `已加入 ${count} 片${name}。`,
  saved: name => `已更新${name}。`, removed: name => `已移除${name}。`,
  editing: name => `正在修改${name}。`,
  quantity: "樣板數量", surface: "表面", size: "樣板尺寸",
  thickness: "示意厚度", use: "適用場景",
  total: count => `清單共 ${count} 片樣板`,
  download: "已產生選樣需求，請查看瀏覽器的下載項目。尚未送出需求或安排寄送。",
  local: "本摘要為概念選樣紀錄，尚未送出需求或安排寄送。",
};

const find = selector => document.querySelector(selector);
const products = new Map([...document.querySelectorAll("[data-product]")].map(card => {
  const read = selector => card.querySelector(selector).textContent;
  const image = card.querySelector("img");
  return [card.dataset.product, {
    code: card.dataset.code, name: read("[data-name]"), surface: read("[data-surface]"),
    size: read("[data-size]"), thickness: read("[data-thickness]"), use: read("[data-use]"),
    image: image.src,
  }];
}));

const stage = find("[data-stage]");
const poster = stage.querySelector("img");
const canvas = stage.querySelector("canvas");
const pause = find("[data-pause]");
const angle = find("#prism-angle");
const output = find("#prism-angle-output");
const motionStatus = find("[data-motion-status]");
const figureName = find("[data-figure-name]");
const surfaces = [...document.querySelectorAll("[name=specimen]")];
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
let settings = { finish: "clear", angle: angle.valueAsNumber };
let shader;
let paused = false;
let rendered = false;

const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializePrism(canvas, options);
  },
  applySettings(renderer, next) {
    shader.updatePrism(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") rendered = true;
    if (["starting", "reduced", "unavailable"].includes(phase)) rendered = false;
    stage.toggleAttribute("data-rendered", rendered);
    const staticOnly = phase === "reduced" || phase === "unavailable";
    pause.disabled = staticOnly;
    angle.disabled = staticOnly;
    motionStatus.textContent = copy[phase];
  },
});

function setSurface(finish) {
  const product = products.get(finish);
  if (finish === settings.finish) return;
  stage.dataset.finish = finish;
  poster.src = `${import.meta.env.BASE_URL}media/prism-${finish}-hero.webp`;
  poster.alt = en ? `${product.name} specimen against a cobalt band and drafting grid` : `${product.name}試片與鈷藍光帶、建築格線`;
  figureName.textContent = `${product.code} / ${product.name}`;
  settings = { ...settings, finish };
  motion.setSettings(settings);
}

for (const surface of surfaces) {
  surface.addEventListener("change", () => setSurface(surface.value));
}
angle.addEventListener("input", () => {
  settings = { ...settings, angle: angle.valueAsNumber };
  output.value = `${settings.angle}°`;
  motion.setSettings(settings);
});
pause.addEventListener("click", () => {
  paused = !paused;
  pause.setAttribute("aria-pressed", String(paused));
  motion.update({ paused });
});
window.addEventListener("pagehide", () => {
  rendered = false;
  stage.removeAttribute("data-rendered");
});
find("[data-instrument]").hidden = false;
if (hasObservers) {
  observeMotion(stage, motion, preference);
} else {
  const update = () => motion.update({ active: true, reduced: preference.matches });
  update();
  preference.addEventListener("change", update);
}

const form = find("#sample-form");
const finishInput = find("#sample-finish");
const quantity = find("#sample-quantity");
const add = find("[data-add]");
const cancel = find("[data-cancel-edit]");
const photo = find("[data-sample-photo]");
const formFeedback = find("[data-form-feedback]");
const listTitle = find("#list-title");
const items = find("[data-items]");
const empty = find("[data-empty]");
const count = find("[data-count]");
const total = find("[data-total]");
const download = find("[data-download]");
const downloadStatus = find("[data-download-status]");
const lines = new Map();
let editing = null;

function configure() {
  const product = products.get(finishInput.value);
  photo.src = product.image;
  find("[data-selected-surface]").textContent = product.surface;
  find("[data-selected-size]").textContent = product.size;
  find("[data-selected-thickness]").textContent = product.thickness;
}

function feedback(message, invalid = false) {
  formFeedback.textContent = message;
  formFeedback.toggleAttribute("data-invalid", invalid);
  if (invalid) quantity.setAttribute("aria-invalid", "true");
  else quantity.removeAttribute("aria-invalid");
}

function stopEditing() {
  editing = null;
  finishInput.disabled = false;
  add.firstElementChild.textContent = copy.add;
  cancel.hidden = true;
  quantity.value = "1";
  feedback("");
}

function focusForm() {
  finishInput.disabled ? quantity.focus() : finishInput.focus();
}

function refreshList() {
  const units = [...lines.values()].reduce((sum, line) => sum + line.count, 0);
  empty.hidden = lines.size > 0;
  total.hidden = lines.size === 0;
  count.hidden = lines.size === 0;
  count.textContent = units;
  total.textContent = copy.total(units);
  download.disabled = lines.size === 0;
  downloadStatus.textContent = "";
}

function element(tag, label) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  return node;
}

function updateLine(line, count) {
  line.count = count;
  line.label.textContent = `${line.product.surface} · ${count} × ${line.product.size}`;
}

function createLine(key, product, amount) {
  const node = element("li");
  node.dataset.line = key;
  const details = element("div");
  const title = element("strong", product.name);
  const label = element("p");
  details.append(title, label);

  const buttons = element("div");
  const edit = element("button", copy.edit);
  const remove = element("button", copy.remove);
  for (const button of [edit, remove]) {
    button.type = "button";
    button.className = "text-link";
    button.setAttribute("aria-label", `${button.textContent} · ${product.name}`);
  }
  edit.dataset.edit = key;
  remove.dataset.remove = key;
  buttons.append(edit, remove);
  node.append(details, buttons);
  const line = { product, label, edit, count: amount };

  edit.addEventListener("click", () => {
    editing = key;
    finishInput.value = key;
    finishInput.disabled = true;
    configure();
    quantity.value = String(line.count);
    add.firstElementChild.textContent = copy.save;
    cancel.hidden = false;
    feedback(copy.editing(product.name));
    focusForm();
  });
  remove.addEventListener("click", () => {
    const sibling = node.nextElementSibling ?? node.previousElementSibling;
    if (editing === key) stopEditing();
    lines.delete(key);
    node.remove();
    refreshList();
    downloadStatus.textContent = copy.removed(product.name);
    (sibling?.querySelector("[data-edit]") ?? listTitle).focus();
  });
  items.append(node);
  lines.set(key, line);
  updateLine(line, amount);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!quantity.validity.valid) {
    feedback(copy.invalid, true);
    quantity.focus();
    return;
  }
  const key = finishInput.value;
  const product = products.get(key);
  const previous = lines.get(key);
  const amount = quantity.valueAsNumber;
  const next = editing ? amount : (previous?.count ?? 0) + amount;
  if (next > 20) {
    feedback(copy.lineLimit, true);
    quantity.focus();
    return;
  }

  if (previous) updateLine(previous, next);
  else createLine(key, product, next);
  refreshList();
  if (editing) {
    stopEditing();
    downloadStatus.textContent = copy.saved(product.name);
    previous.edit.focus();
  } else {
    feedback(copy.added(product.name, amount));
  }
});

cancel.addEventListener("click", () => {
  const line = lines.get(editing);
  stopEditing();
  line?.edit.focus();
});
finishInput.addEventListener("change", () => {
  configure();
  feedback("");
});
quantity.addEventListener("input", () => feedback(""));
for (const link of document.querySelectorAll("[data-select]")) {
  link.hidden = false;
  link.addEventListener("click", event => {
    event.preventDefault();
    stopEditing();
    finishInput.value = link.dataset.select;
    configure();
    focusForm();
  });
}

download.addEventListener("click", () => {
  if (!lines.size) return;
  const summary = [copy.brand, copy.title, ""];
  for (const { product, count } of lines.values()) {
    summary.push(`${product.code} / ${product.name}`, `${copy.surface} · ${product.surface}`,
      `${copy.size} · ${product.size}`, `${copy.thickness} · ${product.thickness}`,
      `${copy.use} · ${product.use}`, `${copy.quantity} · ${count}`, "");
  }
  summary.push(total.textContent, "", copy.local, "");
  const url = URL.createObjectURL(new Blob([summary.join("\n")], { type: "text/plain;charset=utf-8" }));
  const link = element("a");
  link.href = url;
  link.download = en ? "prism-sample-brief-en.txt" : "prism-sample-brief-zh-Hant.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  downloadStatus.textContent = copy.download;
});

find("[data-list-link]").href = "#sample-list";
find("[data-builder]").hidden = false;
