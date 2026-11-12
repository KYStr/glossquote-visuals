import { createMotion, observeMotion } from "../../shared/motion.js";

const en = document.documentElement.lang === "en";
const copy = en ? {
  still: "Showing the still reflection.",
  reduced: "Reduced motion is on. Showing the still reflection.",
  unavailable: "Live reflections are unavailable. Showing the still reflection.",
  paused: "Motion paused. Showing the still reflection.",
  starting: "Preparing the moving reflection.",
  running: "Adjust the light across the Halo Candleholder.",
  pause: "Pause motion", resume: "Resume motion", quantity: "Quantity", remove: "Remove",
  unitNames: { piece: ["piece", "pieces"], set: ["set", "sets"] },
  quantityLabel: units => "Quantity (" + units[1] + ")",
  unitLabel: units => "Indicative price per " + units[0],
  brand: "FORME Objects", title: "Inquiry summary",
  line: "Line total", total: "Indicative product total",
  limit: "Enter a whole number from 1 to 99.",
  lineLimit: "The list already includes this finish. Keep each line at 99 or fewer.",
  edit: "Enter a quantity from 1 to 99 on each line before downloading.",
  added: (name, finish, units) => `Added ${name}, ${finish} (${units}).`,
  removed: (name, finish) => `Removed ${name}, ${finish}.`,
  complete: "Inquiry summary generated. Your browser handles the download.",
  localOnly: "Concept selection only. Prices are illustrative and exclude delivery. No inquiry or order has been sent.",
} : {
  still: "顯示靜態反光。",
  reduced: "已依系統偏好減少動態，顯示靜態反光。",
  unavailable: "目前無法即時呈現反光，顯示靜態反光。",
  paused: "動態已暫停，顯示靜態反光。",
  starting: "正在準備動態反光。",
  running: "調整光線，觀察折光燭台的反光。",
  pause: "暫停動態", resume: "繼續動態", quantity: "數量", remove: "移除",
  unitNames: { piece: ["件", "件"], set: ["組", "組"] },
  quantityLabel: units => "數量（" + units[0] + "）",
  unitLabel: units => "每" + units[0] + "示意價",
  brand: "FORME 物形", title: "詢問摘要",
  line: "小計", total: "商品示意合計",
  limit: "數量須為 1 至 99 的整數。",
  lineLimit: "清單已有此表面，每列數量上限為 99。",
  edit: "請將每列數量改為 1 至 99 後再下載。",
  added: (name, finish, units) => `已加入 ${units} ${name}（${finish}）。`,
  removed: (name, finish) => `已移除${name}（${finish}）。`,
  complete: "已產生詢問摘要，請查看瀏覽器的下載項目。",
  localOnly: "本摘要為概念選品，售價為示意金額且未含運費，尚未送出詢問或訂單。",
};

const find = selector => document.querySelector(selector);
const money = amount => "NT$" + amount.toLocaleString("en-US");
const countLabel = (count, units) => count + " " + units[count === 1 ? 0 : 1];
const catalog = new Map([...document.querySelectorAll("[data-product]")].map(card => {
  const read = selector => card.querySelector(selector).textContent;
  return [card.dataset.product, {
    name: read("[data-name]"),
    description: read("[data-description]"),
    material: read("[data-material]"),
    size: read("[data-size]"),
    use: read("[data-use]"),
    soldAsSet: card.dataset.unitKind === "set",
    units: copy.unitNames[card.dataset.unitKind ?? "piece"],
    alt: card.querySelector("[data-card-photo]").dataset.photoAlt,
    prices: { polished: Number(card.dataset.polished), satin: Number(card.dataset.satin) },
  }];
}));

const configuration = find("#configure");
const configTitle = find("#config-title");
const picker = find("[data-picker]");
const productSelect = find("#product");
const detailImage = find("[data-detail-image]");
const quantity = find("#quantity");
const addFeedback = find("#add-feedback");
const viewList = find("[data-view-list]");
const inquiryTitle = find("#inquiry-title");
const items = find("[data-items]");
const empty = find("[data-empty]");
const count = find("[data-count]");
const total = find("[data-total]");
const download = find("[data-download]");
const inquiryFeedback = find("#inquiry-feedback");
const back = find("[data-return]");
const lines = new Map();

