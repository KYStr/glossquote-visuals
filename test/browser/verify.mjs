import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import { base, root } from "../../scripts/site-map.mjs";
import { observe, pixelEvidence } from "./probe.mjs";
import { serveDist } from "./server.mjs";

if (process.platform !== "linux" || process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("NOT_RUN_USER_FOCUS_BOUNDARY: browser checks require a GitHub-hosted Linux runner");
}

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
const evidenceDir = resolve(root, ".runs/browser-evidence");
await mkdir(evidenceDir, { recursive: true });
const evidence = {
  commit, environment: "GitHub-hosted Ubuntu 24.04 VM", browser: null,
  checks: {}, measurements: {}, screenshots: [],
};
const site = await serveDist();
const url = (path = "") => site.origin + base + path;
const stage = (page) => page.locator("[data-stage]");
const work = "works/paper-light/";
const settings = (page) => page.locator("#light-angle");
const phase = (page, expected) => page.waitForFunction((value) =>
  document.querySelector("[data-stage]")?.dataset.motion === value, expected, { timeout: 35_000 });
const textureCount = (page) => page.evaluate(() => window.__visualProbe.textures);

async function open(page, path) {
  const response = await page.goto(url(path));
  assert.equal(response?.status(), 200, path);
  assert.equal(await page.locator("h1").count(), 1, path);
}

async function screenshot(page, name) {
  await page.screenshot({ path: resolve(evidenceDir, name), fullPage: true });
  evidence.screenshots.push(name);
}

