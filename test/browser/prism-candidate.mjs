import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { base, root } from "../../scripts/site-map.mjs";
import { observe } from "./probe.mjs";
import { serveDist } from "./server.mjs";

if (process.platform !== "win32" || process.env.RUNNER_OS !== "Windows" ||
    process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("NOT_RUN_USER_FOCUS_BOUNDARY: PRISM browser checks require a GitHub-hosted Windows VM");
}

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
const dir = resolve(root, ".runs/prism-evidence");
await mkdir(dir, { recursive: true });
const evidence = {
  commit, environment: "GitHub-hosted Windows Server 2025 / Chromium D3D11 WARP",
  checks: {}, screenshots: [], downloads: [], measurements: {},
};
const site = await serveDist();
const stage = page => page.locator("[data-stage]");
const url = locale => site.origin + base + (locale === "en" ? "en/" : "") + "works/prism-materials/";
const fontPaths = ["prism-archivo-black.ttf", "prism-plex-mono.ttf"].map(file => base + "fonts/" + file);
const selector = "#prism-angle";
const phase = (page, expected) => page.waitForFunction((value) =>
  document.querySelector("[data-stage]")?.dataset.motion === value, expected, { timeout: 35_000 });
const counters = page => page.evaluate(() => {
  const { devices, textures, configurations } = window.__visualProbe;
  return { devices, textures, configurations };
});

async function withPage(browser, options, run) {
  const context = await browser.newContext(options);
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

async function open(page, locale) {
  const response = await page.goto(url(locale));
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator("html").getAttribute("lang"), locale);
  assert.equal(await page.locator("canvas").count(), 1);
}

async function capture(page, name, target = page, options) {
  const file = "prism-" + name + ".png";
  const png = await target.screenshot({ path: resolve(dir, file), ...options });
  evidence.screenshots.push(file);
  return png.toString("base64");
}

async function full(page, name) {
  await page.locator("main img").evaluateAll(async images => {
    for (const image of images) image.loading = "eager";
    await Promise.all(images.map(image => image.decode()));
  });
  return capture(page, name, page, { fullPage: true });
}

