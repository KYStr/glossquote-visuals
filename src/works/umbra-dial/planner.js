const find = selector => document.querySelector(selector);
const read = selector => find(selector).textContent.trim();
const en = document.documentElement.lang === "en";
const copy = en ? {
  title: "UMBRA DIAL | Venue proposal",
  minimum: "Enter a whole number of guests, at least 12.",
  maximum: max => `This dome can seat up to ${max} guests across three screenings.`,
  unconfirmed: "Confirm the clear floor, height and power requirements before building your proposal.",
  help: max => `12–${max} guests across up to three screenings.`,
  defaultHelp: "Choose a dome size to see its audience range.",
  summary: (name, guests, age, mins) => `${name} · ${guests} guests · ${age} · ${mins} min`,
  screening: (number, guests) => `Screening ${number} · ${guests} guests`,
  estimate: price => `Sample total: NT$ ${price}`,
  setup: (start, end) => `Venue access ${start}–${end} including setup and strike.`,
  downloaded: "Proposal generated for download.",
} : {
  title: "食刻 UMBRA DIAL｜場館提案",
  minimum: "請輸入至少 12 人的整數人數。",
  maximum: max => `此穹頂最多安排三場，合計可容納 ${max} 人。`,
  unconfirmed: "請先確認場地淨空、高度與電源符合規格，再試排放映。",
  help: max => `12 至 ${max} 人，最多安排三場。`,
  defaultHelp: "選擇穹頂規格後，即可查看人數範圍。",
  summary: (name, guests, age, mins) => `${name}・共 ${guests} 人・${age}・${mins} 分鐘`,
  screening: (number, guests) => `第 ${number} 場・${guests} 人`,
  estimate: price => `示意總額：NT$ ${price}`,
  setup: (start, end) => `場地使用時間 ${start}–${end}，含架設與撤場。`,
  downloaded: "已產生可下載的場館提案。",
};

const form = find("[data-planner]");
const { film, audience, venue } = form.elements;
const result = find("[data-result]");
const feedback = find("[data-feedback]");
const downloadStatus = find("[data-download-status]");
const limitHelp = find("#capacity");
const screenings = find("[data-screenings]");
const maxScreenings = 3;
const minimum = 12;
const venues = {
  compact: { capacity: 24 },
  hall: { capacity: 36 },
};
const programs = Object.fromEntries([...document.querySelectorAll("[data-program]")].map(ticket => [
  ticket.dataset.program,
  {
    name: ticket.querySelector("[data-name]").textContent,
    age: ticket.querySelector("[data-age]").textContent,
    minutes: Number(ticket.dataset.minutes),
    price: Number(ticket.dataset.price),
  },
]));
let proposal;

function clearError() {
  feedback.hidden = true;
  feedback.textContent = "";
  audience.removeAttribute("aria-invalid");
  audience.setAttribute("aria-describedby", "capacity");
  venue.removeAttribute("aria-invalid");
  venue.removeAttribute("aria-describedby");
}

function updateLimit() {
  const capacity = venues[venue.value]?.capacity;
  limitHelp.textContent = capacity ? copy.help(capacity * maxScreenings) : copy.defaultHelp;
  audience.max = String((capacity ?? venues.hall.capacity) * maxScreenings);
}

function reject(control, message) {
  feedback.textContent = message;
  feedback.hidden = false;
  control.setAttribute("aria-invalid", "true");
  control.setAttribute("aria-describedby", control === audience ? "capacity plan-error" : "plan-error");
  control.focus();
}

function clock(minutes) {
  const two = number => String(number).padStart(2, "0");
  return `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;
}

function makeProposal(program, guests, venueKey) {
  const count = Math.ceil(guests / venues[venueKey].capacity);
  const remainder = guests % count;
  const first = 9 * 60 + 30;
  const gap = 15;
  const slots = Array.from({ length: count }, (_, index) => {
    const begin = first + index * (program.minutes + gap);
    const headcount = Math.floor(guests / count) + Number(index < remainder);
    return { label: copy.screening(index + 1, headcount), time: `${clock(begin)}–${clock(begin + program.minutes)}` };
  });
  const lastEnd = first + count * program.minutes + (count - 1) * gap;
  const spec = find(`[data-spec="${venueKey}"]`);
  const space = `${spec.querySelector(".kicker").textContent} · ${spec.querySelector("[data-requirement]").textContent}`;
  return {
    slots,
    summary: copy.summary(program.name, guests, program.age, program.minutes),
    space: `${space} ${copy.setup(clock(first - 60), clock(lastEnd + 45))}`,
    estimate: copy.estimate((count * program.price).toLocaleString(en ? "en-US" : "zh-TW")),
  };
}

function showProposal(next) {
  find("[data-summary]").textContent = next.summary;
  find("[data-space]").textContent = next.space;
  find("[data-estimate]").textContent = next.estimate;
  screenings.replaceChildren(...next.slots.map(({ label, time }) => {
    const row = document.createElement("li");
    const labelNode = document.createElement("span");
    const timeNode = document.createElement("strong");
    labelNode.textContent = label;
    timeNode.textContent = time;
    row.append(labelNode, timeNode);
    return row;
  }));
  form.hidden = true;
  result.hidden = false;
  result.focus();
}

function edit() {
  proposal = undefined;
  downloadStatus.textContent = "";
  result.hidden = true;
  form.hidden = false;
  clearError();
  film.focus();
}

feedback.id = "plan-error";
form.addEventListener("input", () => {
  clearError();
  updateLimit();
});
form.addEventListener("submit", event => {
  event.preventDefault();
  clearError();
  const count = audience.valueAsNumber;
  const capacity = venues[venue.value]?.capacity;
  if (!Number.isInteger(count) || count < minimum) {
    reject(audience, copy.minimum);
  } else if (!capacity) {
    reject(venue, copy.unconfirmed);
  } else if (count > capacity * maxScreenings) {
    reject(audience, copy.maximum(capacity * maxScreenings));
  } else {
    proposal = makeProposal(programs[film.value], count, venue.value);
    showProposal(proposal);
  }
});

for (const link of document.querySelectorAll("[data-choose]")) {
  link.addEventListener("click", event => {
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    film.value = link.dataset.choose;
    edit();
    find("#planner").scrollIntoView();
  });
}
find("[data-edit]").addEventListener("click", edit);
find("[data-download]").addEventListener("click", () => {
  if (!proposal) return;
  const text = [
    copy.title, read("[data-concept]"), "",
    proposal.summary, ...proposal.slots.map(({ label, time }) => `${label} | ${time}`), "",
    proposal.space, read("[data-equipment]"), proposal.estimate, "",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `umbra-dial-proposal-${document.documentElement.lang}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  downloadStatus.textContent = copy.downloaded;
});
updateLimit();
form.hidden = false;