async function layout(page) {
  for (const size of ["", "200%"]) {
    await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize; }, size);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${size || "100%"}: ${page.url()}`);
  }
  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
}

async function checkContrast(page) {
  const ratios = await page.evaluate(() => {
    const luminance = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number)
      .map((c) => c / 255)
      .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
    const rootBg = getComputedStyle(document.documentElement).backgroundColor;
    return [".paper-intro h1", ".paper-intro .paper-type", ".motion-status", "#angle-output", "[data-pause]"].map((selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      const bg = style.backgroundColor === "rgba(0, 0, 0, 0)" ? rootBg : style.backgroundColor;
      const pair = [luminance(bg), luminance(style.color)].sort((a, b) => b - a);
      return (pair[0] + 0.05) / (pair[1] + 0.05);
    });
  });
  assert.ok(ratios.every((ratio) => ratio >= 4.5), JSON.stringify(ratios));
  evidence.measurements.minCheckedContrast = Math.min(...ratios);
}

async function quiet(page) {
  await page.waitForTimeout(200);
  const before = await textureCount(page);
  await page.waitForTimeout(450);
  assert.equal(await textureCount(page), before, "A stopped canvas requested another presentation texture");
}

async function withPage(browser, options, run) {
  const context = await browser.newContext(options);
  try {
    const page = await context.newPage();
    await run(page);
  } finally {
    await context.close();
  }
}

async function checkLayouts(browser) {
  for (const width of [320, 390, 768, 1440]) {
    for (const lang of ["zh-Hant", "en"]) {
      const locale = lang === "en" ? "en/" : "";
      await withPage(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page);
        await open(page, locale);
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        assert.equal(await page.locator("canvas").count(), 0);
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(".skip").evaluate((link) => link === document.activeElement && getComputedStyle(link).clipPath === "none"), true);
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("main").evaluate((main) => main === document.activeElement), true);
        await layout(page);
        if (width === 1440) await screenshot(page, `gallery-${lang}-1440.png`);
        await page.locator(".exhibition-card").click();
        assert.equal(page.url(), url(locale + work));
        await phase(page, "reduced");
        await layout(page);
        assert.equal(await page.locator("canvas").count(), 1);
        assert.equal(await textureCount(page), 0);
        assert.equal(await page.evaluate(() => window.__visualProbe.devices), 0);
        assert.ok(!probe.requests.some(({ url }) => url.includes("/assets/shader-")));
        const targets = await page.locator(".light-actions button, .light-swatches span, #light-angle").evaluateAll((nodes) =>
          nodes.map((node) => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44));
        if (width === 390) {
          await page.locator('label:has([value="honey"])').tap();
          assert.equal(await stage(page).getAttribute("data-preset"), "honey");
        }
        await probe.assertPrivate(site.origin);
        if (width === 390) await screenshot(page, `paper-${lang}-390-still.png`);
      });
    }
  }
  evidence.checks.responsive = "PASS zh-Hant/en at 320, 390, 768 and 1440 CSS px, 200% text size, touch and no shader in reduced motion";
}

async function checkFallback(browser) {
  await withPage(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 800 } }, async (page) => {
    await open(page, work);
    assert.equal(await page.locator("noscript p").isVisible(), true);
    assert.equal(await stage(page).locator("img").isVisible(), true);
    assert.equal(await page.locator("[data-controls]").isVisible(), false);
    assert.equal(await page.locator(".paper-reading article").count(), 2);
  });
  for (const variant of ["unsupported", "no-adapter"]) {
    await withPage(browser, { viewport: { width: 1000, height: 800 } }, async (page) => {
      await page.addInitScript((variant) => {
        if (variant === "unsupported") Object.defineProperty(navigator, "gpu", { value: undefined });
        else Object.defineProperty(navigator.gpu, "requestAdapter", { value: async () => null });
      }, variant);
      const probe = await observe(page);
      await open(page, "en/" + work);
      await phase(page, "unavailable");
      await settings(page).focus();
      await settings(page).press("Home");
      assert.equal(await page.locator("#angle-output").textContent(), "0°");
      await settings(page).press("ArrowRight");
      assert.equal(await page.locator("#angle-output").textContent(), "1°");
      await settings(page).press("End");
      assert.equal(await page.locator("#angle-output").textContent(), "180°");
      assert.equal(await stage(page).evaluate((element) => element.style.getPropertyValue("--light-angle")), "180deg");
      await page.getByRole("button", { name: "Reset" }).click();
      assert.equal(await settings(page).inputValue(), "38");
      await probe.assertPrivate(site.origin);
    });
  }
  evidence.checks.fallback = "PASS no-JS HTML, unsupported WebGPU and rejected adapter with working CSS controls";
}

async function checkShader(browser) {
  await withPage(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, async (page) => {
    const probe = await observe(page, { readPixels: true });
    await open(page, "en/" + work);
    const adapter = await page.evaluate(async () => {
      const gpu = await navigator.gpu?.requestAdapter();
      if (!gpu) return null;
      return { vendor: gpu.info.vendor, architecture: gpu.info.architecture, fallback: gpu.info.isFallbackAdapter };
    });
    assert.ok(adapter, "No WebGPU adapter in the isolated runner");
    evidence.measurements.adapter = adapter;
    await phase(page, "running");
    await checkContrast(page);
    await page.waitForFunction(() => window.__visualProbe.textures >= 5);
    await screenshot(page, "paper-en-1440-webgpu.png");
    const firstTexture = await page.evaluate(() => window.__visualProbe.readFrame());
    const img = resolve(evidenceDir, "paper-en-webgpu-only.png");
    const first = await pixelEvidence(page, stage(page), img);
    evidence.screenshots.push("paper-en-webgpu-only.png");
    evidence.measurements.firstFrame = {
      texture: firstTexture, screenshot: first,
      gpuErrors: await page.evaluate(() => window.__visualProbe.gpuErrors),
    };
    assert.ok(firstTexture.colors > 20 && first.colors > 20,
      `WebGPU output lacks structure: ${JSON.stringify(evidence.measurements.firstFrame)}`);
    const start = performance.now();
    const before = await textureCount(page);
    await page.waitForTimeout(1200);
    const textures = await textureCount(page) - before;
    assert.ok(textures > 1, "No continuing WebGPU frames");
    evidence.measurements.textureAcquisitionsPerSecond = Number((textures * 1000 / (performance.now() - start)).toFixed(2));
    evidence.measurements.canvasDprAtDsf2 = await stage(page).locator("canvas").evaluate((canvas) =>
      Number((canvas.width / canvas.getBoundingClientRect().width).toFixed(3)));
    await settings(page).press("End");
    await page.locator('label:has([value="overcast"])').click();
    await page.waitForTimeout(200);
    const changed = await pixelEvidence(page, stage(page));
    const changedTexture = await page.evaluate(() => window.__visualProbe.readFrame());
    assert.ok(changed.colors > 20 && changedTexture.colors > 20 && changed.average.some((value, i) => Math.abs(value - first.average[i]) > 5));
    evidence.measurements.pixelSamples = { dawn: first, overcast: changed };

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Pause motion" }).click();
      await phase(page, "paused");
      await quiet(page);
      await page.getByRole("button", { name: "Resume motion" }).click();
      await phase(page, "running");
    }
    assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
    await page.getByRole("button", { name: "Reset" }).click();
    assert.equal(await settings(page).inputValue(), "38");
    assert.equal(await stage(page).getAttribute("data-preset"), "dawn");

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await phase(page, "still");
    await quiet(page);
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await phase(page, "running");

    const deviceCount = await page.evaluate(() => window.__visualProbe.devices);
    await page.evaluate(() => window.__visualProbe.loseDevice());
    await page.waitForFunction((count) => window.__visualProbe.devices > count, deviceCount, { timeout: 35_000 });
    await phase(page, "running");

    await page.setViewportSize({ width: 390, height: 540 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await screenshot(page, "paper-en-390-webgpu.png");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "still");
    await quiet(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await probe.assertPrivate(site.origin);

    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(page.url(), url(work));
    await phase(page, "running");
    await screenshot(page, "paper-zh-390-webgpu.png");
    await page.locator(".site-footer a").first().click();
    assert.equal(page.url(), url());
    await page.goBack({ waitUntil: "commit" });
    await phase(page, "running");
    await probe.assertPrivate(site.origin);
    evidence.measurements.requestPaths = [...new Set(probe.requests.map(({ url }) => new URL(url).pathname))].sort();
  });
  evidence.checks.webgpu = "PASS nonuniform WebGPU pixels, live input changes, recovery after injected unknown-loss signal and actual device destruction, pause/resume, hidden event, offscreen, return";
  evidence.checks.privacy = "PASS only static same-origin GETs, no fetch/XHR/beacon/socket, CSP violations, browser errors, cookies or storage";
}

let browser;
try {
  browser = await chromium.launch({
    channel: "chromium", headless: true,
    args: ["--enable-unsafe-webgpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-vulkan-surface"],
  });
  evidence.browser = browser.version();
  const session = await browser.newBrowserCDPSession();
  const info = await session.send("SystemInfo.getInfo");
  evidence.measurements.renderer = info.gpu.devices.map(({ vendorString, deviceString }) => ({ vendorString, deviceString }));
  await session.detach();
  for (const file of ["robots.txt", "sitemap.xml", "media/paper-light-share.jpg", "licenses/NOTICES.txt"]) {
    assert.equal((await fetch(url(file))).status, 200, file);
  }
  assert.equal((await fetch(url("no-such-exhibition/"))).status, 404);
  evidence.checks.http = "PASS Pages-style base, share image, notices, robots, sitemap and 404 from built artifact";
  await checkLayouts(browser);
  await checkFallback(browser);
  await checkShader(browser);
  evidence.result = "PASS";
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = error.stack;
  throw error;
} finally {
  await writeFile(resolve(evidenceDir, "results.json"), JSON.stringify(evidence, null, 2) + "\n");
  await browser?.close();
  await site.close();
}
