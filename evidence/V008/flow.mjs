import assert from "node:assert/strict";

const keys = ["citrus", "berry", "guava"];
const recipes = {
  "zh-Hant": {
    heading: "果時 JELLY HOUR｜果凍禮盒配方",
    lines: ["蜜柑果凍：3 杯 × 100 毫升", "覆盆莓果凍：1 杯 × 100 毫升", "白芭樂果凍：2 杯 × 100 毫升"],
    total: "合計：6 杯 × 100 毫升 = 600 毫升",
    rejected: /禮盒已滿六杯/,
    empty: /目前沒有蜜柑果凍可移除/,
    sections: ["成分", "過敏原", "保存方式"],
  },
  en: {
    heading: "Jelly Hour | Fruit jelly gift box recipe",
    lines: ["Mandarin jelly: 3 × 100 mL", "Raspberry jelly: 1 × 100 mL", "White guava jelly: 2 × 100 mL"],
    total: "Total: 6 cups × 100 mL = 600 mL",
    rejected: /The box is full/,
    empty: /There are no cups of Mandarin jelly/,
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
  assert.equal(filename, `jelly-hour-recipe-${lang}.txt`);
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

const notchBoxes = {
  left: [0.37, 0.31, 0.50, 0.48],
  center: [0.55, 0.24, 0.68, 0.36],
  right: [0.74, 0.31, 0.88, 0.48],
};

async function readNotch(page, pngs, spot) {
  return page.evaluate(async ({ pngs, box }) => {
    const pixels = await Promise.all(pngs.map(async encoded => {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const [x1, y1, x2, y2] = box;
      const target = document.createElement("canvas");
      target.width = 64;
      target.height = 64;
      const ctx = target.getContext("2d");
      ctx.drawImage(bitmap, x1 * bitmap.width, y1 * bitmap.height,
        (x2 - x1) * bitmap.width, (y2 - y1) * bitmap.height, 0, 0, 64, 64);
      bitmap.close();
      return ctx.getImageData(0, 0, 64, 64).data;
    }));
    const reference = pixels[0];
    return pixels.slice(1).map(image => {
      let changed = 0;
      for (let i = 0; i < reference.length; i += 4) {
        if (Math.max(...[0, 1, 2].map(c => Math.abs(reference[i + c] - image[i + c]))) > 25) changed++;
      }
      return changed / (reference.length / 4);
    });
  }, { pngs: pngs.map(png => png.toString("base64")), box: notchBoxes[spot] });
}

export async function testHeroInteraction(page, input, capture) {
  assert.ok(["keyboard", "touch", "mouse"].includes(input));
  const stage = page.locator("[data-stage]");
  const scoop = stage.locator("[data-scoop-hit]");
  const reset = page.locator("[data-scoop-reset]");
  const pause = page.locator("[data-pause]");
  const screenshot = () => stage.screenshot({ scale: "css" });
  const state = () => stage.evaluate(element => ({
    shape: element.dataset.heroState,
    position: element.dataset.scoopPosition,
    aim: element.dataset.scoopAim,
    material: element.dataset.material,
    motion: element.dataset.motion,
    phase: element.dataset.bitePhase,
    run: Number(element.dataset.biteRun),
    elapsed: Number(element.dataset.biteElapsed),
    description: element.querySelector("[data-poster]").alt,
  }));
  const activate = button => input === "keyboard" ? button.press("Enter") :
    input === "touch" ? button.tap() : button.click();

  async function restore() {
    if (!(await reset.isDisabled())) await activate(reset);
    await page.locator('[data-stage][data-hero-state="intact"][data-scoop-visual="ready"]').waitFor();
    await stage.scrollIntoViewIfNeeded();
  }

  async function choose(direction) {
    if (input === "keyboard") {
      await scoop.focus();
      await page.keyboard.press(direction === "left" ? "ArrowLeft" : "ArrowRight");
      assert.equal(await stage.getAttribute("data-scoop-aim"), direction);
      await page.keyboard.press("Enter");
    } else {
      const bounds = await scoop.boundingBox();
      assert.ok(bounds);
      const position = { x: bounds.width * (direction === "left" ? 0.22 : 0.79), y: bounds.height * 0.30 };
      if (input === "touch") await scoop.tap({ position });
      else await scoop.click({ position });
    }
  }

  await stage.scrollIntoViewIfNeeded();
  await scoop.waitFor({ state: "visible" });
  await page.locator('[data-stage]:not([data-motion="still"]):not([data-motion="starting"])').waitFor();
  await restore();
  const before = await state();
  assert.equal(before.shape, "intact");
  assert.equal(before.position, "none");
  await capture("before");
  const beforeImage = await screenshot();

  const firstSpot = input === "touch" ? "right" : "left";
  const secondSpot = firstSpot === "left" ? "right" : "left";
  const firstRun = before.run + 1;
  const live = before.motion === "running";
  if (live) {
    // Arm before the real gesture. Lock only this run in the cut window so
    // remote screenshot latency cannot turn a cut sample into a lift sample.
    await stage.evaluate((element, run) => {
      const observer = new MutationObserver(() => {
        if (Number(element.dataset.biteRun) !== run || element.dataset.bitePhase !== "cut" ||
          Number(element.dataset.biteElapsed) < 1680) return;
        observer.disconnect();
        requestAnimationFrame(() => {
          if (Number(element.dataset.biteRun) === run && element.dataset.bitePhase === "cut") {
            document.querySelector("[data-pause]").click();
          }
        });
      });
      observer.observe(element, { attributes: true, attributeFilter: ["data-bite-elapsed"] });
    }, firstRun);
  }
  await choose(firstSpot);
  let mid;
  if (live) {
    await page.locator(`[data-stage][data-bite-run="${firstRun}"][data-bite-phase="cut"][data-motion="paused"]`).waitFor();
    const observed = await state();
    assert.equal(observed.position, firstSpot);
    assert.equal(observed.shape, "tasting");
    assert.ok(observed.elapsed >= 1630 && observed.elapsed < 1940);
    if (typeof capture.mid === "function") await capture.mid("cut", observed);
    else if (capture.checkpoints?.includes("mid")) await capture("mid");
    mid = { ...observed, pngBase64: (await screenshot()).toString("base64") };
    await activate(pause);
  }

  const held = async run => {
    await page.locator(`[data-stage][data-bite-run="${run}"][data-bite-phase="held"][data-hero-state="scooped"][data-scoop-visual="ready"]`).waitFor();
    const result = await state();
    assert.equal(result.elapsed, 3650);
    assert.match(result.description, /hollow.*silver spoon|凹面.*銀匙/);
    return result;
  };
  const after = await held(firstRun);
  assert.equal(after.position, firstSpot);
  await capture("after");
  const afterImage = await screenshot();

  await restore();
  const secondRun = (await state()).run + 1;
  await choose(secondSpot);
  const alternate = await held(secondRun);
  assert.equal(alternate.position, secondSpot);
  const alternateImage = await screenshot();
  assert.notDeepEqual(alternateImage, afterImage);

  await restore();
  const restored = await state();
  assert.equal(restored.position, "none");
  assert.equal(restored.material, before.material);
  assert.equal(restored.description, before.description);
  assert.equal(await reset.isDisabled(), true);
  await capture("reset");
  const resetImage = await screenshot();
  const [changed, remained] = await readNotch(page, [beforeImage, afterImage, resetImage], firstSpot);
  const [alternateChanged] = await readNotch(page, [beforeImage, alternateImage], secondSpot);
  assert.ok(changed > 0.20 && alternateChanged > 0.20, `Selected edges did not open: ${changed}, ${alternateChanged}`);
  assert.ok(remained < changed * 0.55, `Reset did not restore the selected edge: ${remained}`);
  return { input, before, mid, after, reset: restored,
    alternate: { ...alternate, pngBase64: alternateImage.toString("base64") },
    pixels: { changed, alternateChanged, remained } };
}

export async function testApprovedHero(page, input, capture) {
  assert.ok(["mouse", "touch"].includes(input));
  const stage = page.locator("[data-stage]");
  const scoop = stage.locator("[data-scoop-hit]");
  const reset = page.locator("[data-scoop-reset]");
  const pause = page.locator("[data-pause]");
  const activate = button => input === "touch" ? button.tap() : button.click();
  const selected = [
    { name: "left", x: 0.414, y: 0.365 },
    { name: "right", x: 0.825, y: 0.365 },
  ];

  await stage.scrollIntoViewIfNeeded();
  await page.locator('[data-stage][data-rendered][data-motion="running"]').waitFor();
  await scoop.waitFor();
  if (!(await reset.isDisabled())) await activate(reset);
  await page.locator('[data-stage][data-hero-state="intact"][data-scoop-visual="ready"]').waitFor();
  assert.equal(await stage.getAttribute("data-cuts"), "");
  await capture("intact");

  async function select(point) {
    const bounds = await stage.boundingBox();
    const hit = await scoop.boundingBox();
    assert.ok(bounds && hit);
    const x = bounds.x + point.x * bounds.width;
    const y = bounds.y + point.y * bounds.height;
    assert.ok(x > hit.x && x < hit.x + hit.width && y > hit.y && y < hit.y + hit.height);
    if (input === "touch") await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    assert.equal(await stage.getAttribute("data-scoop-position"), point.name);
  }

  async function waitForHeld(name, expected) {
    await page.locator(`[data-stage][data-scoop-position="${name}"][data-bite-phase="held"]`).waitFor();
    assert.equal(await stage.getAttribute("data-cuts"), expected);
  }

  await stage.evaluate(element => {
    const run = Number(element.dataset.biteRun) + 1;
    const observer = new MutationObserver(() => {
      if (Number(element.dataset.biteRun) !== run || element.dataset.bitePhase !== "press" ||
        Number(element.dataset.biteElapsed) < 1430) return;
      observer.disconnect();
      requestAnimationFrame(() => {
        if (Number(element.dataset.biteRun) === run && element.dataset.bitePhase === "press") {
          document.querySelector("[data-pause]").click();
        }
      });
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-bite-elapsed"] });
  });
  await select(selected[0]);
  await page.locator('[data-stage][data-bite-phase="press"][data-motion="paused"]').waitFor();
  await capture("press");
  await activate(pause);
  await waitForHeld("left", "left");
  await capture("first-bite");

  await select(selected[1]);
  assert.match(await stage.getAttribute("data-cuts"), /\bleft\b/);
  await waitForHeld("right", "left right");
  await capture("second-bite");

  await activate(reset);
  await page.locator('[data-stage][data-hero-state="intact"][data-scoop-visual="ready"]').waitFor();
  assert.equal(await stage.getAttribute("data-cuts"), "");
  await capture("reset");
  return { positions: selected.map(({ x, y }) => ({ x, y })) };
}
