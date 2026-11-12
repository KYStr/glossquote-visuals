import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import { base, isPublished, origin, registry, root, worksFor } from "../../scripts/site-map.mjs";
import { checkPaperCommercial } from "./paper-commercial.mjs";
import { observe, pixelEvidence } from "./probe.mjs";
import { serveDist } from "./server.mjs";

const windows = process.platform === "win32" && process.env.RUNNER_OS === "Windows";
const linux = process.platform === "linux" && process.env.RUNNER_OS === "Linux";
if ((!windows && !linux) || process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("NOT_RUN_USER_FOCUS_BOUNDARY: browser checks require a GitHub-hosted VM");
}

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
const evidenceDir = resolve(root, ".runs/browser-evidence");
await mkdir(evidenceDir, { recursive: true });
const evidence = {
  commit, environment: windows ? "GitHub-hosted Windows Server 2025 VM" : "GitHub-hosted Ubuntu 24.04 VM",
  display: windows ? "headless-d3d11-warp" : "headless-vulkan-swiftshader", browser: null,
  checks: {}, measurements: {}, screenshots: [],
};
const live = process.argv[2] === "--live";
const site = live ? { origin, close() {} } : await serveDist();
const url = (path = "") => site.origin + base + path;
const stage = (page) => page.locator("[data-stage]");
const work = "works/paper-light/";
const settings = (page) => page.locator("#light-angle");
const paperLightDetails = (page) => page.locator("[data-controls] details");
async function openPaperLightDetails(page) {
  const details = paperLightDetails(page);
  if (await details.getAttribute("open") === null) await details.locator("summary").click();
}
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

async function paperScreenshots(page, name) {
  await page.locator("main img").evaluateAll(async (images) => {
    for (const image of images) image.loading = "eager";
    await Promise.all(images.map((image) => image.decode()));
  });
  await page.screenshot({ path: resolve(evidenceDir, name + "-fold.png") });
  evidence.screenshots.push(name + "-fold.png");
  await screenshot(page, name + ".png");
}

async function layout(page) {
  for (const size of ["", "200%"]) {
    await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize; }, size);
    const overflow = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      if (scrollWidth <= innerWidth + 1) return null;
      const elements = [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8).map((element) => ({ name: element.tagName, id: element.id, class: element.getAttribute("class") }));
      return { viewport: innerWidth, scrollWidth, elements };
    });
    assert.equal(overflow, null, `Horizontal overflow at ${size || "100%"}: ${page.url()} ${JSON.stringify(overflow)}`);
  }
  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
}

