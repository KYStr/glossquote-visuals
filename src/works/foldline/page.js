import { observeMotion, createMotion } from "../../shared/motion.js";
import { inspectKit, keys, limit, models } from "./kit.mjs";

const lang = document.documentElement.lang;
const zh = lang === "zh-Hant";
const copy = zh ? {
  title: "摺徑 FOLDLINE｜裝備與攜行清單",
  labels: ["船型", "同行人數", "規劃路線", "總載重", "攜行尺寸（長 × 寬 × 高）", "船身重量", "展開尺寸", "示意總價"],
  modes: ["攜行", "半展", "成船"],
  images: ["橙紅色板件摺成有束帶及提把的攜行箱。", "橙紅色船殼半展，露出側舷鉸線與座艙。", "兩端甲板扣合，橙紅色船殼完全展開。"],
  running: "播放船身動態。", paused: "目前動態已暫停。", still: "目前顯示靜態船身。", unavailable: "目前顯示靜態船身，仍可切換三種船型狀態。",
  pause: "暫停動態", play: "繼續動態",
  seats: "船型座位與同行人數不符。請為一人選單人艇，兩人選雙人艇。",
  coast: "型錄只有湖泊與內陸水道的規劃選項。請修改路線。",
  load: "請填入至少 1 kg 的總載重，最多一位小數。",
  rating: rated => `總載重超過此船型的 ${rated} kg 額定值。請調整載重或回改選型。`,
  quantity: (name, max) => `${name}可選 0 至 ${max} 個，請輸入整數。`,
  ready: "選型與數量符合型錄條件。可下載清單。",
  downloaded: "清單已產生，可離線保存。",
} : {
  title: "FOLDLINE | Equipment and carry list",
  labels: ["Kayak", "Party size", "Planned route", "Total payload", "Packed size (L × W × H)", "Hull weight", "Open size", "Illustrative total"],
  modes: ["Packed", "Half open", "Assembled"],
  images: ["Orange panels folded into a case with straps and a handle.", "An orange hull half open, with the side hinges and cockpit exposed.", "An assembled orange hull, with both end panels locked in place."],
  running: "Hull animation playing.", paused: "Hull animation paused.", still: "Showing a still view of the hull.", unavailable: "Showing still views. You can select any of the three hull states.",
  pause: "Pause motion", play: "Resume motion",
  seats: "The kayak’s seating does not match your party. Choose Solo for one paddler or Tandem for two.",
  coast: "This catalogue covers lake and inland waterway planning. Change your route to continue.",
  load: "Enter a total payload of at least 1 kg, with up to one decimal place.",
  rating: rated => `The payload exceeds this kayak’s ${rated} kg rating. Adjust the payload or your selection.`,
  quantity: (name, max) => `Enter a whole number from 0 to ${max} for ${name.toLowerCase()}.`,
  ready: "Your selections fit the catalogue limits. The list is ready to download.",
  downloaded: "Your list has been generated for offline use.",
};

const stage = document.querySelector("[data-stage]");
const poster = stage.querySelector("[data-poster]");
const posterImage = poster.querySelector("img");
const posterSource = poster.querySelector("source");
const imageBase = new URL(".", posterImage.src);
const radios = document.querySelector("[data-instrument]");
const pauseButton = document.querySelector("[data-pause]");
const motionStatus = document.querySelector("[data-motion-status]");
let paused = false;
let live = false;
const motion = createMotion({
  supported: Boolean(navigator.gpu),
  async initialize(options) {
    const { initializeFoldline } = await import("./gpu.js");
    if (options.signal.aborted) return null;
    return initializeFoldline(stage.querySelector("canvas"), {
      ...options,
      onError() {
        live = false;
        stage.removeAttribute("data-live");
        options.onError();
      },
    });
  },
  applySettings(renderer, settings) {
    renderer.set(settings);
  },
  initialSettings: { mode: null },
  renderState(phase) {
    stage.dataset.motion = phase;
    if (phase === "running") live = true;
    if (phase === "starting" || phase === "unavailable" || phase === "reduced") live = false;
    stage.toggleAttribute("data-live", live);
    pauseButton.hidden = !["running", "paused"].includes(phase);
    pauseButton.textContent = paused ? copy.play : copy.pause;
    pauseButton.setAttribute("aria-pressed", String(paused));
    motionStatus.textContent = copy[phase] ?? copy.still;
  },
});
const setMode = mode => {
  const name = ["pack", "half", "full"][mode];
  stage.dataset.material = String(mode);
  posterImage.alt = copy.images[mode];
  posterSource.srcset = new URL(`${name}-narrow.webp`, imageBase).href;
  posterImage.src = new URL(`${name}-wide.webp`, imageBase).href;
  motion.setSettings({ mode });
};
radios.addEventListener("input", event => {
  if (event.target.name === "fold-state") setMode(Number(event.target.value));
});
// Clicking the initially checked half-open state stops the opening sequence at
// that exact configuration, even though the radio's value hasn't changed.
radios.addEventListener("click", event => {
  if (event.target.name === "fold-state") {
    const mode = Number(event.target.value);
    if (mode === Number(stage.dataset.material)) setMode(mode);
  }
});
pauseButton.addEventListener("click", () => {
  paused = !paused;
  motion.update({ paused });
});
radios.hidden = false;
observeMotion(stage, motion, matchMedia("(prefers-reduced-motion: reduce)"));