async function difference(page, a, b, region) {
  return page.evaluate(async ([first, second, region]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 80;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const images = await Promise.all([first, second].map(async encoded => {
      const bytes = Uint8Array.from(atob(encoded), value => value.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (region) {
        const xScale = bitmap.width / region.viewportWidth;
        const yScale = bitmap.height / region.viewportHeight;
        ctx.drawImage(bitmap, region.x * xScale, region.y * yScale,
          region.width * xScale, region.height * yScale, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
      bitmap.close();
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }));
    let total = 0;
    for (let index = 0; index < images[0].length; index++) {
      total += Math.abs(images[0][index] - images[1][index]);
    }
    return total / images[0].length;
  }, [a, b, region]);
}

async function assertLayout(page, label) {
  const controls = await page.locator("a.button, nav a, select, #sample-quantity, button, summary, .specimen-choices label, #prism-angle").evaluateAll(nodes =>
    nodes.filter(node => node.getClientRects().length).map(node => ({
      width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
      text: node.textContent.trim() || node.id,
    })));
  for (const { width, height, text } of controls) {
    assert.ok(width >= 44 && height >= 44, `${label}: small target ${text} (${width}×${height})`);
  }
  const overflow = await page.evaluate(() => {
    const pixels = document.documentElement.scrollWidth - innerWidth;
    if (pixels <= 0) return { pixels };
    const offenders = [...document.querySelectorAll("body *")].flatMap(node => {
      const rect = node.getBoundingClientRect();
      if (rect.right <= innerWidth + 1) return [];
      return [{ element: node.tagName, id: node.id, classes: node.getAttribute("class"), right: Math.round(rect.right) }];
    }).slice(0, 15);
    return { pixels, offenders };
  });
  assert.equal(overflow.pixels, 0, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function checkLayout(browser) {
  for (const locale of ["en", "zh-Hant"]) {
    for (const width of [320, 390, 768, 1440]) {
      const height = width >= 768 ? 960 : 844;
      await withPage(browser, { viewport: { width, height }, hasTouch: width < 768, reducedMotion: "reduce" }, async page => {
        const probe = await observe(page);
        await open(page, locale);
        await phase(page, "reduced");
        await page.evaluate(() => document.fonts.ready);
        await assertLayout(page, `${locale}-${width}`);
        assert.equal((await counters(page)).devices, 0);
        assert.equal(await stage(page).locator("canvas").isVisible(), false);
        const photo = stage(page).locator("img");
        assert.ok(await photo.evaluate(image => image.complete && image.naturalWidth > 0));
        if (width === 390) {
          await page.locator(".specimen-choices label").last().tap();
          await photo.evaluate(image => image.decode());
          assert.match(await photo.getAttribute("src"), /ribbed-hero/);
          await full(page, `${locale}-390-reduced-ribbed`);
        }
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        await assertLayout(page, `${locale}-${width}-200pct`);
        if (width === 320) {
          const specs = await page.locator(".sample-spec").evaluate(element => {
            const photo = element.querySelector("img").getBoundingClientRect();
            const list = element.querySelector("dl").getBoundingClientRect();
            const rows = [...element.querySelectorAll("dl div")].map(row => {
              const label = row.querySelector("dt").getBoundingClientRect();
              const value = row.querySelector("dd").getBoundingClientRect();
              return value.top >= label.bottom && value.width >= list.width - 1;
            });
            return { imageAbove: photo.bottom <= list.top, fullWidth: list.width >= element.clientWidth - 1, rows };
          });
          assert.deepEqual(specs, { imageAbove: true, fullWidth: true, rows: [true, true, true] },
            `${locale}: specifications are cramped at 320 px and 200% text`);
          const select = await page.locator("#sample-finish").evaluate(element => {
            const style = getComputedStyle(element);
            const measure = document.createElement("canvas").getContext("2d");
            measure.font = `${style.fontSize} ${style.fontFamily}`;
            return {
              // Reserve room for the native dropdown arrow.
              available: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24,
              needed: Math.max(...[...element.options].map(option => measure.measureText(option.text).width)),
            };
          });
          assert.ok(select.available >= select.needed,
            `${locale}: material options may clip at 320 px and 200% text: ${JSON.stringify(select)}`);
          // Full-page screenshots this tall can wrap the GPU compositor surface.
          // Preserve native viewport PNGs of the start, form, and footer.
          for (const [area, selector] of [["top", ".prism-header"], ["sampling", "#sample-form"], ["footer", "footer"]]) {
            await page.locator(selector).evaluate(node => node.scrollIntoView({ block: "start" }));
            await capture(page, `${locale}-320-200pct-${area}`);
          }
        }
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }

    await withPage(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, async page => {
      await open(page, locale);
      assert.equal(await page.locator("[data-product]").count(), 3);
      assert.equal(await page.locator("details").count(), 3);
      assert.equal(await page.locator("noscript").isVisible(), true);
      assert.equal(await stage(page).locator("img").isVisible(), true);
      assert.equal(await page.locator("[data-builder]").isVisible(), false);
      await page.locator("details").last().locator("summary").click();
      assert.equal(await page.locator("details").last().locator("p").isVisible(), true);
      await full(page, `${locale}-390-no-js`);
    });
  }
  for (const [name, add] of [
    ["no-gpu", page => page.addInitScript(() => Object.defineProperty(Navigator.prototype, "gpu", { value: undefined }))],
    ["no-adapter", page => page.addInitScript(() => { GPU.prototype.requestAdapter = async () => null; })],
  ]) {
    await withPage(browser, { viewport: { width: 1100, height: 850 } }, async page => {
      const probe = await observe(page);
      await add(page);
      await open(page, "en");
      await phase(page, "unavailable");
      assert.equal(await stage(page).locator("canvas").isVisible(), false);
      assert.equal(await page.locator(selector).isDisabled(), true);
      await page.locator(".specimen-choices label").nth(1).click();
      assert.match(await stage(page).locator("img").getAttribute("src"), /satin-hero/);
      await full(page, `en-1100-${name}`);
      await probe.assertPrivate(site.origin, { fontPaths });
    });
  }
  evidence.checks.layout = "PASS two languages, 320/390/768/1440, 200% text, 44px controls, touch, no-JS, reduced motion, no GPU and rejected adapter";
}

async function checkCommerce(browser) {
  for (const locale of ["en", "zh-Hant"]) {
    const mobile = locale === "zh-Hant";
    const settings = { viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 960 },
      hasTouch: mobile, acceptDownloads: true, reducedMotion: "reduce" };
    await withPage(browser, settings, async page => {
      const probe = await observe(page);
      await open(page, locale);
      if (!mobile) {
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(".skip").evaluate(node => node === document.activeElement), true);
      }
      const select = page.locator("#sample-finish");
      const quantity = page.locator("#sample-quantity");
      const add = page.locator("[data-add]");
      const download = page.locator("[data-download]");
      const feedback = page.locator("[data-form-feedback]");
      assert.equal(await download.isDisabled(), true);

      const choose = page.locator("[data-select=satin]");
      if (mobile) await choose.tap();
      else {
        await choose.focus();
        await choose.press("Enter");
      }
      assert.equal(await select.inputValue(), "satin");
      assert.equal(await select.evaluate(node => node === document.activeElement), true);
      for (const invalid of ["", "0", "1.5", "21"]) {
        await quantity.fill(invalid);
        await add.click();
        assert.equal(await quantity.getAttribute("aria-invalid"), "true");
        assert.equal(await quantity.evaluate(node => node === document.activeElement), true);
        assert.equal(await download.isDisabled(), true);
        assert.ok((await feedback.textContent()).includes("20"));
      }

      await quantity.fill("2");
      await add.click();
      await quantity.fill("20");
      await add.click();
      assert.equal(await quantity.getAttribute("aria-invalid"), "true");
      assert.equal(await page.locator("[data-count]").textContent(), "2");
      await select.selectOption("ribbed");
      await quantity.fill("1");
      await add.click();
      await select.selectOption("clear");
      await quantity.fill("4");
      await add.click();
      await page.locator("[data-remove=clear]").click();
      assert.equal(await page.locator("[data-edit=ribbed]").evaluate(node => node === document.activeElement), true);
      await page.locator("[data-edit=satin]").click();
      assert.equal(await quantity.inputValue(), "2");
      assert.equal(await select.isDisabled(), true);
      await page.locator("[data-cancel-edit]").click();
      assert.equal(await page.locator("[data-edit=satin]").evaluate(node => node === document.activeElement), true);
      await page.locator("[data-edit=satin]").click();
      await quantity.fill("3");
      await add.click();
      assert.equal(await page.locator("[data-edit=satin]").evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator("[data-count]").textContent(), "4");
      const save = page.waitForEvent("download");
      await download.click();
      const file = await save;
      const filename = `prism-sample-brief-${locale}.txt`;
      assert.equal(file.suggestedFilename(), filename);
      await file.saveAs(resolve(dir, filename));
      const text = await readFile(resolve(dir, filename), "utf8");
      assert.match(text, /ST–02/);
      assert.match(text, /RB–03/);
      assert.doesNotMatch(text, /CL–01/);
      assert.match(text, mobile ? /樣板數量 · 3/ : /Sample quantity · 3/);
      assert.match(text, mobile ? /樣板數量 · 1/ : /Sample quantity · 1/);
      assert.match(text, /150 × 150 mm/);
      assert.match(text, mobile ? /尚未送出需求或安排寄送/ : /No request was sent and no delivery was arranged/);
      assert.ok(!text.includes("�"));
      evidence.downloads.push(filename);
      await capture(page, `${locale}-${settings.viewport.width}-selection`, page.locator(".sample-list"));
      await page.locator("[data-remove=satin]").click();
      await page.locator("[data-remove=ribbed]").click();
      assert.equal(await download.isDisabled(), true);
      assert.equal(await page.locator("#list-title").evaluate(node => node === document.activeElement), true);
      await probe.assertPrivate(site.origin, { fontPaths });
    });
  }
  evidence.checks.commerce = "PASS bilingual UTF-8 sample brief, catalog prefill, invalid quantities, quantity cap, add/edit/cancel/remove, empty state, touch and focus return";
}

async function waitForDraw(page, moreThan) {
  await page.waitForFunction(n => window.__visualProbe.textures > n, moreThan);
}

async function checkStill(page) {
  await page.waitForTimeout(200);
  const before = await counters(page);
  await page.waitForTimeout(550);
  assert.equal((await counters(page)).textures, before.textures, "Paused renderer continued acquiring textures");
}

async function setAngle(page, number) {
  const input = page.locator(selector);
  await input.evaluate(node => node.focus({ preventScroll: true }));
  assert.equal(await input.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press(number === 20 ? "End" : "Home");
  if (number === 0) {
    for (let step = 0; step < 20; step++) await page.keyboard.press("ArrowRight");
  }
  assert.equal(await input.inputValue(), String(number));
}

async function captureCycle(page, locale, label) {
  const scene = stage(page);
  await page.addInitScript(() => {
    const nativeRaf = window.requestAnimationFrame;
    const nativeTexture = GPUCanvasContext.prototype.getCurrentTexture;
    let tick;
    let lastTick;
    const presentations = window.__prismPresentations = [];
    window.requestAnimationFrame = callback => nativeRaf.call(window, time => {
      tick = time;
      try { callback(time); }
      finally { tick = undefined; }
    });
    GPUCanvasContext.prototype.getCurrentTexture = function () {
      const texture = nativeTexture.call(this);
      if (this.canvas.closest("[data-stage][data-rendered]") && tick !== undefined && tick !== lastTick) {
        // The pinned animatedTime clock advances by at most 100 ms per draw.
        // Count only presented rAF ticks and exclude the unobserved first delta.
        const deltaMs = lastTick === undefined ? 0 : Math.min(100, tick - lastTick);
        presentations.push({ epochMs: performance.timeOrigin + tick, deltaMs });
        lastTick = tick;
      }
      return texture;
    };
    const observer = new MutationObserver(records => {
      const stage = records.find(record => record.target.matches("[data-stage]"))?.target;
      if (stage?.hasAttribute("data-rendered")) {
        window.__prismVisibleAt = performance.timeOrigin + performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-rendered"] });
  });
  const session = await page.context().newCDPSession(page);
  const frames = [];
  let ackError;
  const onFrame = ({ data, metadata, sessionId }) => {
    if (Number.isFinite(metadata.timestamp)) {
      frames.push({ data, epochMs: metadata.timestamp * 1000 });
    }
    void session.send("Page.screencastFrameAck", { sessionId }).catch(error => { ackError = error; });
  };
  session.on("Page.screencastFrame", onFrame);
  await session.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  let clock, first, last, region;
  try {
    await open(page, locale);
    await phase(page, "running");
    clock = await page.evaluate(() => ({
      navigationEpochMs: performance.timeOrigin, visibleEpochMs: window.__prismVisibleAt,
    }));
    assert.ok(Number.isFinite(clock.visibleEpochMs));
    first = await counters(page);
    region = await scene.evaluate(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height, viewportWidth: innerWidth, viewportHeight: innerHeight };
    });
    await page.waitForFunction(() => {
      const ticks = window.__prismPresentations;
      return ticks.reduce((elapsed, tick) => elapsed + tick.deltaMs, 0) >= 13_000;
    }, null, { timeout: 95_000, polling: 300 });
    const firstLiveFrame = frames.find(frame => frame.epochMs >= clock.visibleEpochMs);
    const cycleReadyAt = Math.max(
      await page.evaluate(() => window.__prismPresentations.at(-1).epochMs),
      (firstLiveFrame?.epochMs ?? clock.visibleEpochMs) + 12_000,
    );
    const deadline = Date.now() + 15_000;
    while (!frames.some(frame => frame.epochMs >= cycleReadyAt) && Date.now() < deadline) {
      await delay(250);
    }
    assert.ok(frames.some(frame => frame.epochMs >= cycleReadyAt),
      `${label}: compositor did not deliver a frame after the measured shader cycle`);
    last = await counters(page);
  } finally {
    session.off("Page.screencastFrame", onFrame);
    await session.send("Page.stopScreencast");
    await session.detach();
  }
  if (ackError) throw ackError;
  frames.sort((a, b) => a.epochMs - b.epochMs);
  const live = frames.filter(frame => frame.epochMs >= clock.visibleEpochMs);
  assert.ok(live.length > 10, `${label}: Chromium sent only ${live.length} live screencast frames`);
  const origin = live[0].epochMs;
  const presentations = await page.evaluate(() => window.__prismPresentations);
  const save = async (frame, suffix) => {
    const file = `prism-${label}-${suffix}.png`;
    await writeFile(resolve(dir, file), Buffer.from(frame.data, "base64"));
    evidence.screenshots.push(file);
    const renderedMs = presentations.reduce((elapsed, tick) =>
      tick.epochMs > origin && tick.epochMs <= frame.epochMs ? elapsed + tick.deltaMs : elapsed, 0);
    return { file, epochMs: frame.epochMs, navigationMs: Math.round(frame.epochMs - clock.navigationEpochMs),
      liveMs: Math.round(frame.epochMs - origin), renderedMs: Math.round(renderedMs) };
  };
  const startup = [];
  for (const targetMs of [0, 250, 500, 1000]) {
    const target = clock.navigationEpochMs + targetMs;
    const frame = frames.find(frame => frame.epochMs >= target);
    if (frame) startup.push({ targetMs, ...await save(frame, `navigation-target-${targetMs}ms`) });
  }
  const natural = [];
  let comparison;
  for (const targetMs of [0, 250, 500, 1000, 2000, 4000, 6000, 8000, 12000, 16000, 20000, 24000]) {
    const frame = live.find(frame => frame.epochMs >= origin + targetMs);
    if (!frame) continue;
    natural.push({ targetMs, ...await save(frame, `natural-target-${targetMs}ms`) });
    if (targetMs === 4000) comparison = frame;
  }
  const cycleEnd = await save(live.at(-1), "natural-cycle-end");
  const measurement = evidence.measurements[label] = {
    clock, startup, natural, cycleEnd, compositorFrames: frames.length, liveFrames: live.length,
    textureAcquisitions: last.textures - first.textures,
  };
  assert.ok(natural.at(-1).liveMs >= 12_000 && comparison, `${label}: incomplete screencast`);
  assert.ok(cycleEnd.renderedMs >= 12_000, `${label}: screencast covered only ${cycleEnd.renderedMs} ms of shader animation`);
  assert.equal(await scene.getAttribute("data-motion"), "running");
  assert.ok(measurement.textureAcquisitions > 10, `${label}: shader stopped advancing during capture`);
  const variation = await difference(page, live[0].data, comparison.data, region);
  measurement.naturalVariation = variation;
  assert.ok(variation > 0.3, `Natural variation did not reach the original compositor for ${label}: ${variation}`);
}

async function checkOptics(browser) {
  for (const locale of ["en", "zh-Hant"]) {
    for (const width of [390, 1440]) {
      const height = width === 390 ? 844 : 960;
      const label = `${locale}-${width}`;
      const options = { viewport: { width, height }, hasTouch: width === 390, deviceScaleFactor: width === 390 ? 2 : 1 };
      await withPage(browser, options, async page => {
        const probe = await observe(page, { readPixels: true });
        await captureCycle(page, locale, label);
        await phase(page, "running");
        assert.equal(await stage(page).locator("canvas").isVisible(), true);
        const gpu = await page.evaluate(() => window.__visualProbe.readFrame());
        assert.ok(gpu.colors > 50 && gpu.average[3] > 250, JSON.stringify(gpu));
        const bounds = await stage(page).locator("canvas").boundingBox();
        Object.assign(evidence.measurements[label], { gpu, dpr: [gpu.width / bounds.width, gpu.height / bounds.height] });
        await capture(page, `${label}-webgpu-fold`);
        await full(page, `${label}-webgpu-full`);
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }

  for (const [locale, width] of [["en", 1440], ["zh-Hant", 390]]) {
    const mobile = width === 390;
    const label = `${locale}-${width}`;
    await withPage(browser, { viewport: { width, height: mobile ? 844 : 960 }, hasTouch: mobile }, async page => {
      const probe = await observe(page, { readPixels: true });
      await page.clock.install();
      await open(page, locale);
      await phase(page, "running");
      const scene = stage(page);
      await scene.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.evaluate(() => document.fonts.ready);
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 10_000);
      const specimenRegion = () => scene.evaluate(element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height, viewportWidth: innerWidth, viewportHeight: innerHeight };
      });
      const region = await specimenRegion();
      assert.ok(region.y >= 0 && region.y + region.height <= region.viewportHeight,
        `${label}: specimen must be entirely within the screenshot viewport`);
      const sampleControl = async name => {
        await scene.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
        const before = await counters(page);
        await page.clock.runFor(84);
        assert.ok((await counters(page)).textures > before.textures);
        await page.evaluate(() => window.__visualProbe.device.queue.onSubmittedWorkDone());
        assert.equal(await scene.getAttribute("data-motion"), "running");
        assert.deepEqual(await specimenRegion(), region, `${label}: specimen moved within the screenshot viewport`);
        return capture(page, `${label}-${name}`);
      };
      const angles = [];
      for (const [index, value] of [-20, 0, 20, -20].entries()) {
        await setAngle(page, value);
        angles.push(await sampleControl(`angle-${index + 1}-${value}`));
      }
      const angleDifference = await difference(page, angles[0], angles[2], region);
      const angleReturn = await difference(page, angles[0], angles[3], region);
      const controls = evidence.measurements[label].controls = { angleDifference, angleReturn, region };
      assert.ok(angleDifference > 1 && angleDifference > angleReturn, `Angle sweep absent: ${angleDifference} / return ${angleReturn}`);

      const materials = [];
      for (const value of ["clear", "satin", "ribbed", "clear"]) {
        const input = page.locator(`[name=specimen][value=${value}]`);
        await input.evaluate(element => element.click());
        assert.equal(await input.isChecked(), true);
        const suffix = materials.length === 3 ? "clear-return" : value;
        materials.push(await sampleControl(`material-${suffix}`));
      }
      controls.materialDifference = [
        await difference(page, materials[0], materials[1], region),
        await difference(page, materials[1], materials[2], region),
      ];
      assert.ok(controls.materialDifference.every(value => value > 0.5), `Surface controls absent: ${controls.materialDifference}`);
      assert.equal((await counters(page)).devices, 1);
      await probe.assertPrivate(site.origin, { fontPaths });
    });

    await withPage(browser, { viewport: { width, height: mobile ? 844 : 960 }, hasTouch: mobile }, async page => {
      const probe = await observe(page, { readPixels: true });
      await open(page, locale);
      await phase(page, "running");
      const scene = stage(page);
      await scene.scrollIntoViewIfNeeded();
      const pause = page.locator("[data-pause]");
      await pause.scrollIntoViewIfNeeded();
      await capture(page, `${label}-pause-before`, scene);
      await pause.click();
      await phase(page, "paused");
      const paused = await capture(page, `${label}-pause-at-click`, scene);
      assert.equal(await scene.locator("canvas").isVisible(), true);
      const box = await scene.boundingBox();
      await page.mouse.move(box.x + box.width * .62, box.y + box.height * .28);
      const initial = (await counters(page)).textures;
      await page.waitForTimeout(1000);
      const frozen = await capture(page, `${label}-pause-after-1s`, scene);
      const freezeDifference = await difference(page, paused, frozen);
      assert.equal(freezeDifference, 0);
      assert.equal((await counters(page)).textures, initial);
      await page.locator(selector).press("End");
      const queued = await capture(page, `${label}-pause-control-queued`, scene);
      assert.equal(await difference(page, paused, queued), 0, "Control update broke freeze");
      await pause.click();
      await phase(page, "running");
      await waitForDraw(page, initial + 1);
      const resumed = await capture(page, `${label}-resumed`, scene);
      const resumeDifference = await difference(page, frozen, resumed);
      assert.ok(resumeDifference > 0.5);

      Object.assign(evidence.measurements[label].controls, { freezeDifference, resumeDifference });
      await page.locator("footer").scrollIntoViewIfNeeded();
      await phase(page, "still");
      await checkStill(page);
      await scene.scrollIntoViewIfNeeded();
      await phase(page, "running");
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await phase(page, "still");
      await checkStill(page);
      await page.evaluate(() => {
        delete document.visibilityState;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await phase(page, "running");
      await page.evaluate(() => window.__visualProbe.loseDevice());
      await page.waitForFunction(() => window.__visualProbe.devices === 2);
      await phase(page, "running");
      const recovery = await page.evaluate(() => window.__visualProbe.readFrame());
      assert.ok(recovery.colors > 50);
      await capture(page, `${label}-device-recovered`, scene);

      // Standalone releases its composition and keeps the library-wide device
      // cache. Verify no presentation during pagehide, then a fresh canvas
      // configuration on pageshow without allocating a second active canvas.
      const beforeExit = await counters(page);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
      await phase(page, "still");
      assert.equal(await scene.locator("canvas").isVisible(), false);
      await checkStill(page);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
      await phase(page, "running");
      const afterReturn = await counters(page);
      assert.ok(afterReturn.configurations > beforeExit.configurations);
      assert.equal(afterReturn.devices, 2);
      assert.equal(await page.locator("canvas").count(), 1);
      await probe.assertPrivate(site.origin, { fontPaths });
    });
  }
  evidence.checks.optics = "PASS visible WebGPU, four bilingual viewport renders, timestamped natural compositor footage, angle return, three surfaces and a one-second unchanged pause with pointer and queued control";
  evidence.checks.lifecycle = "PASS offscreen, injected hidden, injected device loss followed by actual device destruction, and pagehide/pageshow composition teardown and restart on cached device";
  evidence.checks.privacy = "PASS local static GETs only, no telemetry, fetch/XHR/beacon/socket, storage, CSP or GPU validation errors";
}

let browser;
try {
  browser = await chromium.launch({ channel: "chromium", headless: true,
    args: ["--enable-unsafe-webgpu", "--disable-gpu-watchdog", "--enable-gpu", "--use-angle=d3d11-warp", "--use-webgpu-adapter=d3d11"],
  });
  evidence.browser = browser.version();
  const session = await browser.newBrowserCDPSession();
  const hardware = await session.send("SystemInfo.getInfo");
  evidence.measurements.renderer = hardware.gpu.devices.map(({ vendorString, deviceString }) => ({ vendorString, deviceString }));
  await session.detach();
  for (const check of [checkLayout, checkCommerce, checkOptics]) {
    try {
      await check(browser);
    } catch (error) {
      (evidence.failures ??= []).push({ check: check.name, error: error.stack });
    }
  }
  assert.ok(!evidence.failures, JSON.stringify(evidence.failures, null, 2));
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = error.stack;
  throw error;
} finally {
  await writeFile(resolve(dir, "results.json"), JSON.stringify(evidence, null, 2) + "\n");
  await browser?.close();
  await site.close();
}
