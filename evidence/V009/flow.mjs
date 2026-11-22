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

// Exercise a new impression from a known starting point regardless of how long
// the page had been open. The legacy callback keeps its three checkpoint IDs;
// testPrintStroke additionally captures the blade crossing the stationary sheet.
async function probePrint(page, input, capture, includeStroke) {
  assert.ok(["keyboard", "touch", "mouse"].includes(input));
  const stage = page.locator("[data-stage]");
  const repeat = page.locator("[data-reprint]");
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("[data-stage]")?.dataset.motion === "running");
  const pause = page.locator("[data-pause]");
  const surface = stage.locator("canvas");
  const originalSurface = await surface.elementHandle();
  if (includeStroke) {
    await page.evaluate(() => {
      if (window.__m04Times || window.__visualProbe) return;
      const submit = GPUQueue.prototype.submit;
      window.__v009ReplaySubmissions = 0;
      GPUQueue.prototype.submit = function (commands) {
        const result = submit.call(this, commands);
        window.__v009ReplaySubmissions++;
        return result;
      };
      window.__v009RestoreReplayCounter = () => { GPUQueue.prototype.submit = submit; };
    });
  }
  const getSubmissions = () => page.evaluate(() =>
    window.__m04Times?.length ?? window.__visualProbe?.textures ?? window.__v009ReplaySubmissions);
  // Arm before the real input so a remote screenshot can take longer than
  // the ready interval. Use the site's pause control after allowing the new
  // ink uniforms and blade position to reach the compositor.
  async function armCheckpoint(run, step) {
    await page.evaluate(({ run, step }) => {
      const stage = document.querySelector("[data-stage]");
      const button = document.querySelector("[data-pause]");
      const deadline = performance.now() + 7_500;
      function tick(stableFrames) {
        const edge = Number(stage.dataset.blade);
        const reached = stage.dataset.printRun === String(run) && stage.dataset.printStep === step &&
          (step !== "passing" || (edge >= .47 && edge < .84)) && stage.dataset.motion === "running";
        if (reached && stableFrames >= 2) {
          button.click();
          return;
        }
        if (performance.now() < deadline) requestAnimationFrame(() => tick(reached ? stableFrames + 1 : 0));
      }
      requestAnimationFrame(() => tick(0));
    }, { run, step });
  }
  async function waitCheckpoint(run, step) {
    await page.waitForFunction(({ run, step }) => {
      const stage = document.querySelector("[data-stage]");
      return stage.dataset.printRun === String(run) && stage.dataset.printStep === step && stage.dataset.motion === "paused";
    }, { run, step }, { timeout: 8000 });
  }
  const resume = () => pause.evaluate(button => button.click());
  const trigger = async () => {
    const nextRun = Number(await stage.getAttribute("data-print-run")) + 1;
    await armCheckpoint(nextRun, "ready");
    if (input === "keyboard") {
      await repeat.evaluate(button => button.focus({ preventScroll: true }));
      await page.keyboard.press("Enter");
    } else if (input === "touch") await repeat.tap();
    else await repeat.click();
    await waitCheckpoint(nextRun, "ready");
    return nextRun;
  };
  async function snapshot(name) {
    const sample = await stage.evaluate(scene => {
      function localBox(element) {
        const { left, top, width, height } = element.getBoundingClientRect();
        const sceneBox = scene.getBoundingClientRect();
        return [left - sceneBox.left, top - sceneBox.top, width, height];
      }
      return {
        step: scene.dataset.printStep,
        material: Number(scene.dataset.material),
        run: Number(scene.dataset.printRun),
        blade: Number(scene.dataset.blade),
        toolVisible: ["ready", "printing"].includes(scene.dataset.heroState),
        motion: scene.dataset.motion,
        canvasCount: scene.querySelectorAll("canvas").length,
        sheet: localBox(scene.querySelector(".press-sheet")),
        registration: localBox(scene.querySelector(".registration")),
      };
    });
    assert.equal(await stage.evaluate((scene, canvas) => scene.querySelector("canvas") === canvas, originalSurface), true);
    await capture?.(name);
    return sample;
  }
  const run = await trigger();
  const before = await snapshot("before");
  assert.equal(before.run, run);
  assert.equal(before.step, "ready");
  assert.equal(before.material, 0);
  assert.equal(before.toolVisible, true);
  assert.equal(before.motion, "paused");
  assert.ok(before.blade < .21);
  let mid;
  if (includeStroke) await armCheckpoint(run, "passing");
  await resume();
  if (includeStroke) {
    await waitCheckpoint(run, "passing");
    mid = await snapshot("passing");
    assert.equal(mid.run, run);
    assert.equal(mid.step, "passing");
    assert.equal(mid.toolVisible, true);
    assert.equal(mid.motion, "paused");
    assert.ok(mid.blade > before.blade);
    const submissions = await getSubmissions();
    assert.ok(Number.isInteger(submissions) && submissions > 0);
    mid.submissions = submissions;
    const pixels = await surface.screenshot();
    await page.waitForTimeout(1000);
    assert.ok(pixels.equals(await surface.screenshot()), "Mid-stroke surface changed during pause");
    assert.equal(await getSubmissions(), submissions);
    assert.equal(Number(await stage.getAttribute("data-blade")), mid.blade);
    await resume();
  }
  await page.waitForFunction(expectedRun => {
    const stage = document.querySelector("[data-stage]");
    return stage.dataset.printRun === String(expectedRun) && stage.dataset.heroState === "printed";
  }, run, { timeout: 8000 });
  const after = await snapshot("after");
  assert.equal(after.toolVisible, false);
  assert.equal(after.motion, "running");
  assert.equal(after.step, "complete");
  if (mid) assert.ok(await getSubmissions() > mid.submissions);
  await page.waitForTimeout(250);
  assert.equal(await stage.getAttribute("data-hero-state"), "printed");

  const replayRun = await trigger();
  const reset = await snapshot("reset");
  assert.equal(reset.run, replayRun);
  assert.equal(reset.toolVisible, true);
  assert.equal(reset.motion, "paused");
  assert.ok(reset.blade < .21);
  for (const sample of [mid, after, reset].filter(Boolean)) {
    assert.equal(sample.canvasCount, 1);
    assert.deepEqual(sample.sheet, before.sheet);
    assert.deepEqual(sample.registration, before.registration);
  }
  await resume();
  if (includeStroke) await page.evaluate(() => window.__v009RestoreReplayCounter?.());
  return { before, ...(mid && { mid }), after, reset };
}

export function testHeroInteraction(page, input, capture) {
  return probePrint(page, input, capture, false);
}

export function testPrintStroke(page, input, capture) {
  return probePrint(page, input, capture, true);
}
