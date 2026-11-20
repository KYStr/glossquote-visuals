export function initializePlanner() {
  const form = document.querySelector("[data-plan-form]");
  const route = form.elements.route;
  const group = form.elements.group;
  const preview = document.querySelector("[data-preview]");
  const heading = preview.querySelector("h3");
  const downloadStatus = document.querySelector("[data-download-status]");
  const tripFields = [...preview.querySelectorAll("[data-trip]")];
  const walks = new Map([...document.querySelectorAll("[data-route]")].map((card) => {
    const [distance, duration, terrain] = [...card.querySelectorAll("dd")].map((item) => item.textContent);
    return [card.dataset.route, {
      route: card.querySelector("h3").textContent,
      distance, duration, terrain,
      required: card.querySelector("[data-requirements]").textContent,
    }];
  }));
  const english = document.documentElement.lang === "en";
  const copy = english ? {
    empty: "None selected",
    saved: "Your download file is ready.",
    note: "Illustrative walk. Check official tide times and local site access before leaving.",
  } : {
    empty: "未勾選",
    saved: "已產生下載檔。",
    note: "路線為示意。出發前請查官方潮汐與現場開放資訊。",
  };
  let trip;

  function updateWalk() {
    const { distance, duration, terrain, required } = walks.get(route.value);
    form.querySelector("[data-walking]").textContent = [distance, duration, terrain].join(" · ");
    form.querySelector("[data-needed]").textContent = required;
  }

  function showForm() {
    trip = undefined;
    preview.hidden = true;
    form.hidden = false;
    downloadStatus.textContent = "";
  }

  route.addEventListener("change", updateWalk);
  for (const link of document.querySelectorAll("[data-pick]")) {
    link.addEventListener("click", () => {
      showForm();
      route.value = link.dataset.pick;
      updateWalk();
      route.focus({ preventScroll: true });
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const selected = [...form.querySelectorAll("input[name=gear]:checked")]
      .map((input) => input.labels[0].querySelector("span").textContent);
    trip = {
      ...walks.get(route.value),
      group: String(group.valueAsNumber),
      extras: selected.length ? selected.join(english ? ", " : "、") : copy.empty,
    };
    for (const field of tripFields) field.textContent = trip[field.dataset.trip];
    form.hidden = true;
    preview.hidden = false;
    heading.focus();
  });

  preview.querySelector("[data-edit]").addEventListener("click", () => {
    showForm();
    route.focus();
  });

  preview.querySelector("[data-download]").addEventListener("click", () => {
    if (!trip) return;
    const separator = english ? ": " : "：";
    const lines = tripFields.map((field) => field.previousElementSibling.textContent + separator + trip[field.dataset.trip]);
    const text = ["TIDE TABLE — " + heading.textContent, "", ...lines, "", copy.note, ""].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tide-table-" + document.documentElement.lang + ".txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    downloadStatus.textContent = copy.saved;
  });

  updateWalk();
  showForm();
  document.querySelector("[data-basic]").hidden = true;
}
