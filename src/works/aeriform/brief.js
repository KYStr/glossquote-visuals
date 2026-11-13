export function initializeBrief(chooseForm) {
  const form = document.querySelector("[data-brief-form]");
  const review = document.querySelector("[data-review]");
  const heading = review.querySelector("h3");
  const status = review.querySelector("[data-download-status]");
  const service = form.elements.service;
  const outputs = [...form.querySelectorAll("[name=deliverable]")];
  const outputError = form.querySelector("[data-output-error]");
  const english = document.documentElement.lang === "en";
  const copy = english ? {
    filename: "aeriform-project-brief-en.txt",
    title: "AERIFORM — Project brief",
    footer: "Prepared locally. This brief has not been sent to the studio.",
    scope: {
      identity: "NT$90,000–160,000 · 4–6 weeks",
      motion: "NT$120,000–220,000 · 5–8 weeks",
      digital: "NT$180,000–340,000 · 7–10 weeks",
    },
  } : {
    filename: "aeriform-project-brief-zh-Hant.txt",
    title: "AERIFORM 空型動態設計｜專案需求摘要",
    footer: "本摘要在裝置上產生，尚未聯絡工作室。",
    scope: {
      identity: "NT$90,000–160,000・4–6 週",
      motion: "NT$120,000–220,000・5–8 週",
      digital: "NT$180,000–340,000・7–10 週",
    },
  };
  let current;

  function showOutputs() {
    for (const output of outputs) {
      const relevant = output.dataset.service === service.value;
      output.disabled = !relevant;
      output.closest("label").hidden = !relevant;
    }
    outputError.hidden = true;
    for (const output of outputs) output.removeAttribute("aria-invalid");
  }

  function edit(focus = true) {
    current = undefined;
    review.hidden = true;
    status.hidden = true;
    form.hidden = false;
    if (focus) service.focus();
  }

  service.addEventListener("change", showOutputs);
  for (const output of outputs) output.addEventListener("change", showOutputs);
  for (const link of document.querySelectorAll("[data-brief-service]")) {
    link.addEventListener("click", () => {
      edit(false);
      service.value = link.dataset.briefService;
      showOutputs();
      chooseForm(service.value);
      requestAnimationFrame(() => service.focus({ preventScroll: true }));
    });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = outputs.filter((output) => !output.disabled && output.checked);
    if (!selected.length) {
      outputError.hidden = false;
      const first = outputs.find((output) => !output.disabled);
      first.setAttribute("aria-invalid", "true");
      first.focus();
      return;
    }
    const fields = [service, form.elements.stage, form.elements.timing];
    const values = [
      ...fields.map((field) => field.selectedOptions[0].textContent),
      selected.map((output) => output.nextElementSibling.textContent).join(english ? ", " : "、"),
      copy.scope[service.value],
    ];
    const terms = [...review.querySelectorAll("dt")];
    [...review.querySelectorAll("dd")].forEach((definition, index) => {
      definition.textContent = values[index];
    });
    current = [copy.title, "", ...terms.map((term, index) => `${term.textContent}\t${values[index]}`), "", copy.footer, ""].join("\n");
    form.hidden = true;
    review.hidden = false;
    heading.focus();
  });
  review.querySelector("[data-edit]").addEventListener("click", () => edit());
  review.querySelector("[data-download]").addEventListener("click", () => {
    if (!current) return;
    const url = URL.createObjectURL(new Blob([current], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = copy.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.hidden = false;
  });
  showOutputs();
  form.hidden = false;
}