const form = document.querySelector("[data-planner]");
const select = name => form.elements.namedItem(name);
const selectedText = name => select(name).selectedOptions[0].textContent;
const accessoryName = key => select(key).labels[0].querySelector("span").firstChild.textContent.trim();
const feedback = form.querySelector("[data-feedback]");
const summary = form.querySelector("[data-summary]");
const download = form.querySelector("[data-download]");
const notice = document.querySelector("[data-concept]").textContent;
const dollars = amount => "NT$" + amount.toLocaleString("en-US");
const [modelLabel, peopleLabel, routeLabel, loadLabel, packedLabel, weightLabel, openLabel, priceLabel] = copy.labels;

let exportRows;
function update() {
  const people = Number(select("people").value);
  const model = select("model").value;
  const hull = models[model];
  const load = select("load").valueAsNumber;
  select("load").max = hull.rated;
  const counts = Object.fromEntries(keys.map(key => {
    const input = select(key);
    input.max = limit(key, people);
    return [key, input.valueAsNumber];
  }));
  const kit = inspectKit({ model, people, route: select("route").value, load, counts });
  const showError = kit.field && (kit.code !== "load" || select("load").value !== "" || select("load").validity.badInput);
  for (const name of ["route", "model", "load", ...keys]) {
    const input = select(name);
    input.removeAttribute("aria-invalid");
    if (showError && name === kit.field) input.setAttribute("aria-invalid", "true");
  }
  if (kit.code === "rating") feedback.textContent = copy.rating(hull.rated);
  else if (kit.code === "quantity") feedback.textContent = copy.quantity(accessoryName(kit.field), limit(kit.field, people));
  else if (kit.code === "load" && !showError) feedback.textContent = zh ? "請先輸入總載重。" : "Enter your total payload.";
  else feedback.textContent = copy[kit.code] ?? copy.ready;
  feedback.toggleAttribute("data-error", Boolean(showError));
  download.disabled = Boolean(kit.field);
  exportRows = [
    ["model", modelLabel, selectedText("model")],
    ["people", peopleLabel, selectedText("people")],
    ["route", routeLabel, selectedText("route")],
    ["payload", loadLabel, `${Number.isFinite(load) ? load + " kg" : "—"} / ${hull.rated} kg`],
    ["packed", packedLabel, hull.packed],
    ["weight", weightLabel, hull.weight],
    ["open", openLabel, hull.open],
    ...keys.map(key => [key, accessoryName(key), Number.isFinite(counts[key]) ? String(counts[key]) : "—"]),
    ["price", priceLabel, kit.total === undefined ? "—" : dollars(kit.total)],
  ];
  const list = document.createElement("dl");
  for (const [key, label, value] of exportRows) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    dd.dataset.value = key;
    row.append(dt, dd);
    list.append(row);
  }
  summary.replaceChildren(list);
}
form.addEventListener("input", update);
for (const link of document.querySelectorAll("[data-preset]")) {
  link.addEventListener("click", () => {
    const model = link.dataset.preset;
    select("model").value = model;
    select("people").value = String(models[model].seats);
    update();
  });
}
form.addEventListener("submit", event => {
  event.preventDefault();
  update();
  if (download.disabled) return;
  const separator = zh ? "：" : ": ";
  const lines = exportRows.map(([, label, value]) => label + separator + value);
  const text = [copy.title, "", ...lines, "", notice, ""].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `foldline-kit-${lang}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = copy.downloaded;
});
form.hidden = false;
update();