const stage = find("[data-stage]");
const canvas = stage.querySelector("canvas");
const heroImage = find("[data-hero-image]");
const heroCaption = find("[data-hero-caption]");
const heroAlt = heroImage.alt;
const angle = find("#object-angle");
const angleOutput = find("output");
const pause = find("[data-pause]");
const status = find("[data-motion-status]");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hasObservers = "IntersectionObserver" in window && "ResizeObserver" in window;
const canComposite = CSS.supports("width", "1cqh") && CSS.supports("mask-image", "url('')");
let settings = { finish: "polished", angle: angle.valueAsNumber };
let paused = false;
let shader;
const motion = createMotion({
  supported: Boolean(navigator.gpu) && hasObservers && canComposite,
  initialSettings: settings,
  async initialize(options) {
    shader = await import("./shader.js");
    if (options.signal.aborted) return null;
    return shader.initializeLiquid(canvas, options);
  },
  applySettings(renderer, next) {
    shader.applyLiquid(renderer, next);
  },
  renderState(phase) {
    stage.dataset.motion = phase;
    status.textContent = copy[phase];
    const unavailable = phase === "reduced" || phase === "unavailable";
    pause.disabled = unavailable;
    angle.disabled = unavailable;
  },
});

function updateProduct() {
  const finish = picker.elements.finish.value;
  const finishInput = picker.querySelector("[name=finish]:checked");
  const finishName = finishInput.nextElementSibling.textContent;
  const object = productSelect.value;
  const product = catalog.get(object);
  const photo = `${import.meta.env.BASE_URL}media/liquid-forme-${object}-${finish}.webp`;

  detailImage.alt = `${product.alt} · ${finishName}`;
  detailImage.src = photo;
  configTitle.textContent = product.name;
  find("[data-caption]").textContent = `${product.name} · ${finishName}`;
  find("[data-object-note]").textContent = product.description;
  find("[data-detail-material]").textContent = product.material;
  find("[data-detail-size]").textContent = product.size;
  find("[data-detail-use]").textContent = product.use;
  find("[data-unit]").textContent = money(product.prices[finish]);
  find("[data-unit-label]").textContent = copy.unitLabel(product.units);
  find("[data-quantity-label]").textContent = copy.quantityLabel(product.units);
  find("[data-finish-note]").textContent = finishInput.dataset.note;
  addFeedback.textContent = "";
  quantity.removeAttribute("aria-invalid");
  if (settings.finish !== finish) updateHero(finish, finishName);
}

function updateHero(finish, finishName) {
  const photo = finish === "satin" ? "hero-satin" : "hero";
  const path = import.meta.env.BASE_URL + "media/liquid-forme-" + photo;
  settings = { ...settings, finish };
  stage.dataset.finish = finish;
  heroImage.srcset = path + "-small.webp 900w, " + path + ".webp 1536w";
  heroImage.src = path + ".webp";
  heroImage.alt = heroAlt + " · " + finishName;
  heroCaption.textContent = heroCaption.dataset.heroName + " · " + finishName;
  motion.setSettings(settings);
}

