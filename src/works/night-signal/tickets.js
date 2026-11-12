const copy = {
  en: {
    passError: "Choose a pass type to continue.",
    quantityError: "Enter a whole number from 1 to 6.",
    summaryLine: (name, quantity, total) => `${name} × ${quantity} · Estimated total ${total}`,
    unitLine: (unit) => `Unit price ${unit}`,
    downloaded: "Your itinerary download is ready.",
    downloadError: "The download could not start. Try again or copy the summary on this page.",
  },
  "zh-Hant": {
    passError: "請先選擇一種票券。",
    quantityError: "請輸入 1 至 6 的整數。",
    summaryLine: (name, quantity, total) => `${name} × ${quantity} 張 · 預估總額 ${total}`,
    unitLine: (unit) => `單價 ${unit}`,
    downloaded: "行程摘要已準備下載。",
    downloadError: "無法開始下載。請再試一次，或複製本頁的摘要。",
  },
};

const textOf = (element) => element.textContent.trim();
const formatPrice = (value) => `NT$${new Intl.NumberFormat("en-TW").format(value)}`;

function renderSets(list, sets) {
  list.replaceChildren(...sets.map((set) => {
    const item = document.createElement("li");
    item.textContent = set;
    return item;
  }));
}

export function setupTickets(english) {
  const labels = copy[english ? "en" : "zh-Hant"];
  const form = document.querySelector("[data-ticket-form]");
  const options = [...form.querySelectorAll("[data-pass-option]")].map((option) => ({
    radio: option.querySelector("input"),
    name: textOf(option.querySelector("[data-pass-name]")),
    price: Number(option.dataset.price),
  }));
  const set = form.elements.set;
  const quantity = form.elements.quantity;
  const setField = form.querySelector("[data-booking-set]");
  const passError = form.querySelector("[data-error=pass]");
  const quantityError = form.querySelector("[data-error=quantity]");
  const empty = form.querySelector("[data-empty]");
  const values = form.querySelector("[data-ticket-values]");
  const passDisplay = form.querySelector("[data-pass-display]");
  const unit = form.querySelector("[data-unit]");
  const quantityDisplay = form.querySelector("[data-quantity-display]");
  const total = form.querySelector("[data-total]");
  const sets = form.querySelector("[data-sets]");
  const complete = document.querySelector("[data-complete]");
  const completeHeading = complete.querySelector("h3");
  const completeSummary = complete.querySelector("[data-complete-summary]");
  const completeSets = complete.querySelector("[data-complete-sets]");
  const download = complete.querySelector("[data-download]");
  const downloadStatus = complete.querySelector("[data-download-status]");
  let explicitSet = false;
  let downloadText = "";

  const selectedPass = () => options.find(({ radio }) => radio.checked);
  const selectedSets = (pass) => (pass.radio.value === "single"
    ? [...set.selectedOptions]
    : [...set.options]).map(textOf);

  function render() {
    const pass = selectedPass();
    setField.hidden = pass?.radio.value !== "single";
    set.disabled = setField.hidden;
    empty.hidden = Boolean(pass);
    values.hidden = !pass;
    if (!pass) return;
    const valid = quantity.validity.valid;
    passDisplay.textContent = pass.name;
    unit.textContent = formatPrice(pass.price);
    quantityDisplay.textContent = valid ? quantity.valueAsNumber : "—";
    total.textContent = valid ? formatPrice(pass.price * quantity.valueAsNumber) : "—";
    renderSets(sets, selectedSets(pass));
  }

  function markPassError(visible) {
    passError.hidden = !visible;
    passError.textContent = visible ? labels.passError : "";
    for (const { radio } of options) {
      radio.setAttribute("aria-describedby", `${radio.id}-description${visible ? " pass-error" : ""}`);
      if (visible) radio.setAttribute("aria-invalid", "true");
      else radio.removeAttribute("aria-invalid");
    }
  }

  function markQuantityError(visible) {
    quantityError.hidden = !visible;
    quantityError.textContent = visible ? labels.quantityError : "";
    quantity.setAttribute("aria-describedby", visible ? "quantity-hint quantity-error" : "quantity-hint");
    if (visible) quantity.setAttribute("aria-invalid", "true");
    else quantity.removeAttribute("aria-invalid");
  }

  form.addEventListener("change", (event) => {
    if (event.target.name === "pass") markPassError(false);
    if (event.target === set) explicitSet = true;
    render();
  });
  quantity.addEventListener("input", () => {
    if (!quantityError.hidden && quantity.validity.valid) markQuantityError(false);
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const pass = selectedPass();
    const validQuantity = quantity.validity.valid;
    markPassError(!pass);
    markQuantityError(!validQuantity);
    if (!pass) {
      options[0].radio.focus();
      return;
    }
    if (!validQuantity) {
      quantity.focus();
      return;
    }

    const count = quantity.valueAsNumber;
    const summary = labels.summaryLine(pass.name, count, formatPrice(pass.price * count));
    const included = selectedSets(pass);
    completeSummary.textContent = summary;
    renderSets(completeSets, included);
    downloadStatus.textContent = "";
    downloadText = [
      english ? "NIGHT SIGNAL" : "夜航訊號 NIGHT SIGNAL",
      textOf(completeHeading),
      textOf(complete.querySelector(".complete-event")),
      textOf(document.querySelector("[data-event-stage]")),
      "",
      summary,
      labels.unitLine(formatPrice(pass.price)),
      ...included.map((slot) => `• ${slot}`),
      "",
      textOf(complete.querySelector("[data-complete-note]")),
      "",
    ].join("\r\n");

    form.hidden = true;
    complete.hidden = false;
    completeHeading.focus();
  });

  complete.querySelector("[data-edit]").addEventListener("click", () => {
    complete.hidden = true;
    form.hidden = false;
    selectedPass().radio.focus();
  });

  download.addEventListener("click", () => {
    try {
      const blob = new Blob(["\uFEFF", downloadText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `night-signal-2026-11-21-${english ? "en" : "zh-Hant"}.txt`;
        document.body.append(link);
        try { link.click(); } finally { link.remove(); }
        downloadStatus.textContent = labels.downloaded;
      } finally {
        // Keep the URL alive until the browser has started consuming the file.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      downloadStatus.textContent = labels.downloadError;
    }
  });

  for (const { radio } of options) radio.disabled = false;
  form.querySelector("[data-booking-controls]").hidden = false;
  form.querySelector("[data-receipt]").hidden = false;
  render();

  return {
    suggestSet(id) {
      if (!explicitSet) {
        set.value = id;
        render();
      }
    },
  };
}
