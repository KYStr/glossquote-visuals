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
  left: [0.17, 0.20, 0.30, 0.37],
  center: [0.35, 0.13, 0.48, 0.25],
  right: [0.54, 0.20, 0.68, 0.37],
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
  const state = async () => ({
    shape: await stage.getAttribute("data-hero-state"),
    position: await stage.getAttribute("data-scoop-position"),
    aim: await stage.getAttribute("data-scoop-aim"),
    material: await stage.getAttribute("data-material"),
    motion: await stage.getAttribute("data-motion"),
    description: await stage.locator("[data-poster]").getAttribute("alt"),
  });
  await stage.scrollIntoViewIfNeeded();
  await scoop.waitFor({ state: "visible" });
  await page.locator('[data-stage]:not([data-motion="still"]):not([data-motion="starting"])').waitFor();
  // Compare the cuts against the intact resting geometry after the one-time drop.
  if (await stage.getAttribute("data-motion") === "running") await page.waitForTimeout(1450);
  const before = await state();
  assert.equal(before.shape, "intact");
  assert.equal(before.position, "none");
  assert.equal(await reset.isDisabled(), true);
  await capture("before");
  const beforeImage = await stage.screenshot({ scale: "css" });

  let chosen;
  if (input === "keyboard") {
    await scoop.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await stage.getAttribute("data-scoop-aim"), "left");
    await page.keyboard.press("Enter");
    chosen = "left";
  } else {
    const bounds = await scoop.boundingBox();
    assert.ok(bounds);
    const position = { x: bounds.width * (input === "touch" ? 0.79 : 0.5), y: bounds.height * 0.30 };
    if (input === "touch") {
      await scoop.tap({ position });
      chosen = "right";
    } else {
      await scoop.click({ position });
      chosen = "center";
    }
  }

  await page.locator('[data-stage][data-hero-state="scooped"][data-scoop-visual="ready"]').waitFor();
  const after = await state();
  assert.equal(after.position, chosen);
  assert.equal(await scoop.getAttribute("aria-disabled"), "true");
  assert.equal(await reset.isEnabled(), true);
  assert.match(after.description, /hollow.*separate spoonful|凹面.*一勺/);
  assert.match(await stage.locator("[data-poster]").getAttribute("src"), new RegExp(`-${chosen}\\.webp$`));
  await capture("after");
  const afterImage = await stage.screenshot({ scale: "css" });

  if (input === "keyboard") await reset.press("Enter");
  else if (input === "touch") await reset.tap();
  else await reset.click();
  await page.locator('[data-stage][data-hero-state="intact"][data-scoop-visual="ready"]').waitFor();
  const restored = await state();
  assert.equal(restored.position, "none");
  assert.equal(restored.material, before.material);
  assert.equal(restored.description, before.description);
  assert.equal(await scoop.getAttribute("aria-disabled"), "false");
  assert.equal(await reset.isDisabled(), true);
  await stage.scrollIntoViewIfNeeded();
  await capture("reset");
  const resetImage = await stage.screenshot({ scale: "css" });
  const [changed, remained] = await readNotch(page, [beforeImage, afterImage, resetImage], chosen);
  assert.ok(changed > 0.25, `The selected upper edge never visibly opened: ${changed}`);
  assert.ok(remained < changed * 0.55, `Reset did not restore the selected edge: ${remained}`);
  return { input, before, after, reset: restored, pixels: { changed, remained } };
}
