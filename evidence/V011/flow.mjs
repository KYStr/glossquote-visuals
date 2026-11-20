import assert from "node:assert/strict";

const copy = {
  "zh-Hant": {
    title: "食刻 UMBRA DIAL｜場館提案",
    minimum: /至少 12 人的整數/,
    compactLimit: /72 人/,
    hallLimit: /108 人/,
    unconfirmed: /先確認場地/,
    shadow: "追光入影・共 48 人・7 歲以上・22 分鐘",
    orbit: "下一道月影・共 73 人・13 歲以上・38 分鐘",
    finalSlots: ["第 1 場・25 人", "第 2 場・24 人", "第 3 場・24 人"],
    finalEstimate: "示意總額：NT$ 78,000",
  },
  en: {
    title: "UMBRA DIAL | Venue proposal",
    minimum: /whole number of guests, at least 12/,
    compactLimit: /72 guests/,
    hallLimit: /108 guests/,
    unconfirmed: /Confirm the clear floor/,
    shadow: "Chasing the Shadow · 48 guests · Ages 7+ · 22 min",
    orbit: "The Next Eclipse · 73 guests · Ages 13+ · 38 min",
    finalSlots: ["Screening 1 · 25 guests", "Screening 2 · 24 guests", "Screening 3 · 24 guests"],
    finalEstimate: "Sample total: NT$ 78,000",
  },
};

export async function setMaterial(page, state, input) {
  assert.ok([0, 1, 2].includes(state), "Invalid eclipse phase");
  assert.ok(["keyboard", "touch"].includes(input), "Unsupported input");
  const stage = page.locator("[data-stage]");
  const radio = page.locator(`[name=eclipse-phase][value="${state}"]`);
  if (input === "touch") {
    await page.locator(".phase").filter({ has: radio }).tap();
  } else {
    const checked = page.locator("[name=eclipse-phase]:checked");
    const current = Number(await checked.getAttribute("value"));
    await checked.focus();
    const steps = (state - current + 3) % 3;
    for (let step = 0; step < steps; step++) await page.keyboard.press("ArrowRight");
  }
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await radio.isChecked(), true);
  assert.equal(await stage.getAttribute("data-material"), String(state));
  return { state, input, motion: await stage.getAttribute("data-motion") };
}

export async function testFlow(page, lang) {
  const expected = copy[lang];
  assert.ok(expected, `Unsupported test language: ${lang}`);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  await page.locator(".hero a[href='#programs']").click();
  await page.locator("[data-choose=shadow]").click();

  const locate = selector => page.locator(selector);
  const form = locate("[data-planner]");
  const submit = form.locator("[type=submit]");
  const film = form.locator("[name=film]");
  const audience = form.locator("[name=audience]");
  const venue = form.locator("[name=venue]");
  const result = locate("[data-result]");
  const download = locate("[data-download]");
  const feedback = locate("[data-feedback]");
  const edit = () => locate("[data-edit]").click();
  const labels = () => locate("[data-screenings] li span").allTextContents();
  const times = () => locate("[data-screenings] li strong").allTextContents();
  const observations = [];

  async function rejected(name, control, pattern) {
    await submit.click();
    assert.equal(await result.isVisible(), false, name);
    assert.equal(await download.isVisible(), false, name);
    assert.equal(await control.getAttribute("aria-invalid"), "true", name);
    assert.equal(await control.evaluate(element => document.activeElement === element), true, name);
    assert.match(await feedback.textContent(), pattern, name);
    observations.push({ name, message: await feedback.textContent() });
  }

  async function accepted(name, count) {
    await submit.click();
    assert.equal(await form.isVisible(), false, name);
    assert.equal(await result.isVisible(), true, name);
    assert.equal(await download.isEnabled(), true, name);
    const scheduled = await times();
    assert.equal(scheduled.length, count, name);
    observations.push({ name, labels: await labels(), times: scheduled, summary: await locate("[data-summary]").textContent() });
  }

  assert.equal(await film.inputValue(), "shadow");
  assert.equal(await venue.inputValue(), "compact");
  assert.equal(await audience.inputValue(), "48");
  await accepted("normal compact screening", 2);
  assert.equal(await locate("[data-summary]").textContent(), expected.shadow);
  assert.deepEqual(await times(), ["09:30–09:52", "10:07–10:29"]);
  assert.match(await locate("[data-space]").textContent(), /7 × 7.*3\.8.*110.*08:30–11:14/);

  await edit();
  assert.equal(await film.inputValue(), "shadow");
  assert.equal(await venue.inputValue(), "compact");
  assert.equal(await audience.inputValue(), "48");
  await audience.fill("11");
  await rejected("below minimum", audience, expected.minimum);
  await audience.fill("12.5");
  await rejected("fractional count", audience, expected.minimum);
  await audience.fill("12");
  await accepted("minimum", 1);
  assert.match((await labels())[0], /12/);

  await edit();
  await audience.fill("73");
  await rejected("compact overflow", audience, expected.compactLimit);
  await audience.fill("72");
  await accepted("compact maximum", 3);
  assert.ok((await labels()).every(label => label.includes("24")));

  await edit();
  await venue.selectOption("unknown");
  await rejected("unconfirmed venue", venue, expected.unconfirmed);
  await venue.selectOption("hall");
  await audience.fill("109");
  await rejected("hall overflow", audience, expected.hallLimit);
  await audience.fill("108");
  await accepted("hall maximum", 3);
  assert.ok((await labels()).every(label => label.includes("36")));

  await edit();
  await film.selectOption("orbit");
  await audience.fill("73");
  await accepted("revised hall proposal", 3);
  assert.equal(await locate("[data-summary]").textContent(), expected.orbit);
  assert.deepEqual(await labels(), expected.finalSlots);
  const finalTimes = ["09:30–10:08", "10:23–11:01", "11:16–11:54"];
  assert.deepEqual(await times(), finalTimes);
  const space = await locate("[data-space]").textContent();
  assert.match(space, /9 × 9.*5.*110.*08:30–12:39/);
  assert.equal(await locate("[data-estimate]").textContent(), expected.finalEstimate);

  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  const filename = file.suggestedFilename();
  assert.equal(filename, `umbra-dial-proposal-${lang}.txt`);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString("utf8");
  assert.ok(bytes.length > 100);
  assert.deepEqual(text.split("\n"), [
    expected.title, await locate("[data-concept]").textContent(), "", expected.orbit,
    ...expected.finalSlots.map((label, index) => `${label} | ${finalTimes[index]}`), "",
    space, await locate("[data-equipment]").textContent(), expected.finalEstimate, "",
  ]);
  return { lang, observations, download: { filename, bytes: bytes.length, text } };
}