async function checkContrast(page, selectors = [".paper-intro h1", ".paper-intro .paper-type", ".motion-status", "#angle-output", "[data-pause]"], metric = "minCheckedContrast") {
  const ratios = await page.evaluate((selectors) => {
    const luminance = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number)
      .map((c) => c / 255)
      .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
    const rootBg = getComputedStyle(document.documentElement).backgroundColor;
    return selectors.map((selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      const bg = style.backgroundColor === "rgba(0, 0, 0, 0)" ? rootBg : style.backgroundColor;
      const pair = [luminance(bg), luminance(style.color)].sort((a, b) => b - a);
      return (pair[0] + 0.05) / (pair[1] + 0.05);
    });
  }, selectors);
  assert.ok(ratios.every((ratio) => ratio >= 4.5), JSON.stringify(ratios));
  evidence.measurements[metric] = Math.min(...ratios);
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
        await page.locator(`.exhibition-card[href="${base}${locale}${work}"]`).click();
        assert.equal(page.url(), url(locale + work));
        await phase(page, "reduced");
        await layout(page);
        assert.equal(await page.locator("canvas").count(), 1);
        assert.equal(await textureCount(page), 0);
        assert.equal(await page.evaluate(() => window.__visualProbe.devices), 0);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(?:shader|standalone)-/.test(url)));
        await openPaperLightDetails(page);
        const targets = await page.locator(".light-actions button, .light-swatches span, #light-angle, [data-pause], [data-controls] summary").evaluateAll((nodes) =>
          nodes.map((node) => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44));
        if (width === 390) {
          await page.locator('label:has([value="honey"])').tap();
          assert.equal(await stage(page).getAttribute("data-preset"), "honey");
        }
        await paperLightDetails(page).locator("summary").click();
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
    assert.equal(await page.locator(".paper-plate noscript p").isVisible(), true);
    assert.equal(await page.locator("#quote noscript p").isVisible(), true);
    assert.equal(await stage(page).locator("img").isVisible(), true);
    assert.equal(await page.locator("[data-controls]").isVisible(), false);
    assert.equal(await page.locator(".collections article").count(), 3);
    assert.equal(await page.locator(".stock-list dt").count(), 3);
    assert.equal(await page.locator(".steps li").count(), 3);
    assert.equal(await page.locator(".faq-list details").count(), 4);
    assert.equal(await page.locator("[data-brief-form]").isVisible(), false);
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
      await openPaperLightDetails(page);
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
  let compositeOk = false;
  await withPage(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, async (page) => {
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
    await paperScreenshots(page, "paper-en-1440-webgpu");
    const img = resolve(evidenceDir, "paper-en-webgpu-only.png");
    const first = await pixelEvidence(page, stage(page), img);
    evidence.screenshots.push("paper-en-webgpu-only.png");
    evidence.measurements.firstFrame = {
      screenshot: first,
      gpuErrors: await page.evaluate(() => window.__visualProbe.gpuErrors),
      canvasCss: await stage(page).locator("canvas").evaluate((canvas) => {
        const style = getComputedStyle(canvas);
        return { opacity: style.opacity, visibility: style.visibility, display: style.display };
      }),
    };
    const { png, ...firstTexture } = await page.evaluate(() => window.__visualProbe.readFrame(true));
    await writeFile(resolve(evidenceDir, "paper-en-texture-readback.png"), Buffer.from(png, "base64"));
    evidence.screenshots.push("paper-en-texture-readback.png");
    evidence.measurements.firstFrame.texture = firstTexture;
    assert.ok(firstTexture.colors > 20, `WebGPU texture lacks structure: ${JSON.stringify(firstTexture)}`);
    evidence.checks.shaderTexture = "PASS real WebGPU texture has nonuniform pixels";
    const start = performance.now();
    const before = await textureCount(page);
    await page.waitForTimeout(1200);
    const textures = await textureCount(page) - before;
    assert.ok(textures > 1, "No continuing WebGPU frames");
    evidence.measurements.textureAcquisitionsPerSecond = Number((textures * 1000 / (performance.now() - start)).toFixed(2));
    evidence.measurements.pixelRatio = await stage(page).locator("canvas").evaluate((canvas) => ({
      deviceScaleFactor: window.devicePixelRatio,
      canvas: Number((canvas.width / canvas.getBoundingClientRect().width).toFixed(3)),
    }));
    const art = await stage(page).boundingBox();
    await page.mouse.move(art.x + art.width * 0.8, art.y + art.height / 2);
    await page.waitForFunction(() => Number(document.querySelector("#light-angle").value) === 144);
    await openPaperLightDetails(page);
    await settings(page).press("End");
    await page.locator('label:has([value="overcast"])').click();
    await page.waitForTimeout(200);
    const changed = await pixelEvidence(page, stage(page));
    const changedTexture = await page.evaluate(() => window.__visualProbe.readFrame());
    assert.ok(changedTexture.colors > 20 && changedTexture.average.some((value, i) => Math.abs(value - firstTexture.average[i]) > 5));
    compositeOk = first.colors > 20 && changed.colors > 20 &&
      changed.average.some((value, i) => Math.abs(value - first.average[i]) > 5);
    evidence.checks.compositing = compositeOk ? "PASS visible canvas changes with controls" : "FAIL compositor did not present the changing WebGPU texture";
    evidence.measurements.pixelSamples = { dawn: firstTexture, overcast: changedTexture, overcastComposite: changed };
    await stage(page).screenshot({ path: resolve(evidenceDir, "paper-en-overcast-surface.png") });
    evidence.screenshots.push("paper-en-overcast-surface.png");
    await paperLightDetails(page).locator("summary").click();

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Pause motion" }).click();
      await phase(page, "paused");
      await quiet(page);
      await page.getByRole("button", { name: "Resume motion" }).click();
      await phase(page, "running");
    }
    assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
    evidence.checks.pause = "PASS three pause/resume cycles without extra devices or texture acquisition while paused";
    await openPaperLightDetails(page);
    await page.getByRole("button", { name: "Reset" }).click();
    assert.equal(await settings(page).inputValue(), "38");
    assert.equal(await stage(page).getAttribute("data-preset"), "dawn");
    await paperLightDetails(page).locator("summary").click();

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
    evidence.checks.deviceRecovery = "PASS new WebGPU device after injected unknown loss and actual old device destruction";

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await paperScreenshots(page, "paper-en-390-webgpu");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "still");
    await quiet(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await probe.assertPrivate(site.origin);
    evidence.checks.visibility = "PASS no frame acquisition during injected hidden state and actual offscreen scroll";

    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(page.url(), url(work));
    await phase(page, "running");
    await paperScreenshots(page, "paper-zh-390-webgpu");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await paperScreenshots(page, "paper-zh-1440-webgpu");
    await page.locator(".site-footer a").first().click();
    assert.equal(page.url(), url());
    await page.goBack({ waitUntil: "commit" });
    assert.equal(page.url(), url(work));
    await stage(page).scrollIntoViewIfNeeded();
    await phase(page, "running");
    await probe.assertPrivate(site.origin);
    evidence.measurements.requestPaths = [...new Set(probe.requests.map(({ url }) => new URL(url).pathname))].sort();
  });
  evidence.checks.webgpu = "PASS nonuniform WebGPU pixels, live input changes, recovery after injected unknown-loss signal and actual device destruction, pause/resume, hidden event, offscreen, return";
  evidence.checks.privacy = "PASS only static same-origin GETs, no fetch/XHR/beacon/socket, CSP violations, browser errors, cookies or storage";
  assert.ok(compositeOk, "The browser compositor did not present the changing WebGPU texture");
}

