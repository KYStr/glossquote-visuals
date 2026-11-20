
import assert from "node:assert/strict";

const weaves = ["plain", "twill", "satin"];

export async function setMaterial(page, state, input) {
  const weave = weaves[state];
  assert.ok(Number.isInteger(state) && weave, `Unknown weave state: ${state}`);
  assert.ok(input === "keyboard" || input === "touch", `Unknown input: ${input}`);
  const button = page.locator(`[data-weave-control="${weave}"]`);
  if (input === "keyboard") {
    await button.focus();
    assert.equal(await button.evaluate((node) => node === document.activeElement), true);
    await page.keyboard.press("Space");
  } else {
    await button.tap();
  }
  const stage = page.locator("[data-stage]");
  assert.equal(await stage.getAttribute("data-weave"), weave);
  assert.equal(await button.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator('[data-weave-control][aria-pressed="true"]').count(), 1);
  await stage.scrollIntoViewIfNeeded();
  return { state, weave, input };
}

export async function testFlow(page, lang) {
  assert.ok(lang === "zh-Hant" || lang === "en");
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  const isEnglish = lang === "en";
  const card = (weave) => page.locator(`[data-fabric="${weave}"]`);
  const count = page.locator("[data-sheet-count]");
  const sheetRows = page.locator("[data-sheet-row]");
  const sheetRow = (id) => page.locator(`[data-sheet-row="${id}"]`);
  const save = page.locator("[data-export]");
  const diagnostics = [];

  async function inspectRows(expected) {
    assert.equal((await count.textContent()).trim(), `${expected.length} / 2`);
    assert.equal(await save.isEnabled(), expected.length > 0);
    const actual = await sheetRows.evaluateAll((rows) => rows.map((row) => [row.dataset.sheetRow, row.dataset.colourCode]));
    assert.deepEqual(actual, expected);
  }

  async function choose(weave, code) {
    await card(weave).locator("[data-colour]").selectOption(code);
    await card(weave).locator("[data-add]").click();
  }

  async function status(weave, pattern) {
    const message = await card(weave).locator("[data-picker-message]").textContent();
    assert.match(message, pattern);
    diagnostics.push(message);
  }

  await inspectRows([]);
  assert.equal(await page.locator("[data-empty]").isVisible(), true);
  await page.locator(".hero .action").click();
  assert.equal(await page.locator(".detail img").count(), 3);

  await choose("plain", "MR-01");
  await status("plain", isEnglish ? /Added/ : /已加入/);
  await choose("plain", "OA-02");
  await status("plain", isEnglish ? /already/ : /已在/);
  await inspectRows([["SLV-101", "MR-01"]]);

  await choose("twill", "MS-03");
  await choose("satin", "IN-05");
  await status("satin", isEnglish ? /Remove one/ : /先移除/);
  await inspectRows([["SLV-101", "MR-01"], ["SLV-202", "MS-03"]]);

  await sheetRow("SLV-101").locator("[data-edit]").click();
  const plainSelect = card("plain").locator("[data-colour]");
  assert.equal(await plainSelect.inputValue(), "MR-01");
  assert.equal(await plainSelect.evaluate((input) => input === document.activeElement), true);
  await plainSelect.selectOption("OA-02");
  await card("plain").locator("[data-cancel]").click();
  await inspectRows([["SLV-101", "MR-01"], ["SLV-202", "MS-03"]]);

  await sheetRow("SLV-101").locator("[data-edit]").click();
  await choose("plain", "OA-02");
  assert.equal(await sheetRow("SLV-101").locator("[data-edit]").evaluate((node) => node === document.activeElement), true);
  await sheetRow("SLV-202").locator("[data-remove]").click();
  await inspectRows([["SLV-101", "OA-02"]]);
  await choose("satin", "CH-06");
  const chosen = [["SLV-101", "OA-02"], ["SLV-503", "CH-06"]];
  await inspectRows(chosen);

  const pending = page.waitForEvent("download");
  await save.click();
  const download = await pending;
  const filename = `selvedge-samples-${lang}.txt`;
  assert.equal(download.suggestedFilename(), filename);
  assert.equal(await download.failure(), null);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const data = Buffer.concat(chunks);
  const content = new TextDecoder("utf-8", { fatal: true }).decode(data);
  assert.match(content, isEnglish ? /^SELVEDGE \| Sample sheet\r\n/ : /^布邊 SELVEDGE｜樣本單\r\n/);
  assert.match(content, isEnglish ? /Fabrics: 2/ : /款數: 2/);
  const fields = isEnglish ? ["Fabric", "Fabric ID", "Colourway", "Quantity", "Use", "Care"] :
    ["布樣", "識別碼", "色號", "數量", "用途", "保養"];
  for (const [weave, id, colour] of [["plain", "SLV-101", "OA-02"], ["satin", "SLV-503", "CH-06"]]) {
    const fabric = card(weave);
    const values = [
      await fabric.locator("[data-name]").textContent(),
      id,
      await fabric.locator(`option[value="${colour}"]`).textContent(),
      "1",
      await fabric.locator("[data-use]").textContent(),
      await fabric.locator("[data-care]").textContent(),
    ];
    const block = fields.map((field, index) => `${field}: ${values[index]}`).join("\r\n");
    assert.ok(content.includes(block), block);
  }
  assert.doesNotMatch(content, /SLV-202|MR-01|IN-05/);

  await sheetRow("SLV-503").locator("[data-remove]").click();
  await sheetRow("SLV-101").locator("[data-remove]").click();
  await inspectRows([]);
  assert.equal(await page.locator("[data-empty]").isVisible(), true);

  return { lang, chosen, diagnostics, download: { filename, bytes: data.length, content }, emptied: true };
}
