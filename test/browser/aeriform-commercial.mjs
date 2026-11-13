import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { base, root } from "../../scripts/site-map.mjs";
import { observe } from "./probe.mjs";
import { serveDist } from "./server.mjs";

if (process.platform !== "win32" || process.env.RUNNER_OS !== "Windows" ||
    process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("NOT_RUN_USER_FOCUS_BOUNDARY: browser checks require a GitHub-hosted Windows VM");
}
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
const evidenceDir = resolve(root, ".runs/aeriform-evidence");
await mkdir(evidenceDir, { recursive: true });
const site = await serveDist();
const lane = process.argv[2];
assert.ok(["en-desktop", "zh-mobile", "zh-desktop", "en-mobile", "commercial"].includes(lane));
const evidence = {
  commit, lane, environment: "GitHub-hosted Windows Server 2025 VM · headless Chromium D3D11 WARP",
  checks: {}, measurements: {}, screenshots: [], downloads: [],
};
const stage = (page) => page.locator("[data-stage]");
const fontPaths = [base + "fonts/aero-bricolage.woff2"];
const textures = (page) => page.evaluate(() => window.__visualProbe.textures);
const devices = (page) => page.evaluate(() => window.__visualProbe.devices);

async function open(page, lang) {
  const prefix = lang === "en" ? "en/" : "";
  const url = site.origin + base + prefix + "works/aeriform/";
  assert.equal((await page.goto(url))?.status(), 200);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  assert.equal(await page.locator("h1").count(), 1);
  await page.evaluate(() => document.fonts.ready);
}

async function withPage(browser, options, run) {
  const context = await browser.newContext(options);
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

async function snap(page, label, { clip, fullPage } = {}) {
  const filename = label + ".png";
  const png = await page.screenshot({ path: resolve(evidenceDir, filename), clip, fullPage, timeout: 45_000 });
  evidence.screenshots.push(filename);
  return createHash("sha256").update(png).digest("hex");
}

async function phase(page, target) {
  await page.waitForFunction((target) => document.querySelector("[data-stage]").dataset.motion === target,
    target, { timeout: 55_000 });
}

async function nextFrames(page, count = 3) {
  const previous = await textures(page);
  await page.waitForFunction((target) => window.__visualProbe.textures >= target,
    previous + count, { timeout: 45_000 });
}

async function quietWithPointer(page) {
  const before = await textures(page);
  await page.mouse.move(40, 160);
  await page.mouse.move(280, 175, { steps: 4 });
  await page.waitForTimeout(1000);
  assert.equal(await textures(page), before);
}

async function layout(page) {
  for (const zoom of ["100%", "200%"]) {
    const dimensions = await page.evaluate((zoom) => {
      document.documentElement.style.fontSize = zoom;
      const scroll = document.documentElement.scrollWidth;
      const outliers = scroll <= innerWidth + 1 ? [] : [...document.querySelectorAll("body *")]
        .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 24).map((element) => [element.tagName, element.className, element.parentElement.className,
          Math.round(element.getBoundingClientRect().right)]);
      return { scroll, width: innerWidth, outliers };
    }, zoom);
    assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify({ zoom, ...dimensions }));
  }
  await page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
}

async function texture(page, label) {
  const { png, ...stats } = await page.evaluate(() => window.__visualProbe.readFrame(true));
  assert.ok(stats.colors > 15, JSON.stringify(stats));
  const filename = label + "-texture.png";
  await writeFile(resolve(evidenceDir, filename), Buffer.from(png, "base64"));
  evidence.screenshots.push(filename);
  evidence.measurements[label] = stats;
}

