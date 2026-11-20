import assert from "node:assert/strict";

export async function setMaterial(page, state, input) {
  assert.ok([0, 1, 2].includes(state));
  assert.ok(["keyboard", "touch"].includes(input));
  const stage = page.locator("[data-stage]");
  const target = page.locator(`[name=press-plate][value="${state}"]`);
  await target.waitFor({ state: "visible" });
  if (input === "touch") {
    await target.tap();
  } else {
    const checked = page.locator("[name=press-plate]:checked");
    const current = Number(await checked.getAttribute("value"));
    await checked.focus();
    for (let i = 0; i < (state - current + 3) % 3; i++) await page.keyboard.press("ArrowRight");
  }
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await stage.getAttribute("data-material"), String(state));
  assert.equal(await target.isChecked(), true);
  return { state, input, motion: await stage.getAttribute("data-motion") };
}

const expected = {
  en: {
    heading: "AFTERIMAGE PRESS | Print sheet",
    copy: n => `${n} copies`,
    lead: range => `${range} working days`,
    invalid: "Enter a whole number from 25 to 250 copies.",
    warm: "Warm white",
    oat: "Oat",
    stock: "170 gsm uncoated, cobalt blue + fluorescent orange",
    labels: ["Artwork", "Trim size", "Print run", "Paper", "Estimate", "Lead time"],
  },
  "zh-Hant": {
    heading: "疊印 AFTERIMAGE PRESS｜印件製作單",
    copy: n => `${n} 張`,
    lead: range => `${range} 個工作天`,
    invalid: "請輸入 25 至 250 之間的整數。",
    warm: "暖白",
    oat: "燕麥",
    stock: "170 g/m² 未塗佈紙，鈷藍與螢橘雙色",
    labels: ["圖案", "成品尺寸", "印量", "紙色", "預估金額", "預估工期"],
  },
};

export async function testFlow(page, lang) {
  const copy = expected[lang];
  assert.ok(copy, `Unsupported language: ${lang}`);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  await page.locator(".hero a[href='#print']").click();
  const form = page.locator("[data-form]");
  const receipt = page.locator("[data-receipt]");
  const art = form.locator("[name=art]");
  const size = form.locator("[name=size]");
  const paper = form.locator("[name=paper]");
  const copies = form.locator("[name=copies]");
  const download = receipt.locator("[data-download]");
  const feedback = form.locator("[data-feedback]");
  const dimensions = { A3: "A3 · 297 × 420 mm", A2: "A2 · 420 × 594 mm" };
  const observations = [];
  async function checkState(name, { poster, format, count, color, price, days }) {
    const rows = [poster, dimensions[format], copy.copy(count), copy[color], `NT$${price}`, copy.lead(days)];
    assert.deepEqual(await receipt.locator("[data-result]").allTextContents(), rows);
    assert.equal(await copies.getAttribute("aria-invalid"), "false");
    assert.equal(await feedback.textContent(), "");
    assert.equal(await download.isEnabled(), true);
    observations.push({ name, count, rows });
    return rows;
  }
  await checkState("initial estimate", { poster: "AP–01 Feedback Assembly", format: "A3", count: 50, color: "warm", price: "2,050", days: "5–7" });
  for (const invalid of ["", "24", "25.5", "251"]) {
    await copies.fill(invalid);
    assert.equal(await copies.getAttribute("aria-invalid"), "true");
    assert.equal(await feedback.textContent(), copy.invalid);
    assert.equal(await download.isEnabled(), false);
    assert.equal(await receipt.locator("[data-result=price]").textContent(), "—");
    observations.push({ name: "invalid count rejected", input: invalid, error: copy.invalid });
  }
  await copies.fill("25");
  await checkState("minimum", { poster: "AP–01 Feedback Assembly", format: "A3", count: 25, color: "warm", price: "1,500", days: "5–7" });

  await page.locator("[data-use-art=orbital]").click();
  assert.equal(await art.inputValue(), "orbital");
  await size.selectOption("A2");
  await paper.selectOption("oat");
  await copies.fill("150");
  const orbital = { poster: "AP–02 Orbital Relay", format: "A2", color: "oat" };
  await checkState("standard lead threshold", { ...orbital, count: 150, price: "6,900", days: "7–9" });
  await copies.fill("151");
  await checkState("extra lead threshold", { ...orbital, count: 151, price: "6,937", days: "9–11" });
  await copies.fill("250");
  await checkState("maximum", { ...orbital, count: 250, price: "10,600", days: "9–11" });

  await art.selectOption("side-b");
  await size.selectOption("A3");
  await paper.selectOption("warm");
  await copies.fill("72");
  const rows = await checkState("revised", { poster: "AP–03 Side B Social", format: "A3", count: 72, color: "warm", price: "2,534", days: "5–7" });

  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  const filename = file.suggestedFilename();
  assert.equal(filename, `afterimage-print-sheet-${lang}.txt`);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString("utf8");
  const concept = await page.locator("[data-concept]").textContent();
  assert.deepEqual(text.split("\n"), [
    copy.heading, "", ...rows.map((row, i) => `${copy.labels[i]} ${row}`), copy.stock, "", concept, "",
  ]);
  assert.ok(bytes.length > 0);
  return { lang, observations, download: { filename, bytes: bytes.length, text } };
}
