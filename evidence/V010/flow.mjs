import assert from "node:assert/strict";

const fields = ["model", "people", "route", "payload", "packed", "weight", "open", "paddle", "vest", "bag", "price"];
const languages = {
  "zh-Hant": {
    title: "摺徑 FOLDLINE｜裝備與攜行清單",
    labels: ["船型", "同行人數", "規劃路線", "總載重", "攜行尺寸（長 × 寬 × 高）", "船身重量", "展開尺寸", "四節拆式槳", "浮力背心", "防水袋", "示意總價"],
    values: ["Tandem 370 雙人艇", "2 人", "內陸水道"],
    solo: "Solo 330 單人艇",
    errors: { seats: /不符/, coast: /修改路線/, load: /110 kg 額定值/, quantity: /輸入整數/ },
    downloaded: /清單已產生/,
    separator: "：",
  },
  en: {
    title: "FOLDLINE | Equipment and carry list",
    labels: ["Kayak", "Party size", "Planned route", "Total payload", "Packed size (L × W × H)", "Hull weight", "Open size", "Four-piece paddle", "Buoyancy vest", "Dry bag", "Illustrative total"],
    values: ["Tandem 370", "2 people", "Inland waterway"],
    solo: "Solo 330",
    errors: { seats: /does not match/, coast: /Change your route/, load: /110 kg rating/, quantity: /whole number/ },
    downloaded: /list has been generated/,
    separator: ": ",
  },
};

export async function setMaterial(page, state, input) {
  assert.ok([0, 1, 2].includes(state));
  assert.ok(["keyboard", "touch", "mouse"].includes(input));
  const stage = page.locator("[data-stage]");
  const target = page.locator(`[name=fold-state][value="${state}"]`);
  if (input === "touch") {
    await target.tap();
  } else if (input === "mouse") {
    await target.click();
  } else {
    const checked = page.locator("[name=fold-state]:checked");
    const current = Number(await checked.getAttribute("value"));
    await checked.focus();
    const steps = (state - current + 3) % 3;
    if (steps === 0) await target.press("Space");
    for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowRight");
  }
  await stage.scrollIntoViewIfNeeded();
  const pose = ["packed", "half", "complete"][state];
  await page.locator(`[data-stage][data-assembly-view="manual"][data-assembly-phase="${pose}"]`).waitFor();
  assert.equal(await stage.getAttribute("data-material"), String(state));
  assert.equal(await target.isChecked(), true);
  return { state, input, motion: await stage.getAttribute("data-motion") };
}

export async function testHeroInteraction(page, input, capture) {
  assert.ok(["keyboard", "touch", "mouse"].includes(input));
  const stage = page.locator("[data-stage]");
  const replay = page.locator("[data-replay]");
  await replay.waitFor();
  await stage.locator("canvas").waitFor({ state: "visible" });
  await setMaterial(page, 0, input);
  const waitFor = (run, phase) => page.locator(`[data-stage][data-assembly-run="${run}"][data-assembly-phase="${phase}"]`).waitFor();
  const beforeRun = Number(await stage.getAttribute("data-assembly-run"));
  await waitFor(beforeRun, "packed");
  await capture("before");

  const nextRun = beforeRun + 1;
  const trace = await stage.evaluateHandle((el, run) => {
    const steps = [];
    const record = () => {
      if (el.dataset.assemblyRun !== String(run)) return;
      const phase = el.dataset.assemblyPhase;
      if (phase === steps.at(-1)?.phase) return;
      steps.push({ phase, ms: performance.now() });
    };
    const observer = new MutationObserver(record);
    observer.observe(el, { attributes: true, attributeFilter: ["data-assembly-phase", "data-assembly-run"] });
    return {
      finish() { observer.disconnect(); return steps; },
    };
  }, nextRun);
  let timeline;
  try {
    if (input === "keyboard") await replay.press("Enter");
    else if (input === "touch") await replay.tap();
    else await replay.click();
    await waitFor(nextRun, "complete");
    timeline = await trace.evaluate(record => record.finish());
  } finally {
    await trace.evaluate(record => record.finish()).catch(() => {});
    await trace.dispose();
  }
  const steps = ["packed", "releasing", "extending", "raising", "settling", "complete"];
  assert.deepEqual(timeline.map(({ phase }) => phase), steps);
  const normalized = timeline.map(({ phase, ms }) => ({ phase, ms: ms - timeline[0].ms }));
  assert.ok(normalized.find(({ phase }) => phase === "extending").ms < 3000, "The main leaves must begin opening within three seconds");
  assert.ok(normalized.at(-1).ms >= 4200, "The sequence must open gradually");
  await capture("after");
  await page.waitForTimeout(1200);
  assert.equal(await stage.getAttribute("data-assembly-phase"), "complete");
  assert.equal(await stage.getAttribute("data-material"), "2");
  assert.equal(await stage.getAttribute("data-assembly-run"), String(nextRun));
  await setMaterial(page, 0, input);
  await waitFor(nextRun, "packed");
  await capture("reset");
  return { input, before: "packed", after: "complete", reset: "packed", playback: nextRun, timeline: normalized };
}