async function responsiveAndBrief(browser) {
  for (const lang of ["en", "zh-Hant"]) {
    for (const width of [320, 390, 768, 1440]) {
      await withPage(browser, { viewport: { width, height: 844 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page);
        await open(page, lang);
        await phase(page, "reduced");
        await layout(page);
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(".skip").evaluate((node) => node === document.activeElement), true);
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("main").evaluate((node) => node === document.activeElement), true);
        assert.equal(await devices(page), 0);
        assert.equal(await textures(page), 0);
        assert.equal(await page.locator("canvas").count(), 1);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(shader|standalone)-/.test(url)));
        for (const button of await page.locator("[data-controls] button:visible").all()) {
          const box = await button.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44);
        }
        if (width === 390) {
          await page.locator('button[data-form="digital"]').tap();
          assert.equal(await stage(page).getAttribute("data-form"), "digital");
          assert.equal(await stage(page).locator('[data-still="digital"]').isVisible(), true);
          await page.locator('button[data-form="identity"]').tap();
          await snap(page, `aeriform-${lang}-390-reduced`, { fullPage: true });
          await brief(page, lang);
        }
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }
  for (const lang of ["en", "zh-Hant"]) {
    await withPage(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, async (page) => {
      await open(page, lang);
      assert.equal(await stage(page).locator('[data-still="identity"]').isVisible(), true);
      assert.equal(await page.locator(".case").count(), 3);
      assert.equal(await page.locator(".service-card").count(), 3);
      assert.equal(await page.locator(".faq-list details").count(), 4);
      assert.equal(await page.locator("[data-brief-form]").isVisible(), false);
      assert.equal(await page.locator("#brief noscript").isVisible(), true);
      await snap(page, `aeriform-${lang}-390-no-js`, { fullPage: true });
    });
  }
  for (const variant of ["unsupported", "no-adapter"]) {
    await withPage(browser, { viewport: { width: 1000, height: 850 } }, async (page) => {
      await page.addInitScript((variant) => {
        if (variant === "unsupported") Object.defineProperty(navigator, "gpu", { value: undefined });
        else Object.defineProperty(navigator.gpu, "requestAdapter", { value: async () => null });
      }, variant);
      const probe = await observe(page);
      await open(page, "en");
      await phase(page, "unavailable");
      assert.equal(await stage(page).locator('[data-still="identity"]').isVisible(), true);
      assert.equal(await stage(page).locator("canvas").isVisible(), false);
      assert.equal(await textures(page), 0);
      await probe.assertPrivate(site.origin, { fontPaths });
    });
  }
  evidence.checks.responsive = "PASS bilingual 320/390/768/1440, 100% and 200% text, skip/focus, 44px form selectors, touch and no GPU starts under reduced motion";
  evidence.checks.fallback = "PASS bilingual no JavaScript, unavailable navigator.gpu, denied adapter, and three still forms under reduced motion";
  evidence.checks.brief = "PASS real bilingual UTF-8 downloads, package presets, native required validation, deliverable validation, editing, and no send";
}

async function brief(page, lang) {
  const form = page.locator("[data-brief-form]");
  const review = page.locator("[data-review]");
  const submit = form.locator('button[type="submit"]');
  const service = form.locator('select[name="service"]');
  await submit.tap();
  assert.equal(await service.evaluate((input) => input === document.activeElement), true);
  await page.locator('[data-brief-service="motion"]').tap();
  assert.equal(await service.inputValue(), "motion");
  assert.equal(await form.locator('input[name="deliverable"]:visible').count(), 3);
  await form.locator('select[name="stage"]').selectOption("refresh");
  await form.locator('select[name="timing"]').selectOption("quarter");
  await submit.tap();
  assert.equal(await form.locator("[data-output-error]").isVisible(), true);
  const choice = form.locator('[value="motion-2"]');
  assert.equal(await form.locator('[value="motion-1"]').evaluate((input) => input === document.activeElement), true);
  await choice.check();
  await submit.focus();
  await page.keyboard.press("Enter");
  assert.equal(await review.locator("h3").evaluate((node) => node === document.activeElement), true);
  await review.locator("[data-edit]").tap();
  assert.equal(await service.evaluate((node) => node === document.activeElement), true);
  assert.equal(await choice.isChecked(), true);
  await form.locator('[value="motion-3"]').check();
  await submit.tap();
  const pendingDownload = page.waitForEvent("download");
  await review.locator("[data-download]").tap();
  const download = await pendingDownload;
  const name = `aeriform-project-brief-${lang}.txt`;
  assert.equal(download.suggestedFilename(), name);
  const path = resolve(evidenceDir, name);
  await download.saveAs(path);
  const bytes = await readFile(path);
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const entries = await review.locator("dl div").evaluateAll((rows) =>
    rows.map((row) => row.querySelector("dt").textContent + "\t" + row.querySelector("dd").textContent));
  for (const entry of entries) assert.ok(content.includes(entry), entry);
  assert.ok(content.includes(lang === "en" ? "Logo animation, Social templates" : "標誌動畫、社群範本"));
  assert.ok(content.includes(lang === "en" ? "This brief has not been sent" : "尚未聯絡工作室"));
  assert.equal(await review.locator("[role=status]").isVisible(), true);
  evidence.downloads.push({ name, bytes: bytes.length, entries });
  await snap(page, `aeriform-${lang}-390-brief-complete`);
}