function updateSummary() {
  let units = 0;
  let amount = 0;
  let invalid = false;
  for (const line of lines.values()) {
    units += line.count;
    amount += line.count * line.unit;
    invalid ||= !line.input.validity.valid;
  }
  empty.hidden = lines.size > 0;
  count.textContent = units;
  total.textContent = invalid ? "—" : money(amount);
  download.disabled = !lines.size || invalid;
  inquiryFeedback.textContent = invalid ? copy.edit : "";
  return amount;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setLineCount(line, value) {
  line.count = value;
  line.input.value = value;
  line.input.removeAttribute("aria-invalid");
  line.subtotal.textContent = money(line.unit * value);
}

function addLine(key, product, finish, unit, initialCount) {
  const node = element("li", undefined, "inquiry-item");
  const label = element("div");
  label.append(element("h3", product.name), element("p", `${finish} · ${copy.unitLabel(product.units)} ${money(unit)}`));
  if (product.soldAsSet) label.append(element("p", product.use));
  const actions = element("div", undefined, "item-actions");
  const quantityLabel = element("label", copy.quantityLabel(product.units));
  const input = element("input", undefined, "quantity");
  input.type = "number";
  input.min = "1";
  input.max = "99";
  input.step = "1";
  input.required = true;
  input.setAttribute("aria-label", `${copy.quantityLabel(product.units)} · ${product.name} · ${finish}`);
  input.setAttribute("aria-describedby", "inquiry-feedback");
  quantityLabel.append(input);
  const subtotal = element("strong");
  const remove = element("button", copy.remove, "remove-item");
  remove.type = "button";
  remove.setAttribute("aria-label", `${copy.remove} · ${product.name} · ${finish}`);
  actions.append(quantityLabel, subtotal, remove);
  node.append(label, actions);
  const line = { product, finish, unit, input, subtotal };
  setLineCount(line, initialCount);
  input.addEventListener("input", () => {
    if (input.validity.valid) {
      line.count = input.valueAsNumber;
      input.removeAttribute("aria-invalid");
      subtotal.textContent = money(line.unit * line.count);
    } else {
      input.setAttribute("aria-invalid", "true");
      subtotal.textContent = "—";
    }
    updateSummary();
  });
  remove.addEventListener("click", () => {
    const next = node.nextElementSibling || node.previousElementSibling;
    lines.delete(key);
    node.remove();
    updateSummary();
    if (!inquiryFeedback.textContent) inquiryFeedback.textContent = copy.removed(product.name, finish);
    (next?.querySelector("button") || back).focus();
    if (!lines.size) {
      viewList.hidden = true;
      addFeedback.textContent = "";
    }
  });
  items.append(node);
  lines.set(key, line);
}

picker.addEventListener("change", event => {
  if (event.target === productSelect || event.target.name === "finish") updateProduct();
});
quantity.addEventListener("input", () => {
  addFeedback.textContent = "";
  quantity.removeAttribute("aria-invalid");
});
picker.addEventListener("submit", event => {
  event.preventDefault();
  if (!quantity.validity.valid) {
    addFeedback.textContent = copy.limit;
    quantity.setAttribute("aria-invalid", "true");
    quantity.focus();
    return;
  }
  const object = productSelect.value;
  const { finish } = settings;
  const product = catalog.get(object);
  const finishName = picker.querySelector("[name=finish]:checked + span").textContent;
  const units = quantity.valueAsNumber;
  const key = `${object}-${finish}`;
  const previous = lines.get(key);
  const nextCount = (previous?.count ?? 0) + units;
  if (previous && !previous.input.validity.valid) {
    addFeedback.textContent = copy.edit;
    previous.input.focus();
    return;
  }
  if (nextCount > 99) {
    addFeedback.textContent = copy.lineLimit;
    quantity.focus();
    return;
  }
  if (previous) setLineCount(previous, nextCount);
  else addLine(key, product, finishName, product.prices[finish], pieces);
  updateSummary();
  addFeedback.textContent = copy.added(product.name, finishName, countLabel(units, product.units));
  viewList.hidden = false;
});

for (const link of document.querySelectorAll("[data-select-product]")) {
  link.hidden = false;
  link.addEventListener("click", event => {
    event.preventDefault();
    productSelect.value = link.dataset.selectProduct;
    quantity.value = 1;
    updateProduct();
    configTitle.focus({ preventScroll: true });
    configuration.scrollIntoView();
  });
}
viewList.addEventListener("click", event => {
  event.preventDefault();
  inquiryTitle.focus({ preventScroll: true });
  inquiryTitle.scrollIntoView();
});
download.addEventListener("click", () => {
  const amount = updateSummary();
  if (download.disabled) return;
  const summary = [copy.brand, copy.title, ""];
  for (const { product, finish, unit, count } of lines.values()) {
    summary.push(`${product.name} · ${finish}`, `${product.material} · ${product.size}`, product.use);
    summary.push(`${copy.quantity} ${countLabel(count, product.units)} · ${copy.unitLabel(product.units)} ${money(unit)} · ${copy.line} ${money(count * unit)}`, "");
  }
  summary.push(`${copy.total} ${money(amount)}`, "", copy.localOnly, "");
  const url = URL.createObjectURL(new Blob([summary.join("\n")], { type: "text/plain;charset=utf-8" }));
  const link = element("a");
  link.href = url;
  link.download = "forme-inquiry.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  inquiryFeedback.textContent = copy.complete;
});

angle.addEventListener("input", () => {
  settings = { ...settings, angle: angle.valueAsNumber };
  angleOutput.value = `${settings.angle}°`;
  motion.setSettings(settings);
});
pause.addEventListener("click", () => {
  paused = !paused;
  pause.textContent = copy[paused ? "resume" : "pause"];
  motion.update({ paused });
});

configuration.hidden = false;
find("[data-inquiry]").hidden = false;
find("[data-motion-tools]").hidden = false;
count.hidden = false;
updateProduct();
if (hasObservers) {
  observeMotion(stage, motion, preference);
} else {
  motion.update({ active: true, reduced: preference.matches });
  preference.addEventListener("change", () => motion.update({ reduced: preference.matches }));
}
