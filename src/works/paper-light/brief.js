export function initializeBrief() {
  const section = document.querySelector("[data-quote]");
  const form = section.querySelector("[data-brief-form]");
  const { collection, stock, finish, quantity, purpose } = form.elements;
  const minimum = form.querySelector("[data-quantity-min]");
  const summary = section.querySelector("[data-brief-summary]");
  const rows = [...summary.querySelectorAll("[data-value]")];
  const message = summary.querySelector("[data-complete]");
  const completion = summary.querySelector("[data-complete-copy]").content.textContent;
  const title = section.querySelector("#quote-title");
  const numberFormat = new Intl.NumberFormat(document.documentElement.lang);
  let downloadText = "";

  const selected = (input) => input.selectedOptions[0];

  function refreshQuantity(prefill = false) {
    const previousMinimum = Number(quantity.min);
    const nextMinimum = Number(selected(collection).dataset.min);
    if (quantity.valueAsNumber === previousMinimum || (prefill && !(quantity.valueAsNumber >= nextMinimum))) {
      quantity.value = nextMinimum;
    }
    quantity.min = nextMinimum;
    minimum.textContent = numberFormat.format(nextMinimum);
  }

  function showError(field, invalid) {
    const error = form.querySelector("#" + field.id + "-error");
    const hint = field.id + "-hint";
    error.hidden = !invalid;
    if (invalid) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    field.setAttribute("aria-describedby", invalid ? hint + " " + error.id : hint);
  }

  function edit(focus = collection) {
    summary.hidden = true;
    message.textContent = "";
    form.hidden = false;
    focus.focus();
  }

  collection.addEventListener("change", () => {
    refreshQuantity();
    if (quantity.hasAttribute("aria-invalid")) showError(quantity, !quantity.validity.valid);
  });
  quantity.addEventListener("input", () => {
    if (quantity.validity.valid) showError(quantity, false);
  });
  purpose.addEventListener("input", () => {
    if (purpose.value.trim()) showError(purpose, false);
  });

  document.querySelectorAll("[data-collection]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      collection.value = link.dataset.collection;
      stock.value = selected(collection).dataset.stock;
      finish.value = selected(collection).dataset.finish;
      refreshQuantity(true);
      showError(quantity, false);
      edit(title);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const count = quantity.valueAsNumber;
    const use = purpose.value.trim();
    const quantityInvalid = !quantity.validity.valid;
    showError(quantity, quantityInvalid);
    showError(purpose, !use);
    if (quantityInvalid || !use) {
      (quantityInvalid ? quantity : purpose).focus();
      return;
    }

    const lead = [selected(collection).dataset.lead, section.dataset.approval];
    if (count > 200) lead.push(section.dataset.extraLead);
    if (finish.value === "both") lead.push(section.dataset.bothLead);

    const values = {
      collection: selected(collection).textContent,
      stock: selected(stock).textContent,
      finish: selected(finish).textContent,
      quantity: numberFormat.format(count),
      purpose: use,
      lead: lead.join(" "),
    };

    const lines = rows.map((row) => {
      row.textContent = values[row.dataset.value];
      return row.previousElementSibling.textContent + " — " + row.textContent;
    });
    downloadText = [section.dataset.documentTitle, "", ...lines, "", completion, ""].join("\r\n");
    form.hidden = true;
    summary.hidden = false;
    summary.querySelector("h3").focus();
  });

  summary.querySelector("[data-edit]").addEventListener("click", () => edit());
  summary.querySelector("[data-download]").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF", downloadText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "paper-and-light-print-brief.txt";
    link.click();
    // Give the browser time to consume the URL before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent = completion;
  });

  refreshQuantity();
  form.hidden = false;
}