async function gpu(browser, lang, width, inspect) {
  const stem = `aeriform-${lang}-${width}`;
  await withPage(browser, { viewport: { width, height: width === 390 ? 844 : 930 }, hasTouch: width === 390 }, async (page) => {
    const probe = await observe(page, { readPixels: true });
    await open(page, lang);
    await phase(page, "running");
    const runningAt = performance.now();
    const startingCount = await textures(page);
    const clip = await stage(page).boundingBox();
    if (inspect) {
      await snap(page, stem + "-formation-first-presented", { clip });
      await nextFrames(page, 20);
      await snap(page, stem + "-formation-after-20-acquisitions", { clip });
      evidence.measurements[stem + "-formation"] = {
        elapsedMs: Math.round(performance.now() - runningAt),
        acquisitions: await textures(page) - startingCount,
      };
    } else {
      await nextFrames(page, 26);
    }
    assert.equal(await stage(page).locator("canvas").isVisible(), true);
    assert.equal(await stage(page).locator('[data-still="identity"]').isVisible(), false);
    assert.equal(await page.locator("canvas").count(), 1);
    await snap(page, stem + "-webgpu-fold");
    await snap(page, stem + "-webgpu", { fullPage: true });
    await texture(page, stem + "-initial");
    if (inspect) {
      const t0 = performance.now();
      const timing = [];
      for (const second of [0, 2, 4, 6, 8, 10, 12, 14]) {
        const remaining = second * 1000 - (performance.now() - t0);
        if (remaining > 0) await page.waitForTimeout(remaining);
        const time = performance.now() - t0;
        await snap(page, stem + `-natural-${second}s`, { clip });
        timing.push({ targetMs: second * 1000, startedMs: Math.round(time), textures: await textures(page) });
      }
      evidence.measurements[stem + "-natural"] = timing;
      const settled = await snap(page, stem + "-settled", { clip });
      await page.mouse.move(clip.x + clip.width * 0.74, clip.y + clip.height * 0.5);
      await nextFrames(page, 12);
      const scattered = await snap(page, stem + "-pointer-scatter", { clip });
      assert.notEqual(scattered, settled);
      await page.mouse.move(10, 10);
      await nextFrames(page, 20);
      await snap(page, stem + "-pointer-regroup", { clip });

      const pause = page.locator("[data-pause]");
      await snap(page, stem + "-before-pause", { clip });
      await pause.click();
      await phase(page, "paused");
      assert.equal(await stage(page).locator("canvas").isVisible(), true);
      const frozen = await snap(page, stem + "-paused", { clip });
      await quietWithPointer(page);
      const held = await snap(page, stem + "-paused-held", { clip });
      assert.equal(held, frozen, "The presented paused artwork changed");
      await pause.click();
      await nextFrames(page, 12);
      assert.notEqual(await snap(page, stem + "-resumed", { clip }), frozen);

      for (const form of ["motion", "digital", "identity"]) {
        await page.locator(`button[data-form="${form}"]`).click();
        assert.equal(await stage(page).getAttribute("data-form"), form);
        await nextFrames(page, 45);
        await snap(page, stem + "-form-" + form, { clip });
        await texture(page, stem + "-form-" + form);
      }
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await phase(page, "still");
      await quietWithPointer(page);
      await page.evaluate(() => {
        delete document.visibilityState;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await phase(page, "running");
      await nextFrames(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await phase(page, "still");
      await quietWithPointer(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await phase(page, "running");
      await nextFrames(page);

      const beforeLoss = await devices(page);
      await page.evaluate(() => window.__visualProbe.loseDevice());
      await page.waitForFunction((previous) => window.__visualProbe.devices > previous, beforeLoss, { timeout: 45_000 });
      await phase(page, "running");
      await nextFrames(page);
      await texture(page, stem + "-recovered");
      const configurations = await page.evaluate(() => window.__visualProbe.configurations);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
      await phase(page, "still");
      assert.equal(await stage(page).locator("canvas").isVisible(), false);
      await quietWithPointer(page);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow")));
      await phase(page, "running");
      await nextFrames(page);
      assert.ok(await page.evaluate(() => window.__visualProbe.configurations) > configurations);
    }
    if (width === 390) {
      await page.locator("[data-pulse]").tap();
      await nextFrames(page, 4);
      await snap(page, stem + "-touch-scatter", { clip });
      await page.locator('button[data-form="motion"]').focus();
      await page.keyboard.press("Space");
      assert.equal(await stage(page).getAttribute("data-form"), "motion");
      await nextFrames(page, 16);
      await snap(page, stem + "-keyboard-motion", { clip });
    }
    const before = await textures(page);
    const start = performance.now();
    await page.waitForTimeout(1200);
    const elapsed = performance.now() - start;
    evidence.measurements[stem + "-presentations"] = {
      acquisitions: await textures(page) - before, elapsedMs: Math.round(elapsed),
      note: "getCurrentTexture acquisitions. This is not FPS.",
      devicePixelRatio: await stage(page).locator("canvas").evaluate((canvas) => canvas.width / canvas.getBoundingClientRect().width),
    };
    await probe.assertPrivate(site.origin, { fontPaths });
  });
}

let browser;
try {
  browser = await chromium.launch({
    channel: "chromium", headless: true,
    args: ["--enable-unsafe-webgpu", "--disable-gpu-watchdog", "--enable-gpu",
      "--use-angle=d3d11-warp", "--use-webgpu-adapter=d3d11"],
  });
  evidence.browser = browser.version();
  const cdp = await browser.newBrowserCDPSession();
  evidence.measurements.renderer = (await cdp.send("SystemInfo.getInfo")).gpu.devices
    .map(({ vendorString, deviceString }) => ({ vendorString, deviceString }));
  await cdp.detach();
  const scenarios = new Map([
    ["en-desktop", () => gpu(browser, "en", 1440, true)],
    ["zh-mobile", () => gpu(browser, "zh-Hant", 390, true)],
    ["zh-desktop", () => gpu(browser, "zh-Hant", 1440, false)],
    ["en-mobile", () => gpu(browser, "en", 390, false)],
    ["commercial", () => responsiveAndBrief(browser)],
  ]);
  await scenarios.get(lane)();
  if (lane !== "commercial") {
    evidence.checks.webgpu = "PASS live composition with non-empty WebGPU readback";
    if (lane === "en-desktop" || lane === "zh-mobile") {
      evidence.checks.lifecycle = "PASS exact presented pause frame, pointer-quiet pause/hidden/offscreen/pagehide, resumed rendering, actual device loss/recovery and page return";
    }
  }
  evidence.checks.privacy = "PASS same-origin GET only, CSP, no telemetry/network APIs, no storage and no cookies";
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = error.stack;
  throw error;
} finally {
  await writeFile(resolve(evidenceDir, "results.json"), JSON.stringify(evidence, null, 2) + "\n");
  await browser?.close();
  await site.close();
}
