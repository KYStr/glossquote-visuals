import assert from "node:assert/strict";

const keys = ["citrus", "berry", "guava"];
const recipes = {
  "zh-Hant": {
    heading: "果時 SORBET HOUR｜禮盒配方",
    lines: ["蜜柑：3 杯 × 100 毫升", "覆盆莓：1 杯 × 100 毫升", "白芭樂：2 杯 × 100 毫升"],
    total: "合計：6 杯 × 100 毫升 = 600 毫升",
    rejected: /禮盒已滿六杯/,
    empty: /目前沒有蜜柑可移除/,
    sections: ["成分", "過敏原", "保存方式"],
  },
  en: {
    heading: "Sorbet Hour | Gift box recipe",
    lines: ["Mandarin: 3 × 100 mL", "Raspberry: 1 × 100 mL", "White guava: 2 × 100 mL"],
    total: "Total: 6 cups × 100 mL = 600 mL",
    rejected: /The box is full/,
    empty: /There are no cups of Mandarin/,
    sections: ["Ingredients", "Allergens", "Storage"],
  },
};

export async function setMaterial(page, state, input) {
  assert.ok([0, 1, 2].includes(state));
  assert.ok(["keyboard", "touch"].includes(input));
  const stage = page.locator("[data-stage]");
  const target = page.locator(`[name=sorbet-flavor][value="${state}"]`);
  if (input === "touch") {
    await target.tap();
  } else {
    const checked = page.locator("[name=sorbet-flavor]:checked");
    const current = Number(await checked.getAttribute("value"));
    await checked.focus();
    const steps = (state - current + 3) % 3;
    for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowRight");
  }
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await stage.getAttribute("data-material"), String(state));
  assert.equal(await target.isChecked(), true);
  return { state, input, motion: await stage.getAttribute("data-motion") };
}

export async function testFlow(page, lang) {
  const expected = recipes[lang];
  assert.ok(expected, `Unsupported test language: ${lang}`);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  await page.locator(".hero a[href='#box']").click();
  const locate = (action, flavor) => page.locator(`[data-${action}="${flavor}"]`);
  const add = flavor => locate("add", flavor).click();
  const downloadButton = page.locator("[data-download]");
  const feedback = page.locator("[data-feedback]");
  const observations = [];
  async function checkState(name, counts) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const aggregate = page.locator("[data-total]");
    assert.equal(await aggregate.getAttribute("data-total"), String(total));
    assert.deepEqual(await page.locator("[data-count]").allTextContents(), counts.map(String));
    assert.equal(await page.locator("[data-slots] [data-filled]").count(), total);
    assert.equal(await downloadButton.isEnabled(), total === 6);
    for (const key of keys) {
      assert.equal(await locate("add", key).getAttribute("aria-disabled"), String(total === 6));
    }
    observations.push({ name, cups: counts, total, downloadEnabled: total === 6, text: await aggregate.textContent() });
  }
  await checkState("empty", [0, 0, 0]);
  await locate("remove", "citrus").press("Enter");
  assert.match(await feedback.textContent(), expected.empty);
  await checkState("empty removal blocked", [0, 0, 0]);

  for (const flavor of ["citrus", "citrus", "berry", "berry", "guava"]) await add(flavor);
  await checkState("five", [2, 2, 1]);
  await add("guava");
  await checkState("full", [2, 2, 2]);

  await locate("add", "citrus").press("Enter");
  assert.match(await feedback.textContent(), expected.rejected);
  await checkState("seventh rejected", [2, 2, 2]);

  await locate("remove", "berry").click();
  await checkState("reopened", [2, 1, 2]);
  await add("citrus");
  await checkState("remixed", [3, 1, 2]);

  const [receipt] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  const filename = receipt.suggestedFilename();
  assert.equal(filename, `sorbet-hour-recipe-${lang}.txt`);
  const chunks = [];
  for await (const chunk of await receipt.createReadStream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString("utf8");
  const lines = text.split("\n");
  assert.equal(lines[0], expected.heading);
  assert.deepEqual(lines.slice(2, 5), expected.lines);
  assert.equal(lines[5], expected.total);
  for (const heading of expected.sections) assert.ok(lines.includes(heading));
  for (const key of keys) {
    const product = page.locator(`[data-product="${key}"]`);
    assert.ok(lines.includes(`${await product.locator("[data-name]").textContent()} — ${await product.locator("[data-ingredients]").textContent()}`));
  }
  for (const marker of ["[data-allergy]", "[data-storage]", "[data-concept]"]) {
    assert.ok(lines.includes(await page.locator(marker).textContent()));
  }
  return { lang, observations, download: { filename, bytes: bytes.length, text } };
}