async function checkLive(browser) {
  const receipt = await fetch(url(`release.json?sha=${commit}`), { signal: AbortSignal.timeout(15_000) });
  assert.equal(receipt.status, 200);
  const release = await receipt.json();
  assert.equal(release.commit, commit);
  const route = `works/${release.slug}/`;
  for (const work of registry.works.filter(isPublished)) {
    for (const prefix of ["", "en/"]) {
      assert.equal((await fetch(url(`${prefix}works/${work.slug}/`))).status, 200);
    }
  }
  for (const prefix of ["", "en/"]) {
    await withPage(browser, { viewport: { width: 1100, height: 850 } }, async (page) => {
      const probe = await observe(page);
      await open(page, prefix);
      await page.locator(`.exhibition-card[href="${base}${prefix}${route}"]`).click();
      assert.equal(page.url(), url(prefix + route));
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index, follow");
      assert.ok((await page.locator(".site-footer a").last().getAttribute("href")).endsWith(`/tree/${commit}`));
      const shareImage = await page.locator('meta[property="og:image"]').getAttribute("content");
      assert.ok(shareImage.startsWith(site.origin + base));
      assert.equal((await fetch(shareImage)).status, 200);
      await phase(page, "running");
      await page.waitForFunction(() => window.__visualProbe.textures > 3);
      const composite = await pixelEvidence(page, stage(page));
      assert.ok(composite.colors > 20, "The deployed shader did not appear on the page");
      await screenshot(page, `live-${prefix ? "en" : "zh-Hant"}.png`);
      await probe.assertPrivate(site.origin);
      await page.locator(".site-footer a").first().click();
      assert.equal(page.url(), url(prefix));
      await probe.assertPrivate(site.origin);
    });
  }
  evidence.checks.live = "PASS live HTTPS gallery, both localized works, visible WebGPU, source SHA, same-origin network and backlinks";
  evidence.measurements.deployed = release;
}