export async function testApprovedHero(page, input, capture) {
  assert.ok(["mouse", "touch"].includes(input));
  const stage = page.locator("[data-stage]");
  const replay = page.locator("[data-replay]");
  const pause = page.locator("[data-pause]");
  const activate = locator => input === "touch" ? locator.tap() : locator.click();
  const checkpoints = [];
  await replay.waitFor();
  await setMaterial(page, 0, input);
  const record = async (name, phase) => {
    assert.equal(await stage.getAttribute("data-assembly-phase"), phase);
    await capture(name);
    assert.equal(await stage.getAttribute("data-assembly-phase"), phase);
    checkpoints.push({ name, phase, motion: await stage.getAttribute("data-motion") });
  };
  await record("packed", "packed");
  const run = Number(await stage.getAttribute("data-assembly-run"))+1;
  await activate(replay);
  for (const phase of ["releasing", "extending", "raising"]) {
    const checkpoint = page.locator(`[data-stage][data-assembly-run="${run}"][data-assembly-checkpoint="${phase}"]`);
    await checkpoint.waitFor();
    await activate(pause);
    try {
      assert.equal(await pause.getAttribute("aria-pressed"), "true");
      await record(phase, phase);
    } finally {
      await activate(pause);
    }
  }
  await page.locator(`[data-stage][data-assembly-run="${run}"][data-assembly-phase="complete"][data-assembly-view="manual"]`).waitFor();
  await record("afloat", "complete");
  assert.equal(await stage.getAttribute("data-material"), "2");
  return { input, run, checkpoints };
}

export async function testFlow(page, lang) {
  const expected = languages[lang];
  assert.ok(expected, `Unsupported language: ${lang}`);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  const cta = page.locator(".hero a[href='#plan']");
  await cta.click();
  const field = name => page.locator(`[data-planner] [name="${name}"]`);
  const choose = (name, value) => field(name).selectOption(value);
  const fill = (name, value) => field(name).fill(String(value));
  const result = name => page.locator(`[data-value="${name}"]`).textContent();
  const feedback = page.locator("[data-feedback]");
  const download = page.locator("[data-download]");
  const observations = [];
  async function check(name, enabled, problem, invalidField) {
    assert.equal(await download.isEnabled(), enabled);
    const message = await feedback.textContent();
    if (problem) assert.match(message, expected.errors[problem]);
    if (invalidField) assert.equal(await field(invalidField).getAttribute("aria-invalid"), "true");
    observations.push({ name, enabled, message, model: await result("model"), packed: await result("packed"), price: await result("price") });
  }
  await check("awaiting load", false);
  await fill("load", 90);
  await fill("paddle", 1);
  await fill("vest", 1);
  await fill("bag", 1);
  await check("solo lake kit", true);
  assert.equal(await result("model"), expected.solo);
  assert.equal(await result("packed"), "90 × 36 × 30 cm");
  assert.equal(await result("price"), "NT$32,730");

  await fill("load", 110);
  await check("exact solo payload accepted", true);
  await fill("load", 110.1);
  await check("above solo payload rejected", false, "load", "load");
  await choose("people", "2");
  await check("two paddlers with one seat rejected", false, "seats", "model");
  await choose("model", "tandem");
  await choose("route", "coast");
  await check("coastal route outside catalogue", false, "coast", "route");
  await choose("route", "inland");
  await fill("bag", 3);
  await check("third bag rejected", false, "quantity", "bag");
  await fill("bag", 2);
  await fill("vest", 2.5);
  await check("fractional equipment rejected", false, "quantity", "vest");
  await fill("vest", 1);
  await fill("paddle", 2);
  await fill("load", 205);
  await check("revised tandem kit at capacity", true);

  const values = [...expected.values, "205 kg / 205 kg", "106 × 41 × 34 cm", "14.6 kg", "370 × 77 cm", "2", "1", "2", "NT$43,210"];
  assert.deepEqual(await Promise.all(fields.map(result)), values);
  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  const filename = file.suggestedFilename();
  assert.equal(filename, `foldline-kit-${lang}.txt`);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString("utf8");
  const notice = await page.locator("[data-concept]").textContent();
  assert.deepEqual(text.split("\n"), [
    expected.title, "", ...expected.labels.map((label, i) => label + expected.separator + values[i]), "", notice, "",
  ]);
  assert.match(await feedback.textContent(), expected.downloaded);
  return { lang, observations, download: { filename, bytes: bytes.length, text } };
}
