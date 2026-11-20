
const limit = 2;

const english = {
  title: "SELVEDGE | Sample sheet",
  notice: "Concept studio · offline sample selection for project review.",
  name: "Fabric",
  id: "Fabric ID",
  colour: "Colourway",
  use: "Use",
  care: "Care",
  quantity: "Quantity",
  count: "Fabrics",
  edit: "Edit colourway",
  remove: "Remove",
  cancel: "Cancel",
  save: "Save colourway",
  view: "View sample sheet",
  duplicate: "This fabric is already on the sheet. Select Edit colourway to change it.",
  full: "Two fabrics are on the sheet. Remove one before adding another.",
  added: "Added to the sample sheet.",
  changed: "Colourway saved.",
  removed: "Removed from the sample sheet.",
  downloaded: "Sample sheet downloaded.",
};

const chinese = {
  title: "布邊 SELVEDGE｜樣本單",
  notice: "概念打樣室・離線樣本單，供提案核對。",
  name: "布樣",
  id: "識別碼",
  colour: "色號",
  use: "用途",
  care: "保養",
  quantity: "數量",
  count: "款數",
  edit: "修改色號",
  remove: "移除",
  cancel: "取消",
  save: "儲存色號",
  view: "查看樣本單",
  duplicate: "這款布已在樣本單內。若要更換色號，請選擇「修改色號」。",
  full: "樣本單已有兩款布，請先移除一款再加入。",
  added: "已加入樣本單。",
  changed: "已儲存色號。",
  removed: "已從樣本單移除。",
  downloaded: "已下載樣本單。",
};

function makeButton(label, action, accessibleLabel = label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset[action] = "";
  button.textContent = label;
  button.setAttribute("aria-label", accessibleLabel);
  return button;
}

export function initializeSheet(useEnglish) {
  const copy = useEnglish ? english : chinese;
  const list = document.querySelector("[data-sheet-list]");
  const empty = document.querySelector("[data-empty]");
  const count = document.querySelector("[data-sheet-count]");
  const sheetMessage = document.querySelector("[data-sheet-message]");
  const download = document.querySelector("[data-export]");
  const heading = document.querySelector("#sample-title");
  const print = document.querySelector("[data-print]");
  const selected = new Map();
  let editing = null;

  function endEdit() {
    if (!editing) return;
    editing.add.textContent = editing.addLabel;
    editing.cancel.hidden = true;
    editing = null;
  }

  function render() {
    const rows = [];
    for (const { fabric, colour } of selected.values()) {
      const row = document.createElement("li");
      row.dataset.sheetRow = fabric.id;
      row.dataset.colourCode = colour.code;

      const title = document.createElement("strong");
      title.textContent = fabric.name;
      const detail = document.createElement("p");
      detail.textContent = `${fabric.id} / ${colour.label} / ${copy.quantity} 1`;

      const actions = document.createElement("div");
      actions.className = "row-actions";
      const edit = makeButton(copy.edit, "edit", `${copy.edit} · ${fabric.name}`);
      const remove = makeButton(copy.remove, "remove", `${copy.remove} · ${fabric.name}`);
      edit.addEventListener("click", () => {
        endEdit();
        editing = fabric;
        fabric.select.value = colour.code;
        fabric.add.textContent = copy.save;
        fabric.cancel.hidden = false;
        fabric.message.textContent = "";
        fabric.select.focus();
      });
      remove.addEventListener("click", () => {
        if (editing === fabric) endEdit();
        selected.delete(fabric.id);
        fabric.message.textContent = "";
        render();
        sheetMessage.textContent = copy.removed;
        (list.querySelector("[data-remove]") ?? heading).focus();
      });
      actions.append(edit, remove);
      row.append(title, detail, actions);
      rows.push(row);
    }

    list.replaceChildren(...rows);
    count.textContent = `${selected.size} / ${limit}`;
    empty.hidden = selected.size > 0;
    download.disabled = selected.size === 0;
    for (const link of document.querySelectorAll("[data-view-sheet]")) link.hidden = selected.size === 0;
  }

  function submit(fabric) {
    const { value: code, selectedOptions: [option] } = fabric.select;
    if (editing === fabric) {
      selected.set(fabric.id, { fabric, colour: { code, label: option.textContent } });
      endEdit();
      render();
      sheetMessage.textContent = copy.changed;
      list.querySelector(`[data-sheet-row="${fabric.id}"] [data-edit]`).focus();
      return;
    }
    if (selected.has(fabric.id)) {
      fabric.message.textContent = copy.duplicate;
      return;
    }
    if (selected.size === limit) {
      fabric.message.textContent = copy.full;
      return;
    }
    selected.set(fabric.id, { fabric, colour: { code, label: option.textContent } });
    render();
    sheetMessage.textContent = "";
    fabric.message.textContent = copy.added;
  }

  for (const card of document.querySelectorAll("[data-fabric]")) {
    const picker = card.querySelector("[data-picker]");
    const add = picker.querySelector("[data-add]");
    const message = picker.querySelector("[data-picker-message]");
    const cancel = makeButton(copy.cancel, "cancel");
    cancel.hidden = true;
    add.after(cancel);

    const view = document.createElement("a");
    view.href = "#sample-sheet";
    view.textContent = copy.view;
    view.dataset.viewSheet = "";
    view.hidden = true;
    message.after(view);

    const fabric = {
      id: card.dataset.id,
      name: card.querySelector("[data-name]").textContent,
      use: card.querySelector("[data-use]").textContent,
      care: card.querySelector("[data-care]").textContent,
      select: picker.querySelector("[data-colour]"),
      addLabel: add.textContent,
      add, cancel, message,
    };

    cancel.addEventListener("click", () => {
      fabric.select.value = selected.get(fabric.id).colour.code;
      endEdit();
      list.querySelector(`[data-sheet-row="${fabric.id}"] [data-edit]`).focus();
    });
    fabric.select.addEventListener("change", () => { message.textContent = ""; });
    add.addEventListener("click", () => submit(fabric));
    picker.hidden = false;
  }

  download.addEventListener("click", () => {
    if (!selected.size) return;
    const sections = [...selected.values()].map(({ fabric, colour }) => [
      `${copy.name}: ${fabric.name}`,
      `${copy.id}: ${fabric.id}`,
      `${copy.colour}: ${colour.label}`,
      `${copy.quantity}: 1`,
      `${copy.use}: ${fabric.use}`,
      `${copy.care}: ${fabric.care}`,
    ].join("\r\n"));
    const content = [copy.title, copy.notice, `${copy.count}: ${selected.size}`, ...sections, ""].join("\r\n\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `selvedge-samples-${document.documentElement.lang}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    sheetMessage.textContent = copy.downloaded;
  });

  heading.tabIndex = -1;
  print.addEventListener("click", () => window.print());
  print.hidden = false;
  document.querySelector("[data-sheet-panel]").hidden = false;
}