async function checkLiquid(browser) {
  const route = "works/liquid-archive/";
  const selectObject = (page, id) => page.locator(`label:has([value="${id}"])`);
  for (const width of [320, 390, 768, 1440]) {
    for (const prefix of ["", "en/"]) {
      await withPage(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page);
        await open(page, prefix);
        await page.locator(`.exhibition-card[href="${base}${prefix}${route}"]`).click();
        await phase(page, "reduced");
        await layout(page);
        assert.equal(await textureCount(page), 0);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(?:shader|standalone)-/.test(url)));
        const targets = await page.locator(".archive-choices span, .archive-motion button, #object-angle").evaluateAll((nodes) =>
          nodes.map((node) => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44));
        if (width === 390) {
          await selectObject(page, "arc").tap();
          assert.equal(await stage(page).getAttribute("data-object"), "arc");
          assert.match(await stage(page).locator("img").getAttribute("src"), /liquid-arc\.svg$/);
          assert.equal(await selectObject(page, "arc").locator("span").evaluate((label) =>
            getComputedStyle(label).textDecorationLine), "underline");
          await screenshot(page, `liquid-${prefix ? "en" : "zh-Hant"}-390-still.png`);
        }
        await probe.assertPrivate(site.origin);
      });
    }
  }
  await withPage(browser, { javaScriptEnabled: false }, async (page) => {
    await open(page, route);
    assert.ok(await page.locator("noscript p").isVisible());
    assert.ok(await stage(page).locator("img").isVisible());
    assert.equal(await page.locator("[data-object-description]").count(), 3);
  });
  await withPage(browser, {}, async (page) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "gpu", { value: undefined }));
    const probe = await observe(page);
    await open(page, "en/" + route);
    await phase(page, "unavailable");
    await page.locator('[value="ring"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await stage(page).getAttribute("data-object"), "orb");
    assert.match(await stage(page).locator("img").getAttribute("src"), /liquid-orb\.svg$/);
    assert.equal(await page.locator("[data-object-title]").textContent(), "Still orb");
    await page.locator("#object-angle").press("End");
    assert.equal(await page.locator("output").textContent(), "180°");
    await probe.assertPrivate(site.origin);
  });
  await withPage(browser, { viewport: { width: 1440, height: 920 } }, async (page) => {
    const probe = await observe(page, { readPixels: true });
    await open(page, "en/" + route);
    await phase(page, "running");
    await checkContrast(page, [
      ".archive-title h1", ".archive-context", ".archive-motion p", ".archive-choices input:checked + span", ".archive-motion button", "output",
    ], "liquidMinCheckedContrast");
    const objects = {};
    for (const object of ["ring", "orb", "arc"]) {
      await selectObject(page, object).click();
      assert.equal(await stage(page).getAttribute("data-object"), object);
      await stage(page).scrollIntoViewIfNeeded();
      const previous = await textureCount(page);
      await page.waitForFunction((count) => window.__visualProbe.textures > count + 4, previous);
      const texture = await page.evaluate(() => window.__visualProbe.readFrame());
      const visible = await pixelEvidence(page, stage(page), resolve(evidenceDir, `liquid-${object}-webgpu.png`));
      objects[object] = { texture, visible };
      evidence.screenshots.push(`liquid-${object}-webgpu.png`);
      assert.ok(texture.colors > 20 && visible.colors > 20, `Object ${object} did not render`);
    }
    evidence.measurements.liquidObjects = objects;
    assert.equal(new Set(Object.values(objects).map(({ texture }) => texture.average.join(","))).size, 3);
    await page.locator("#object-angle").press("Home");
    await stage(page).scrollIntoViewIfNeeded();
    const firstAngle = await textureCount(page);
    await page.waitForFunction((count) => window.__visualProbe.textures > count + 3, firstAngle);
    const start = await pixelEvidence(page, stage(page), resolve(evidenceDir, "liquid-arc-angle-0.png"));
    await page.locator("#object-angle").press("End");
    assert.equal(await page.locator("output").textContent(), "180°");
    await stage(page).scrollIntoViewIfNeeded();
    const finalAngle = await textureCount(page);
    await page.waitForFunction((count) => window.__visualProbe.textures > count + 3, finalAngle);
    const rotated = await pixelEvidence(page, stage(page), resolve(evidenceDir, "liquid-arc-angle-180.png"));
    evidence.screenshots.push("liquid-arc-angle-0.png", "liquid-arc-angle-180.png");
    evidence.measurements.liquidArcAngles = { start, rotated };
    assert.ok(start.brightCenter && rotated.brightCenter, "Arc must be visible at both angles");
    const shift = Math.hypot(...start.brightCenter.map((point, axis) => point - rotated.brightCenter[axis]));
    assert.ok(shift >= 1.5, `The visible arc did not rotate across its center: ${shift}`);
    const configurations = await page.evaluate(() => window.__visualProbe.configurations);
    await page.evaluate(() => {
      const controls = [...document.querySelectorAll('[name="object"]')];
      for (let i = 0; i < 20; i++) controls[i % controls.length].click();
    });
    assert.equal(await stage(page).getAttribute("data-object"), "orb");
    await stage(page).scrollIntoViewIfNeeded();
    await phase(page, "running");
    assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
    assert.equal(await page.evaluate(() => window.__visualProbe.configurations), configurations);
    assert.equal(await stage(page).locator("canvas").count(), 1);
    const before = await textureCount(page);
    const started = performance.now();
    await page.waitForTimeout(1200);
    evidence.measurements.liquidTextureAcquisitionsPerSecond = Number(((await textureCount(page) - before) * 1000 / (performance.now() - started)).toFixed(2));
    evidence.measurements.liquidPixelRatio = await stage(page).locator("canvas").evaluate((canvas) => canvas.width / canvas.getBoundingClientRect().width);
    await screenshot(page, "liquid-en-1440-webgpu.png");
    await page.getByRole("button", { name: "Pause motion" }).click();
    await phase(page, "paused");
    await quiet(page);
    await page.setViewportSize({ width: 390, height: 580 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "paused");
    await stage(page).scrollIntoViewIfNeeded();
    await phase(page, "paused");
    await quiet(page);
    await page.getByRole("button", { name: "Resume motion" }).click();
    await stage(page).scrollIntoViewIfNeeded();
    await phase(page, "running");
    await probe.assertPrivate(site.origin);
    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(page.url(), url(route));
    await phase(page, "running");
    await screenshot(page, "liquid-zh-Hant-390-webgpu.png");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "still");
    await quiet(page);
    await probe.assertPrivate(site.origin);
  });
  evidence.checks.liquid = "PASS bilingual four widths/200%/touch, no-JS and no-GPU, three visible WebGPU objects, rotation, 20 switches on one device, pause/offscreen and privacy";
}

