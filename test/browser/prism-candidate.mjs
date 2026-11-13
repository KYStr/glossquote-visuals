import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
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

async function difference(page, a, b) {
  return page.evaluate(async ([first, second]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 80;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const images = await Promise.all([first, second].map(async encoded => {
      const bytes = Uint8Array.from(atob(encoded), value => value.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }));
    let total = 0;
    for (let index = 0; index < images[0].length; index++) {
      total += Math.abs(images[0][index] - images[1][index]);
    }
    return total / images[0].length;
  }, [a, b]);
}

async function assertLayout(page) {
  const controls = await page.locator("a.button, nav a, select, #sample-quantity, button, summary").evaluateAll(nodes =>
    nodes.filter(node => node.getClientRects().length).map(node => ({
      width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
      text: node.textContent.trim(),
    })));
  for (const { width, height, text } of controls) assert.ok(width >= 44 && height >= 44, `Small target ${text}: ${width}×${height}`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "Horizontal overflow");
}

async function checkLayout(browser) {
  for (const locale of ["en", "zh-Hant"]) {
    for (const width of [320, 390, 768, 1440]) {
      const height = width >= 768 ? 960 : 844;
      await withPage(browser, { viewport: { width, height }, hasTouch: width < 768, reducedMotion: "reduce" }, async page => {
        const probe = await observe(page);
        await open(page, locale);
        await phase(page, "reduced");
        await assertLayout(page);
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
        await assertLayout(page);
        if (width === 320) await full(page, `${locale}-320-200pct`);
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
  await input.focus();
  await input.press(number === -20 ? "Home" : number === 20 ? "End" : "Home");
  if (number === 0) {
    for (let step = 0; step < 20; step++) await input.press("ArrowRight");
  }
  assert.equal(await input.inputValue(), String(number));
  await waitForDraw(page, (await counters(page)).textures + 1);
}

async function captureCycle(page, label) {
  const scene = stage(page);
  await scene.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__visualProbe.textures > 3);
  const start = performance.now();
  const times = [];
  const frames = [];
  for (const second of [0, 2, 4, 6, 8, 12]) {
    const remainder = second * 1000 - (performance.now() - start);
    if (remainder > 0) await page.waitForTimeout(remainder);
    const before = performance.now() - start;
    frames.push(await capture(page, `${label}-natural-${second}s`, scene));
    times.push({ targetSeconds: second, screenshotRequestedMs: Math.round(before),
      screenshotReturnedMs: Math.round(performance.now() - start) });
  }
  const variation = await difference(page, frames[0], frames[2]);
  assert.ok(variation > 0.3, `Natural variation did not reach the original compositor for ${label}: ${variation}`);
  evidence.measurements[label] = { ...evidence.measurements[label], natural: times, naturalVariation: variation };
}

async function checkOptics(browser) {
  for (const locale of ["en", "zh-Hant"]) {
    for (const width of [390, 1440]) {
      const height = width === 390 ? 844 : 960;
      const label = `${locale}-${width}`;
      const options = { viewport: { width, height }, hasTouch: width === 390, deviceScaleFactor: width === 390 ? 2 : 1 };
      await withPage(browser, options, async page => {
        const probe = await observe(page, { readPixels: true });
        await open(page, locale);
        await phase(page, "running");
        assert.equal(await stage(page).locator("canvas").isVisible(), true);
        const gpu = await page.evaluate(() => window.__visualProbe.readFrame());
        assert.ok(gpu.colors > 50 && gpu.average[3] > 250, JSON.stringify(gpu));
        const bounds = await stage(page).locator("canvas").boundingBox();
        evidence.measurements[label] = { gpu, dpr: [gpu.width / bounds.width, gpu.height / bounds.height] };
        await full(page, `${label}-webgpu-full`);
        await captureCycle(page, label);
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }

  for (const [locale, width] of [["en", 1440], ["zh-Hant", 390]]) {
    const mobile = width === 390;
    const label = `${locale}-${width}`;
    await withPage(browser, { viewport: { width, height: mobile ? 844 : 960 }, hasTouch: mobile }, async page => {
      const probe = await observe(page, { readPixels: true });
      await open(page, locale);
      await phase(page, "running");
      const scene = stage(page);
      const angles = [];
      for (const [index, value] of [-20, 0, 20, -20].entries()) {
        await setAngle(page, value);
        angles.push(await capture(page, `${label}-angle-${index + 1}-${value}`, scene));
      }
      const angleDifference = await difference(page, angles[0], angles[2]);
      const angleReturn = await difference(page, angles[0], angles[3]);
      assert.ok(angleDifference > 1 && angleDifference > angleReturn, `Angle sweep absent: ${angleDifference} / return ${angleReturn}`);

      const materials = [];
      for (const value of ["clear", "satin", "ribbed", "clear"]) {
        const control = page.locator(`.specimen-choices label:has([value=${value}])`);
        if (mobile) await control.tap();
        else await control.click();
        await waitForDraw(page, (await counters(page)).textures + 1);
        const suffix = materials.length === 3 ? "clear-return" : value;
        materials.push(await capture(page, `${label}-material-${suffix}`, scene));
      }
      const materialDifference = [await difference(page, materials[0], materials[1]), await difference(page, materials[1], materials[2])];
      assert.ok(materialDifference.every(value => value > 0.5), `Surface controls absent: ${materialDifference}`);
      assert.equal((await counters(page)).devices, 1);

      const pause = page.locator("[data-pause]");
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

      // Simulate the page lifecycle against the original document and actual SDK resources.
      await page.evaluate(() => {
        const probe = window.__visualProbe;
        probe.previousDevice = probe.device;
        window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      });
      await phase(page, "still");
      await page.waitForFunction(async () => (await window.__visualProbe.previousDevice.lost).reason === "destroyed");
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
      await phase(page, "running");
      assert.equal((await counters(page)).devices, 3);
      await probe.assertPrivate(site.origin, { fontPaths });
      evidence.measurements[label].controls = { angleDifference, angleReturn, materialDifference, freezeDifference, resumeDifference };
    });
  }
  evidence.checks.optics = "PASS visible WebGPU, four bilingual viewport renders, natural 12-second cycles, angle return, three surfaces and a one-second unchanged pause with pointer and queued control";
  evidence.checks.lifecycle = "PASS offscreen, injected hidden, injected device loss followed by actual device destruction, and pagehide/pageshow resource teardown and restart";
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
  await checkOptics(browser);
  await checkLayout(browser);
  await checkCommerce(browser);
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