async function checkSignal(browser) {
  const route = "works/night-signal/";
  const channel = (page, id) => page.locator(`label:has([value="${id}"])`);
  const intensity = (page) => page.locator("#signal-intensity");
  async function selected(page, id) {
    assert.equal(await stage(page).getAttribute("data-channel"), id);
    assert.equal(await page.locator("[data-channel-summary]").textContent(), await page.locator(`#program-${id}`).getAttribute("data-summary"));
    assert.equal(await channel(page, id).locator("span").evaluate((label) => getComputedStyle(label).textDecorationLine), "underline");
  }

  for (const width of [320, 390, 768, 1440]) {
    for (const prefix of ["", "en/"]) {
      await withPage(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page);
        await open(page, prefix);
        await page.locator(`.exhibition-card[href="${base}${prefix}${route}"]`).click();
        await phase(page, "reduced");
        await layout(page);
        const targets = await page.locator(".signal-choices span, .signal-motion button, .signal-side nav a, #signal-intensity")
          .evaluateAll((nodes) => nodes.map((node) => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([width, height]) => width >= 44 && height >= 44));
        assert.equal(await textureCount(page), 0);
        assert.equal(await page.evaluate(() => window.__visualProbe.devices), 0);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(?:shader|standalone)-/.test(url)));
        if (width === 390) {
          await channel(page, "echo").tap();
          await selected(page, "echo");
          assert.equal(await stage(page).evaluate((el) => getComputedStyle(el).getPropertyValue("--band-angle").trim()), "109deg");
          await screenshot(page, `signal-${prefix ? "en" : "zh-Hant"}-390-still.png`);
          await page.locator('a[href="#program-dawn"]').press("Enter");
          assert.equal(new URL(page.url()).hash, "#program-dawn");
          assert.equal(await page.locator("#program-dawn").evaluate((program) => program === document.activeElement), true);
        }
        await probe.assertPrivate(site.origin);
      });
    }
  }
  await withPage(browser, { javaScriptEnabled: false }, async (page) => {
    await open(page, route);
    assert.equal(await page.locator(".programs article").count(), 3);
    assert.equal(await page.locator("audio, video, iframe").count(), 0);
    assert.ok(await stage(page).locator("img").isVisible());
    assert.ok(await page.locator("noscript p").isVisible());
  });
  await withPage(browser, {}, async (page) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "gpu", { value: undefined }));
    const probe = await observe(page);
    await open(page, "en/" + route);
    await phase(page, "unavailable");
    await page.locator('[value="carrier"]').focus();
    await page.keyboard.press("ArrowRight");
    await selected(page, "echo");
    await intensity(page).press("Home");
    await intensity(page).press("ArrowLeft");
    assert.equal(await page.locator("output").textContent(), "15%");
    await intensity(page).press("End");
    await intensity(page).press("ArrowRight");
    assert.equal(await page.locator("output").textContent(), "65%");
    const opacity = await stage(page).evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--stripe-opacity")));
    assert.ok(Math.abs(opacity - 0.345) < 0.000001);
    await probe.assertPrivate(site.origin);
  });
  await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page) => {
    const probe = await observe(page, { readPixels: true });
    await open(page, "en/" + route);
    await phase(page, "running");
    await checkContrast(page, [
      ".signal-head h1", ".signal-head h1 span", ".signal-summary", ".signal-choices input:checked + span", ".signal-motion button", "output",
    ], "signalMinCheckedContrast");
    const captures = {};
    async function nextFrame() {
      await stage(page).scrollIntoViewIfNeeded();
      const frames = await textureCount(page);
      await page.waitForFunction((previous) => window.__visualProbe.textures > previous + 3, frames);
    }
    for (const id of ["carrier", "echo", "dawn"]) {
      await channel(page, id).click();
      await selected(page, id);
      await nextFrame();
      const texture = await page.evaluate(() => window.__visualProbe.readFrame());
      const name = `signal-${id}-webgpu.png`;
      const visible = await pixelEvidence(page, stage(page), resolve(evidenceDir, name));
      assert.ok(texture.colors > 20 && visible.colors > 20, `Channel ${id} was not visible`);
      evidence.screenshots.push(name);
      captures[id] = { texture, visible };
    }
    assert.equal(new Set(Object.values(captures).map(({ visible }) => visible.average.join(","))).size, 3);
    evidence.measurements.signalChannels = captures;
    await intensity(page).press("Home");
    await nextFrame();
    const low = await pixelEvidence(page, stage(page), resolve(evidenceDir, "signal-intensity-15.png"));
    await intensity(page).press("End");
    assert.equal(await page.locator("output").textContent(), "65%");
    await nextFrame();
    const high = await pixelEvidence(page, stage(page), resolve(evidenceDir, "signal-intensity-65.png"));
    assert.ok(high.average.reduce((sum, value) => sum + value, 0) > low.average.reduce((sum, value) => sum + value, 0));
    evidence.screenshots.push("signal-intensity-15.png", "signal-intensity-65.png");
    evidence.measurements.signalIntensity = { low, high };
    const configurations = await page.evaluate(() => window.__visualProbe.configurations);
    await page.evaluate(() => {
      const controls = [...document.querySelectorAll('[name="channel"]')];
      for (let i = 0; i < 18; i++) controls[i % controls.length].click();
    });
    await selected(page, "dawn");
    await nextFrame();
    assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
    assert.equal(await page.evaluate(() => window.__visualProbe.configurations), configurations);
    assert.equal(await stage(page).locator("canvas").count(), 1);
    const started = performance.now();
    const frames = await textureCount(page);
    await page.waitForTimeout(1200);
    evidence.measurements.signalTextureAcquisitionsPerSecond = Number(((await textureCount(page) - frames) * 1000 / (performance.now() - started)).toFixed(2));
    evidence.measurements.signalPixelRatio = await stage(page).locator("canvas").evaluate((canvas) => canvas.width / canvas.getBoundingClientRect().width);
    await screenshot(page, "signal-en-1440-webgpu.png");
    await page.getByRole("button", { name: "Pause motion" }).click();
    await phase(page, "paused");
    await quiet(page);
    await page.getByRole("button", { name: "Resume motion" }).click();
    await stage(page).scrollIntoViewIfNeeded();
    await phase(page, "running");
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
    await probe.assertPrivate(site.origin);
    await page.setViewportSize({ width: 390, height: 580 });
    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(page.url(), url(route));
    await phase(page, "running");
    await screenshot(page, "signal-zh-Hant-390-webgpu.png");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "still");
    await quiet(page);
    await probe.assertPrivate(site.origin);
  });
  evidence.checks.signal = "PASS bilingual program links, layout/200%, keyboard/touch, all three visible WebGPU channels, bounded intensity, 18 switches on one device, fallback, pause/visibility and privacy";
}

let browser;
try {
  browser = await chromium.launch({
    channel: "chromium", headless: true,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
    args: [
      "--enable-unsafe-webgpu", "--disable-gpu-watchdog",
      ...(windows ? ["--enable-gpu", "--use-angle=d3d11-warp", "--use-webgpu-adapter=d3d11"] : [
        "--enable-unsafe-swiftshader", "--enable-features=Vulkan", "--use-angle=swiftshader",
        "--use-vulkan=swiftshader", "--use-webgpu-adapter=swiftshader", "--disable-vulkan-surface",
      ]),
    ],
  });
  evidence.browser = browser.version();
  const session = await browser.newBrowserCDPSession();
  const info = await session.send("SystemInfo.getInfo");
  evidence.measurements.renderer = info.gpu.devices.map(({ vendorString, deviceString }) => ({ vendorString, deviceString }));
  evidence.measurements.browserFeatures = info.gpu.featureStatus;
  await session.detach();
  for (const file of ["robots.txt", "sitemap.xml", "media/paper-light-share.jpg", "media/paper-commercial-share.jpg", "licenses/NOTICES.txt"]) {
    assert.equal((await fetch(url(file))).status, 200, file);
  }
  assert.equal((await fetch(url("no-such-exhibition/"))).status, 404);
  evidence.checks.http = live
    ? "PASS live HTTPS share image, notices, robots, sitemap and 404"
    : "PASS Pages-style base, share image, notices, robots, sitemap and 404 from built artifact";
  if (live) {
    await checkLive(browser);
  } else {
    await checkLayouts(browser);
    await checkFallback(browser);
    await checkPaperCommercial({ browser, withPage, open, screenshot, site, work });
    evidence.checks.paperCommercial = "PASS bilingual series prefill, touch, validation, keyboard focus, review and edit, and exact local download with privacy";
    await withPage(browser, {}, async (page) => {
      await open(page, "404.html");
      evidence.measurements.gpuBufferSmoke = await page.evaluate(async () => {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) throw new Error("No isolated WebGPU adapter");
        const device = await adapter.requestDevice();
        const upload = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_SRC, mappedAtCreation: true });
        const read = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        try {
          new Uint32Array(upload.getMappedRange())[0] = 0x1234abcd;
          upload.unmap();
          const encoder = device.createCommandEncoder();
          encoder.copyBufferToBuffer(upload, 0, read, 0, 4);
          device.queue.submit([encoder.finish()]);
          await read.mapAsync(GPUMapMode.READ);
          return { vendor: adapter.info.vendor, architecture: adapter.info.architecture, value: new Uint32Array(read.getMappedRange())[0] };
        } finally {
          upload.destroy();
          read.destroy();
          device.destroy();
        }
      });
      assert.equal(evidence.measurements.gpuBufferSmoke.value, 0x1234abcd);
    });
    await checkShader(browser);
    if (worksFor("candidate").some(({ id }) => id === "V002")) await checkLiquid(browser);
    if (worksFor("candidate").some(({ id }) => id === "V003")) await checkSignal(browser);
  }
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
