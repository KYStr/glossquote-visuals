import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import { base, isPublished, origin, registry, releaseWorkIds, root, worksFor } from "../../scripts/site-map.mjs";
import { verifyReleaseReceipt } from "../../scripts/release-proof.mjs";
import { checkPaperCommercial } from "./paper-commercial.mjs";
import { checkPaperMaterial } from "./paper-material.mjs";
import { observe, pixelEvidence } from "./probe.mjs";
import { serveDist } from "./server.mjs";
import { checkSignal, signalFontPaths } from "./signal-commercial.mjs";

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
const paperOnly = process.argv[2] === "--paper-material";
if (paperOnly && !windows) throw new Error("Paper material validation requires the GitHub-hosted Windows runner");
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

async function paperSurface(page, name) {
  const clip = await stage(page).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
  });
  const png = await page.screenshot({ path: resolve(evidenceDir, name), clip, timeout: 10_000 });
  evidence.screenshots.push(name);
  return png.toString("base64");
}

async function paperLightDifference(page, before, after) {
  return page.evaluate(async (images) => {
    const width = 36;
    const height = 24;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const frames = [];
    for (const encoded of images) {
      const data = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: "image/png" }));
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      frames.push(context.getImageData(0, 0, width, height).data);
    }
    let distance = 0;
    for (let pixel = 0; pixel < frames[0].length; pixel += 4) {
      for (let channel = 0; channel < 3; channel++) {
        distance += Math.abs(frames[0][pixel + channel] - frames[1][pixel + channel]);
      }
    }
    return distance / (width * height * 3);
  }, [before, after]);
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
        if (width === 768) {
          const captionLines = await page.locator(".paper-plate figcaption").evaluate((caption) => {
            const style = getComputedStyle(caption);
            const padding = parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd);
            return (caption.getBoundingClientRect().height - padding) / parseFloat(style.lineHeight);
          });
          assert.ok(captionLines < 2.1, "The tablet photo caption should fit within two lines");
          const fits = await page.locator("#finish").evaluate((select) => {
            const style = getComputedStyle(select);
            const context = document.createElement("canvas").getContext("2d");
            context.font = style.font;
            const widest = Math.max(...[...select.options].map((option) => context.measureText(option.textContent).width));
            return widest < select.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd) - 20;
          });
          assert.ok(fits, "Paper finish labels are clipped at the tablet width");
          await page.evaluate(() => window.scrollTo(0, 0));
          await paperScreenshots(page, `paper-${lang}-768-still`);
        }
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
      assert.equal(await settings(page).inputValue(), "151");
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
    const paperBefore = await paperSurface(page, "paper-en-dawn-surface.png");
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
    await page.mouse.move(art.x + art.width * 0.2, art.y + art.height / 2);
    await page.waitForFunction(() => Number(document.querySelector("#light-angle").value) === 36);
    const beforePointerFrames = await textureCount(page);
    await page.waitForFunction((frames) => window.__visualProbe.textures >= frames + 2, beforePointerFrames);
    const paperAtAngle = await paperSurface(page, "paper-en-angle-surface.png");
    await openPaperLightDetails(page);
    await settings(page).press("End");
    await page.locator('label:has([value="overcast"])').click();
    await page.waitForTimeout(200);
    const changed = await pixelEvidence(page, stage(page));
    const changedTexture = await page.evaluate(() => window.__visualProbe.readFrame());
    assert.ok(changedTexture.colors > 20 && changedTexture.average.some((value, i) => Math.abs(value - firstTexture.average[i]) > 3));
    compositeOk = first.colors > 20 && changed.colors > 20;
    evidence.checks.compositing = compositeOk ? "PASS visible canvas changes with controls" : "FAIL compositor did not present the changing WebGPU texture";
    evidence.measurements.pixelSamples = { dawn: firstTexture, overcast: changedTexture, overcastComposite: changed };
    const paperOvercast = await paperSurface(page, "paper-en-overcast-surface.png");
    const pointerDifference = await paperLightDifference(page, paperBefore, paperAtAngle);
    const presetDifference = await paperLightDifference(page, paperBefore, paperOvercast);
    evidence.measurements.paperSurfaceDifference = { pointer: pointerDifference, preset: presetDifference };
    assert.ok(pointerDifference > 0.65 && presetDifference > 3, "Actual paper composition did not change with angle and light preset");
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
    assert.equal(await settings(page).inputValue(), "151");
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

async function livePixelDifference(page, before, after) {
  return page.evaluate(async ([before, after]) => {
    const width = 80;
    const height = 60;
    const pixels = async (encoded) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return context.getImageData(0, 0, width, height).data;
    };
    const a = await pixels(before);
    const b = await pixels(after);
    let total = 0;
    let changedPixels = 0;
    let peak = 0;
    for (let pixel = 0; pixel < a.length; pixel += 4) {
      const channels = [0, 1, 2].map((channel) => Math.abs(a[pixel + channel] - b[pixel + channel]));
      const delta = Math.max(...channels);
      total += channels.reduce((sum, channel) => sum + channel, 0);
      if (delta > 10) changedPixels++;
      peak = Math.max(peak, delta);
    }
    return { mean: total / (width * height * 3), changedPixels, peak, width, height };
  }, [before.toString("base64"), after.toString("base64")]);
}

async function checkLiveComposite(page, slug, locale, isolatedOutput) {
  const controls = {
    "paper-light": { selector: "#light-angle", values: ["0", "180"], surface: "[data-stage]" },
    "liquid-archive": { selector: "#object-angle", values: ["0", "180"], surface: ".hero-visual" },
    // The commercial event site uses program radios, not the former amplitude slider.
    "night-signal": { selector: 'input[name="program"]', values: ["carrier", "echo"], surface: "[data-stage]" },
    "prism-materials": { selector: "#prism-angle", values: ["-20", "20"], surface: "[data-stage]" },
    "aeriform": { selector: "button[data-form]", values: ["identity", "motion"], surface: "[data-stage]",
      kind: "particle-form", settleMs: 1000, evolving: true },
  };
  const control = controls[slug];
  assert.ok(control, `No live composite control defined for ${slug}`);
  const stem = `${live ? "live" : "candidate"}-${slug}-${locale}`;
  const surface = page.locator(control.surface);
  const captured = {};
  const files = {};
  const measurement = { control: control.selector, values: control.values, intervalMs: 100,
    sequence: ["a0", "a1", "b", "a2"], comparisons: {}, files, textures: {}, isolatedOutput };
  if (control.evolving) measurement.simulation = {
    settleMs: control.settleMs,
    note: "Evolving particles are allowed to keep distinct positions after a form is restored; shape return requires independent temporal review, not pixel identity.",
  };
  evidence.measurements.compositeControls ??= {};
  evidence.measurements.compositeControls[stem] = measurement;
  const capture = async (label) => {
    // page.screenshot with an explicit clip needs no locator stability rAF while the clock is paused.
    const clip = await surface.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
    });
    const file = `${stem}-composite-${label}.png`;
    const png = await page.screenshot({ path: resolve(evidenceDir, file), clip });
    evidence.screenshots.push(file);
    files[label] = file;
    return png;
  };
  const setControl = async (value) => {
    if (control.kind === "particle-form") {
      const button = page.locator(`${control.selector}[data-form="${value}"]`);
      await button.evaluate((element) => element.click());
      assert.equal(await stage(page).getAttribute("data-form"), value);
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      // Let the simulation approach its new SDF before requesting a GPU readback.
      await page.clock.runFor(control.settleMs);
      await page.evaluate(() => window.__visualProbe.device.queue.onSubmittedWorkDone());
    } else if (slug === "night-signal") {
      await page.locator(`${control.selector}[value="${value}"]`).evaluate((input) => input.click());
      assert.equal(await stage(page).getAttribute("data-channel"), value);
      assert.equal(await page.locator(`${control.selector}[value="${value}"]`).isChecked(), true);
    } else {
      await page.locator(control.selector).evaluate((input, value) => {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
      assert.equal(await page.locator(control.selector).inputValue(), value);
    }
  };
  const sample = async (label) => {
    if (slug === "night-signal" && (label === "b" || label === "a2")) {
      // The continuous morph takes 940ms. Sample the new material after the morph.
      await page.clock.runFor(1000);
    }
    const before = await textureCount(page);
    // Both the actual composite and independent GPU frame are recorded. The latter
    // prevents a program's CSS background/filter change from impersonating shader control.
    await page.evaluate(() => { window.__liveFrame = window.__visualProbe.readFrame(true); });
    await page.clock.runFor(100);
    assert.ok(await textureCount(page) > before, `${stem}: no frame during the controlled interval`);
    // The probe's own timeout uses the paused page clock; retain a real-time
    // deadline so failed GPU readback still writes results instead of hanging CI.
    let readbackTimeout;
    let frame;
    try {
      frame = await Promise.race([
        page.evaluate(async () => {
          const frame = await window.__liveFrame;
          await window.__visualProbe.device.queue.onSubmittedWorkDone();
          return frame;
        }),
        new Promise((_, reject) => {
          readbackTimeout = setTimeout(() => reject(new Error(`${stem}: GPU readback timed out`)), 15_000);
        }),
      ]);
    } finally {
      clearTimeout(readbackTimeout);
    }
    const { png, ...texture } = frame;
    assert.equal(await stage(page).getAttribute("data-motion"), "running");
    const textureFile = `${stem}-texture-${label}.png`;
    const texturePng = Buffer.from(png, "base64");
    await writeFile(resolve(evidenceDir, textureFile), texturePng);
    evidence.screenshots.push(textureFile);
    files[`texture-${label}`] = textureFile;
    measurement.textures[label] = { ...texture, framesDuringInterval: await textureCount(page) - before };
    captured[label] = { composite: await capture(label), texture: texturePng, measurement: texture };
    assert.ok(texture.colors > 20, `${stem}: ${label} lacks structured GPU output`);
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await phase(page, "running");
  await surface.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
  await page.evaluate(() => document.fonts.ready.then(() => {}));
  const canvasCss = await stage(page).locator("canvas").evaluate((canvas) => {
    const style = getComputedStyle(canvas);
    let ancestorsVisible = true;
    for (let node = canvas; node; node = node.parentElement) {
      const ancestor = getComputedStyle(node);
      ancestorsVisible &&= ancestor.display !== "none" && ancestor.visibility === "visible" && Number(ancestor.opacity) > 0;
    }
    return { opacity: style.opacity, visibility: style.visibility, display: style.display,
      blendMode: style.mixBlendMode, maskImage: style.maskImage, ancestorsVisible };
  });
  measurement.canvasCss = canvasCss;
  assert.ok(canvasCss.ancestorsVisible, `${stem}: canvas is hidden in the real composition`);
  // Freeze between snapshots, advancing equal intervals only. Shader time still
  // advances during runFor, so A->A measures drift and A->B->A must exceed it.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  try {
    await setControl(control.values[0]);
    await sample("a0");
    await sample("a1");
    await setControl(control.values[1]);
    await sample("b");
    await setControl(control.values[0]);
    await sample("a2");
    const comparisons = measurement.comparisons;
    for (const kind of ["composite", "texture"]) {
      const difference = (a, b) => livePixelDifference(page, captured[a][kind], captured[b][kind]);
      const drift = await difference("a0", "a1");
      const forward = await difference("a1", "b");
      const backward = await difference("b", "a2");
      const restored = await difference("a1", "a2");
      comparisons[kind] = { drift, forward, backward, restored };
      for (const change of [forward, backward]) {
        assert.ok(change.mean > Math.max(0.05, drift.mean * 3) &&
          change.changedPixels > Math.max(12, drift.changedPixels * 3),
        `${stem}: ${kind} control effect must exceed natural drift: ${JSON.stringify(comparisons[kind])}`);
        if (!control.evolving && slug !== "night-signal") assert.ok(restored.mean < change.mean / 2,
          `${stem}: ${kind} must return toward A after restoring the control: ${JSON.stringify(comparisons[kind])}`);
      }
    }
    if (slug === "night-signal") {
      // Different ribbon phases need not align in pixel space. Compare the
      // underlying colors too: brass is red-dominant and echo is blue-dominant.
      const channelBalance = ({ measurement: { average: [red, , blue] } }) => red - blue;
      const palettes = measurement.programBalance = Object.fromEntries(
        Object.entries(captured).map(([key, frame]) => [key, channelBalance(frame)]));
      assert.ok(palettes.b + 4 < Math.min(palettes.a0, palettes.a1, palettes.a2),
        `${stem}: program palette did not move to B and return to A: ${JSON.stringify(palettes)}`);
    }
    // A product pause must freeze its presented frame. Legacy M02 pages instead
    // hide the canvas; record that compatibility mode without accepting M03 freeze.
    const canvas = stage(page).locator("canvas");
    const pauseState = () => canvas.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      let visible = element.isConnected && rect.width > 0 && rect.height > 0;
      for (let node = element; node; node = node.parentElement) {
        const ancestor = getComputedStyle(node);
        visible &&= ancestor.display !== "none" && ancestor.visibility === "visible" && Number(ancestor.opacity) > 0;
      }
      return { visible, opacity: style.opacity, visibility: style.visibility, display: style.display,
        width: element.width, height: element.height,
        textures: window.__visualProbe.textures, devices: window.__visualProbe.devices,
        configurations: window.__visualProbe.configurations };
    });
    // Compare freeze frames at original resolution; the 80x60 control summary
    // above is deliberately insufficient for catching fine detail that keeps moving.
    const pauseDifference = (before, after) => page.evaluate(async ([before, after]) => {
      const decode = async (encoded) => {
        const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const { width, height } = bitmap;
        const output = document.createElement("canvas");
        output.width = width;
        output.height = height;
        const context = output.getContext("2d", { willReadFrequently: true });
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return { width, height, pixels: context.getImageData(0, 0, width, height).data };
      };
      const a = await decode(before);
      const b = await decode(after);
      if (a.width !== b.width || a.height !== b.height) throw new Error("Pause changed the captured surface dimensions");
      let total = 0;
      let peak = 0;
      let changedPixels = 0;
      for (let pixel = 0; pixel < a.pixels.length; pixel += 4) {
        let delta = 0;
        for (let channel = 0; channel < 3; channel++) {
          const difference = Math.abs(a.pixels[pixel + channel] - b.pixels[pixel + channel]);
          total += difference;
          delta = Math.max(delta, difference);
        }
        peak = Math.max(peak, delta);
        if (delta > 1) changedPixels++;
      }
      return { mean: total / (a.width * a.height * 3), peak, changedPixels, width: a.width, height: a.height };
    }, [before.toString("base64"), after.toString("base64")]);
    const stable = (difference, label) => assert.ok(difference.mean <= 0.01 && difference.peak <= 1,
      `${stem}: ${label} must preserve the presented frame: ${JSON.stringify(difference)}`);
    const beforePause = await capture("before-native-pause");
    const pause = measurement.pause = { intervalMs: 1000, before: await pauseState(), comparisons: {},
      stabilityLimits: { mean: 0.01, peak: 1 }, acceptsM03Freeze: false };
    // Count actual queue submissions too: texture acquisitions alone miss a
    // renderer that reuses a texture. No readback copy is requested in this interval.
    await canvas.evaluate((element) => {
      const original = GPUQueue.prototype.submit;
      const monitor = { original, submissions: 0, canvas: element };
      monitor.wrapper = function (commands) {
        const result = original.call(this, commands);
        if (this === window.__visualProbe.device?.queue) monitor.submissions++;
        return result;
      };
      window.__compositePauseQueue = monitor;
      GPUQueue.prototype.submit = monitor.wrapper;
    });
    try {
      await page.locator("[data-pause]").evaluate((button) => button.click());
      assert.equal(await stage(page).getAttribute("data-motion"), "paused");
      const paused = await capture("native-pause");
      pause.immediate = await pauseState();
      measurement.pauseMode = pause.immediate.visible ? "freeze" : "legacy-fallback";
      pause.comparisons.beforeToPaused = await pauseDifference(beforePause, paused);
      // shaders@4.0.7 dist/js/bundle.js registers its shared pointer dispatcher
      // on window's mousemove event. Exercise that exact target without native input.
      pause.pointerChallenge = { synthetic: true, target: "window", event: "mousemove",
        listenerSource: "shaders@4.0.7 dist/js/bundle.js shared pointer dispatcher",
        sequence: [], passed: false };
      const movePausedPointer = async (position) => {
        const event = await canvas.evaluate((element, position) => {
          const rect = element.getBoundingClientRect();
          const point = position === "center"
            ? { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
            : { clientX: Math.max(innerWidth, rect.right) + 32, clientY: Math.max(innerHeight, rect.bottom) + 32 };
          const event = new MouseEvent("mousemove", { ...point, bubbles: true, view: window });
          window.dispatchEvent(event);
          return { position, clientX: event.clientX, clientY: event.clientY, isTrusted: event.isTrusted };
        }, position);
        pause.pointerChallenge.sequence.push(event);
      };
      const pausedAt = await page.evaluate(() => Date.now());
      await movePausedPointer("center");
      await page.clock.runFor(pause.intervalMs / 2);
      await movePausedPointer("outside");
      await page.clock.runFor(pause.intervalMs / 2);
      pause.clockElapsedMs = await page.evaluate((start) => Date.now() - start, pausedAt);
      const afterPause = await capture("native-pause-after-1000ms");
      pause.after = await pauseState();
      pause.queueSubmissions = await page.evaluate(() => window.__compositePauseQueue.submissions);
      pause.sameCanvas = await canvas.evaluate((element) => element === window.__compositePauseQueue.canvas);
      pause.comparisons.pausedToAfter = await pauseDifference(paused, afterPause);
      assert.equal(await stage(page).getAttribute("data-motion"), "paused");
      assert.equal(pause.clockElapsedMs, pause.intervalMs, `${stem}: pause clock did not advance by 1000ms`);
      assert.equal(pause.sameCanvas, true, `${stem}: pause replaced the canvas`);
      assert.equal(pause.queueSubmissions, 0, `${stem}: paused renderer submitted GPU work`);
      for (const state of [pause.immediate, pause.after]) {
        for (const key of ["textures", "devices", "configurations", "width", "height"]) {
          assert.equal(state[key], pause.before[key], `${stem}: pause changed ${key}`);
        }
        assert.equal(state.visible, pause.immediate.visible, `${stem}: canvas visibility changed during pause`);
      }
      stable(pause.comparisons.pausedToAfter, "pause after advancing the clock by 1000ms");
      if (measurement.pauseMode === "freeze") stable(pause.comparisons.beforeToPaused, "native pause");
      else pause.compatibility = "Legacy canvas-hidden fallback only; not M03 freeze acceptance";
      pause.pointerChallenge.passed = true;

      // This mutation is diagnostic, never a product pause or an aesthetic pass.
      // Preserve the complete inline attribute, including its original absence.
      const originalStyle = await canvas.getAttribute("style");
      const originalProperties = await canvas.evaluate((element) => [...element.style].map((name) =>
        [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]));
      try {
        await canvas.evaluate((element) => element.style.setProperty("visibility", "hidden", "important"));
        const withoutCanvas = await capture("diagnostic-no-canvas");
        measurement.diagnosticContribution = {
          method: "Temporarily hide the paused canvas; not a native product action",
          ...await livePixelDifference(page, afterPause, withoutCanvas),
        };
      } finally {
        await canvas.evaluate((element, { style, properties }) => {
          for (const name of [...element.style]) element.style.removeProperty(name);
          for (const [name, value, priority] of properties) element.style.setProperty(name, value, priority);
          if (style === null) element.removeAttribute("style");
        }, { style: originalStyle, properties: originalProperties });
      }
      assert.equal(await canvas.getAttribute("style"), originalStyle, `${stem}: diagnostic changed inline styles`);
      const restoredPause = await capture("diagnostic-restored");
      pause.comparisons.diagnosticRestored = await pauseDifference(afterPause, restoredPause);
      // Hiding/reintroducing a GPU layer can change WARP compositor rounding by
      // 1–2 channel values. This is a diagnostic mutation, not native pause;
      // keep the stricter native-frame stability limit above unchanged.
      const diagnostic = pause.comparisons.diagnosticRestored;
      pause.diagnosticRestoreLimits = { mean: 0.05, peak: 2 };
      assert.ok(diagnostic.mean <= 0.05 && diagnostic.peak <= 2,
        `${stem}: restoring diagnostic canvas styles changed the composition: ${JSON.stringify(diagnostic)}`);
      if (measurement.pauseMode === "freeze") {
        const contribution = measurement.diagnosticContribution;
        assert.ok(contribution.mean > 0.05 && contribution.changedPixels > 12,
          `${stem}: frozen canvas has no visible diagnostic contribution: ${JSON.stringify(contribution)}`);
        pause.acceptsM03Freeze = true;
      }
    } finally {
      await page.evaluate(() => {
        const monitor = window.__compositePauseQueue;
        if (monitor) GPUQueue.prototype.submit = monitor.original;
        delete window.__compositePauseQueue;
      });
    }
    await page.locator("[data-pause]").evaluate((button) => button.click());
    assert.equal(await stage(page).getAttribute("data-motion"), "running", `${stem}: native resume did not resume the renderer`);
    await sample("native-resume");
    if (live) assert.equal(pause.acceptsM03Freeze, true, `${stem}: released native pause must freeze its GPU frame`);
    pause.resume = { nativeAction: true, phase: "running", composite: files["native-resume"],
      texture: files["texture-native-resume"], framesDuringInterval: measurement.textures["native-resume"].framesDuringInterval };
    return measurement;
  } finally {
    await page.clock.resume();
  }
}

async function checkCandidateComposites(browser) {
  for (const work of worksFor("candidate").filter(({ slug }) => !paperOnly || slug === "paper-light")) {
    for (const prefix of ["", "en/"]) {
      await withPage(browser, { viewport: { width: 1100, height: 850 } }, async (page) => {
        await page.clock.install();
        const probe = await observe(page, { readPixels: true });
        await open(page, `${prefix}works/${work.slug}/`);
        await phase(page, "running");
        await page.waitForFunction(() => window.__visualProbe.textures > 3);
        await checkLiveComposite(page, work.slug, prefix ? "en" : "zh-Hant");
        const fontPaths = work.slug === "night-signal" ? signalFontPaths :
          work.slug === "liquid-archive" ? [base + "fonts/liquid-geist.ttf"] :
          work.slug === "prism-materials" ? [base + "fonts/prism-archivo-black.ttf", base + "fonts/prism-plex-mono.ttf"] :
          work.slug === "aeriform" ? [base + "fonts/aero-bricolage.woff2"] : [];
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }
  evidence.checks.compositeControls = "PASS candidate original-CSS A/A/B/A control checks above animation drift, classified native pause and separate canvas-hide diagnostic; only per-work pauseMode=freeze qualifies for M03 freeze acceptance. Live verification uses the same routine";
}

async function checkLive(browser) {
  const receipt = await fetch(url(`release.json?sha=${commit}`), { signal: AbortSignal.timeout(15_000) });
  assert.equal(receipt.status, 200);
  const release = await receipt.json();
  assert.equal(release.commit, commit);
  const releasedWorks = verifyReleaseReceipt(release, releaseWorkIds());
  const workFonts = {
    "night-signal": signalFontPaths,
    "liquid-archive": [base + "fonts/liquid-geist.ttf"],
    "prism-materials": [base + "fonts/prism-archivo-black.ttf", base + "fonts/prism-plex-mono.ttf"],
    "aeriform": [base + "fonts/aero-bricolage.woff2"],
  };
  for (const work of registry.works.filter(isPublished)) {
    for (const prefix of ["", "en/"]) {
      assert.equal((await fetch(url(`${prefix}works/${work.slug}/`))).status, 200);
    }
  }
  for (const releasedWork of releasedWorks) {
    const route = `works/${releasedWork.slug}/`;
    const fontPaths = workFonts[releasedWork.slug] ?? [];
    for (const prefix of ["", "en/"]) {
      await withPage(browser, { viewport: { width: 1100, height: 850 } }, async (page) => {
        await page.clock.install();
        const probe = await observe(page, { readPixels: true });
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
        const locale = prefix ? "en" : "zh-Hant";
        const isolatedFile = `live-${releasedWork.slug}-${locale}-isolated-output.png`;
        const isolatedOutput = await pixelEvidence(page, stage(page), resolve(evidenceDir, isolatedFile));
        evidence.screenshots.push(isolatedFile);
        assert.ok(isolatedOutput.colors > 20, "The deployed shader has no structured independent output");
        // The isolated check above deliberately changes CSS and is not a visibility pass.
        // Save the unmodified page before measuring actual composite control effects.
        await screenshot(page, `live-${releasedWork.slug}-${locale}.png`);
        await checkLiveComposite(page, releasedWork.slug, locale, isolatedOutput);
        await probe.assertPrivate(site.origin, { fontPaths });
        await page.locator(".site-footer a").first().click();
        assert.equal(page.url(), url(prefix));
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }
  evidence.checks.live = "PASS live HTTPS gallery, both locales, independent WebGPU output and original-CSS controls above animation drift, classified native pause and separate canvas-hide diagnostic, source SHA, same-origin network and backlinks; legacy-fallback is compatibility only, not M03 freeze acceptance";
  evidence.measurements.deployed = release;
}

async function checkLiquid(browser) {
  const route = "works/liquid-archive/";
  const testFont = { localFont: base + "fonts/liquid-geist.ttf" };
  const fullLiquidScreenshot = async (page, name) => {
    await page.locator(".liquid-page img:visible").evaluateAll(images =>
      Promise.all(images.map(image => image.decode())));
    await screenshot(page, name);
  };
  const control = (page) => page.locator("#product");
  const selectFinish = (page, finish) => page.locator('.finish-choices label:has([value="' + finish + '"])');
  const capture = async (page, locator, name) => {
    await locator.screenshot({ path: resolve(evidenceDir, name) });
    evidence.screenshots.push(name);
  };

  for (const width of [320, 390, 768, 1440]) {
    for (const prefix of ["", "en/"]) {
      const en = Boolean(prefix);
      const lang = en ? "en" : "zh-Hant";
      await withPage(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page, testFont);
        await open(page, prefix);
        await page.locator(`.exhibition-card[href="${base}${prefix}${route}"]`).click();
        assert.equal(page.url(), url(prefix + route));
        await phase(page, "reduced");
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await layout(page);
        assert.equal(await textureCount(page), 0);
        assert.equal(await page.evaluate(() => window.__visualProbe.devices), 0);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(?:shader|standalone)-/.test(url)));
        const targets = await page.locator(".finish-choices span, .picker select, .picker .quantity, .button, #object-angle, [data-pause]").evaluateAll(nodes =>
          nodes.map(node => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(targets));
        if (width === 390 || width === 1440) {
          await fullLiquidScreenshot(page, `liquid-forme-${lang}-${width}-full.png`);
        }
        if (width === 390) {
          await page.locator('[data-select-product="arc"]').tap();
          assert.equal(await control(page).inputValue(), "arc");
          assert.equal(await page.locator("#config-title").evaluate(node => node === document.activeElement), true);
          await selectFinish(page, "satin").tap();
          assert.equal(await stage(page).getAttribute("data-finish"), "satin");
          assert.match(await page.locator("[data-detail-image]").getAttribute("src"), /arc-satin\.webp$/);
          assert.equal(await page.locator("[data-unit]").textContent(), "NT$3,380");
          assert.equal(await selectFinish(page, "satin").locator("span").evaluate(node =>
            getComputedStyle(node).textDecorationLine), "underline");
          await page.locator("[data-picker] button[type=submit]").tap();

          assert.equal(await page.locator("[data-total]").textContent(), "NT$3,380");
          assert.match(await page.locator("[data-quantity-label]").textContent(), en ? /sets/ : /組/);
          assert.match(await page.locator("#add-feedback").textContent(), en ? /1 set/ : /1 組/);
          assert.match(await page.locator("[data-items]").textContent(), en ? /Each set contains 2 bookends/ : /每組 2 件/);
          assert.match(await page.locator(".inquiry-end").textContent(), en ? /Shipping excluded/ : /未含運費/);
          await capture(page, page.locator("#inquiry"), `liquid-forme-${lang}-390-inquiry.png`);
          await layout(page);
        }
        await probe.assertPrivate(site.origin);
      });
    }
  }

  for (const prefix of ["", "en/"]) {
    await withPage(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 800 } }, async (page) => {
      await open(page, prefix + route);
      assert.ok(await page.locator("noscript p").isVisible());
      assert.ok(await page.locator(".hero-visual img").isVisible());
      assert.equal(await page.locator("[data-product]").count(), 3);
      assert.equal(await page.locator("[data-picker]").isVisible(), false);
      for (const card of await page.locator(".card-spec").all()) {
        await card.locator("summary").click();
        assert.ok(await card.locator("[data-care]").isVisible());
        assert.equal((await card.textContent()).match(/NT\$/g).length, 2);
      }
      if (!prefix) await fullLiquidScreenshot(page, "liquid-forme-zh-Hant-390-no-js.png");
    });
  }

  for (const variant of ["unsupported", "no-adapter"]) {
    await withPage(browser, {}, async (page) => {
      await page.addInitScript((variant) => {
        if (variant === "unsupported") Object.defineProperty(navigator, "gpu", { value: undefined });
        else Object.defineProperty(navigator.gpu, "requestAdapter", { value: async () => null });
      }, variant);
      const probe = await observe(page, testFont);
      await open(page, "en/" + route);
      await stage(page).scrollIntoViewIfNeeded();
      await phase(page, "unavailable");
      assert.ok(await page.locator("[data-hero-image]").isVisible());
      assert.equal(await stage(page).locator("canvas").isVisible(), false);
      assert.equal(await page.locator("#object-angle").isDisabled(), true);
      await control(page).press("ArrowDown");
      assert.equal(await page.locator("[data-object-title]").textContent(), "Dew Bud Vase");
      await page.locator('[name=finish][value=polished]').focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await stage(page).getAttribute("data-finish"), "satin");
      assert.match(await page.locator("[data-detail-image]").getAttribute("src"), /orb-satin\.webp$/);
      assert.match(await page.locator("[data-hero-image]").getAttribute("src"), /hero-satin\.webp$/);
      assert.equal(await page.evaluate(() => window.__visualProbe.devices), 0);
      await probe.assertPrivate(site.origin);
    });
  }

  for (const prefix of ["", "en/"]) {
    await withPage(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", acceptDownloads: true }, async (page) => {
      const en = Boolean(prefix);
      const probe = await observe(page, testFont);
      await open(page, prefix + route);
      await page.keyboard.press("Tab");
      assert.equal(await page.locator(".skip").evaluate(node => node === document.activeElement), true);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("main").evaluate(node => node === document.activeElement), true);
      const choose = page.locator('[data-select-product="ring"]');
      await choose.press("Enter");
      assert.equal(await page.locator("#config-title").evaluate(node => node === document.activeElement), true);
      const units = page.locator("#quantity");
      const add = page.locator("[data-picker] button[type=submit]");
      const lines = page.locator("[data-items] li");
      const total = page.locator("[data-total]");
      const download = page.locator("[data-download]");
      assert.equal(await download.isDisabled(), true);
      for (const invalid of ["", "0", "1.5", "100"]) {
        await units.fill(invalid);
        await add.press("Enter");
        assert.equal(await units.getAttribute("aria-invalid"), "true");
        assert.equal(await units.evaluate(node => node === document.activeElement), true);
        assert.equal(await lines.count(), 0);
      }
      await units.fill("2");
      await add.press("Enter");
      await add.press("Enter");
      assert.equal(await lines.count(), 1);
      assert.equal(await total.textContent(), "NT$11,520");
      await units.fill("99");
      await add.press("Enter");
      assert.equal(await total.textContent(), "NT$11,520");
      await selectFinish(page, "satin").click();
      await units.fill("2");
      await add.press("Enter");
      assert.equal(await lines.count(), 2);
      await control(page).selectOption("orb");
      await units.fill("1");
      await add.press("Enter");
      assert.equal(await lines.count(), 3);
      assert.equal(await total.textContent(), "NT$19,160");
      await page.locator("[data-view-list]").press("Enter");
      assert.equal(await page.locator("#inquiry-title").evaluate(node => node === document.activeElement), true);
      const first = lines.nth(0).locator("input");
      await first.fill("0");
      assert.equal(await first.getAttribute("aria-invalid"), "true");
      assert.equal(await download.isDisabled(), true);
      await first.fill("3");
      assert.equal(await download.isEnabled(), true);
      assert.equal(await total.textContent(), "NT$16,280");
      await lines.nth(1).locator("button").press("Enter");
      assert.equal(await lines.count(), 2);
      assert.equal(await lines.nth(1).locator("button").evaluate(node => node === document.activeElement), true);
      assert.equal(await total.textContent(), "NT$10,920");

      assert.equal(await page.locator("[data-count]").textContent(), "4");
      await page.locator('[data-select-product="arc"]').press("Enter");
      await units.fill("2");
      await add.press("Enter");
      assert.match(await page.locator("#add-feedback").textContent(), en ? /2 sets/ : /2 組/);
      assert.match(await lines.last().locator("input").getAttribute("aria-label"), en ? /sets/ : /組/);
      assert.equal(await total.textContent(), "NT$17,680");
      assert.equal(await page.locator("[data-count]").textContent(), "6");

      const pending = page.waitForEvent("download");
      await download.press("Enter");
      const file = await pending;
      assert.equal(file.suggestedFilename(), "forme-inquiry.txt");
      const summary = await readFile(await file.path(), "utf8");
      assert.match(summary, en ? /Halo Candleholder · Mirror polish/ : /折光燭台 · 鏡面亮光/);
      assert.match(summary, en ? /Dew Bud Vase · Brushed satin/ : /凝露花器 · 拉絲霧面/);
      assert.match(summary, en ? /Quantity 3 pieces · Indicative price per piece NT\$2,880 · Line total NT\$8,640/ : /數量 3 件 · 每件示意價 NT\$2,880 · 小計 NT\$8,640/);

      assert.match(summary, en ? /Arc Bookends · Brushed satin/ : /雙弧書擋 · 拉絲霧面/);
      assert.match(summary, en ? /Quantity 2 sets · Indicative price per set NT\$3,380 · Line total NT\$6,760/ : /數量 2 組 · 每組示意價 NT\$3,380 · 小計 NT\$6,760/);
      assert.match(summary, en ? /Each set contains 2 bookends. The dimensions shown are for one bookend/ : /每組 2 件，標示尺寸為單件/);
      assert.match(summary, en ? /304 stainless steel · 16 × 6 × 19 cm/ : /304 不鏽鋼 · 16 × 6 × 19 cm/);
      assert.match(summary, en ? /Fits a 22 mm taper/ : /適用直徑 22 mm 的細燭/);
      assert.match(summary, en ? /Indicative product total NT\$17,680/ : /商品示意合計 NT\$17,680/);
      assert.match(summary, en ? /exclude delivery/ : /未含運費/);
      assert.match(summary, en ? /No inquiry or order has been sent/ : /尚未送出詢問或訂單/);
      assert.match(await page.locator("#inquiry-feedback").textContent(), en ? /summary generated/ : /已產生詢問摘要/);
      const lang = en ? "en" : "zh-Hant";
      await writeFile(resolve(evidenceDir, `liquid-forme-${lang}-download.txt`), summary);
      await capture(page, page.locator("#inquiry"), `liquid-forme-${lang}-1440-inquiry.png`);
      for (let index = 0; index < 3; index++) await lines.first().locator("button").press("Enter");
      assert.equal(await download.isDisabled(), true);
      assert.equal(await total.textContent(), "NT$0");
      assert.equal(await page.locator("[data-return]").evaluate(node => node === document.activeElement), true);
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => location.hash), "#collection");
      await probe.assertPrivate(site.origin);
    });
  }

  for (const [prefix, width, height] of [["en/", 1440, 920], ["", 390, 850]]) {
    const lang = prefix ? "en" : "zh-Hant";
    const stem = `liquid-forme-${lang}-${width}`;
    await withPage(browser, { viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width === 390 }, async page => {
      await page.clock.install();
      const probe = await observe(page, { ...testFont, readPixels: true });
      const scene = page.locator(".hero-scene");
      const hero = page.locator(".hero-visual");
      const poster = hero.locator("img");
      const canvas = stage(page).locator("canvas");
      const angle = page.locator("#object-angle");
      const sweep = page.locator("[data-light-sweep]");
      const pauseButton = page.locator("[data-pause]");

      const captureSession = await page.context().newCDPSession(page);
      async function frame(label) {
        const name = `${stem}-${label}.png`;
        const clip = await scene.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 };
        });
        const { data } = await captureSession.send("Page.captureScreenshot", {
          format: "png", fromSurface: true, captureBeyondViewport: true, clip,
        });
        const png = Buffer.from(data, "base64");
        await writeFile(resolve(evidenceDir, name), png);
        evidence.screenshots.push(name);
        return png;
      }

      async function nextFrames(count = 2) {
        const start = await textureCount(page);
        await page.waitForFunction(target => window.__visualProbe.textures >= target, start + count);
      }

      async function selectAngle(degrees) {
        await angle.evaluate((input, value) => {
          input.value = String(value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }, degrees);
        assert.equal(await page.locator('output[for="object-angle"]').textContent(), `${degrees}°`);
        assert.equal(await stage(page).getAttribute("data-light"), "manual");
        await nextFrames();
      }

      async function captureNatural(finish) {
        const session = await page.context().newCDPSession(page);
        const targets = [0, 2, 4, 6, 8, 10, 12];
        const frames = new Map();
        let origin;
        let captured = 0;
        let resolveComplete;
        const complete = new Promise(resolve => { resolveComplete = resolve; });
        const receive = event => {
          void session.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
          const timestamp = event.metadata.timestamp;
          if (!Number.isFinite(timestamp)) return;
          captured++;
          origin ??= timestamp;
          const elapsed = (timestamp - origin) * 1000;
          for (const time of targets) {
            const error = Math.abs(time * 1000 - elapsed);
            if (error < (frames.get(time)?.error ?? Infinity)) frames.set(time, { elapsed, error, data: event.data });
          }
          if (elapsed >= 12_000) resolveComplete();
        };
        let timeout;
        session.on("Page.screencastFrame", receive);
        try {
          await session.send("Page.startScreencast", { format: "jpeg", quality: 83, maxWidth: 1080, maxHeight: 850, everyNthFrame: 1 });
          await Promise.race([complete, new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("No continuous 12-second Chromium screencast")), 23_000);
          })]);
        } finally {
          clearTimeout(timeout);
          await session.send("Page.stopScreencast");
          await session.detach();
        }
        const samples = [];
        for (const [time, entry] of frames) {
          const file = stem + "-" + finish + "-natural-" + time + "s.jpg";
          await writeFile(resolve(evidenceDir, file), Buffer.from(entry.data, "base64"));
          evidence.screenshots.push(file);
          samples.push({ time, elapsed: Math.round(entry.elapsed), error: Math.round(entry.error), file });
        }
        assert.equal(samples.length, targets.length);
        return { timebase: "Chromium compositor timestamps (real time)", captured, maxDriftMs: Math.max(...samples.map(sample => sample.error)), samples };
      }

      async function captureCycle(finish) {
        const samples = [];
        await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 350);
        try {
          let elapsed = 0;
          for (const time of [0, 2, 4, 6, 8, 10, 12]) {
            const previous = await textureCount(page);
            if (time) await page.clock.runFor(time * 1000 - elapsed);
            await page.evaluate(() => window.__visualProbe.device.queue.onSubmittedWorkDone());
            const textures = await textureCount(page);
            if (time) assert.ok(textures > previous, "No GPU frame in timed sweep interval");
            const png = await frame(finish + "-auto-" + time + "s");
            samples.push({ time, elapsed: time * 1000, textures, png });
            elapsed = time * 1000;
          }
        } finally {
          await page.clock.resume();
        }
        const changes = await Promise.all(samples.slice(1, -1).map(sample => livePixelDifference(page, samples[0].png, sample.png)));
        const travel = changes.reduce((largest, next) => next.mean > largest.mean ? next : largest);
        const closure = await livePixelDifference(page, samples[0].png, samples.at(-1).png);
        assert.ok(travel.mean > 0.1 && travel.changedPixels > 12, stem + ": automatic sweep is not visible: " + JSON.stringify(travel));
        assert.ok(closure.mean < travel.mean * 0.55, "12-second loop did not return to its starting lighting");
        return { timebase: "Browser clock with frame callbacks and GPU queue synchronization", travel, closure,
          samples: samples.map(({ png, ...sample }) => sample) };
      }

      async function checkFinish(finish) {
        assert.equal(await stage(page).getAttribute("data-finish"), finish);
        assert.equal(await stage(page).getAttribute("data-light"), "auto");
        await nextFrames();
        const fixed = {};
        for (const degrees of [0, 45, 90, 135, 180]) {
          await selectAngle(degrees);
          fixed[degrees] = await frame(`${finish}-fixed-${degrees}deg`);
        }
        const angleDelta = await livePixelDifference(page, fixed[0], fixed[180]);
        assert.ok(angleDelta.changedPixels > 15, `${stem}: moving the light does not change the studio image`);
        await selectAngle(0);
        const restored = await frame(`${finish}-fixed-return-0deg`);
        assert.equal((await livePixelDifference(page, fixed[0], restored)).peak, 0);
        await selectAngle(90);
        const texture = await page.evaluate(() => window.__visualProbe.readFrame(true));
        const textureName = `${stem}-${finish}-fixed-90deg-texture.png`;
        await writeFile(resolve(evidenceDir, textureName), Buffer.from(texture.png, "base64"));
        evidence.screenshots.push(textureName);
        const { png, ...textureStats } = texture;
        assert.ok(textureStats.colors > 20, JSON.stringify(textureStats));
        await sweep.evaluate(button => button.click());
        assert.equal(await stage(page).getAttribute("data-light"), "auto");
        await nextFrames();
        const natural = await captureNatural(finish);
        const cycle = await captureCycle(finish);
        const before = await frame(`${finish}-pause-before`);
        await pauseButton.evaluate(button => button.click());
        await phase(page, "paused");
        await quiet(page);
        assert.ok(await canvas.isVisible());
        assert.equal(await poster.isVisible(), false);
        const firstPaused = await frame(`${finish}-paused-a`);
        await page.waitForTimeout(600);
        const secondPaused = await frame(`${finish}-paused-b`);
        assert.deepEqual(await livePixelDifference(page, firstPaused, secondPaused),
          { mean: 0, changedPixels: 0, peak: 0, width: 80, height: 60 });
        const pauseDelta = await livePixelDifference(page, before, firstPaused);
        assert.ok(pauseDelta.mean < 2.5, `${stem}: pause switched the visible scene: ${JSON.stringify(pauseDelta)}`);
        assert.ok(await angle.isDisabled());
        await pauseButton.evaluate(button => button.click());
        await phase(page, "running");
        await nextFrames();
        await page.waitForTimeout(2000);
        const resumed = await frame(`${finish}-resumed`);
        const resumeDelta = await livePixelDifference(page, secondPaused, resumed);
        assert.ok(resumeDelta.mean > 0.07 && resumeDelta.changedPixels > 7, `${stem}: resumed scene did not move: ${JSON.stringify(resumeDelta)}`);

        await sweep.evaluate(button => button.click());
        assert.equal(await stage(page).getAttribute("data-light"), "auto");
        await page.evaluate(() => window.scrollTo(0, 0));
        return { natural, cycle, angleDelta, pauseDelta, resumeDelta, texture: textureStats };
      }

      await open(page, prefix + route);
      await phase(page, "running");
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.ok(await canvas.isVisible());
      assert.equal(await poster.isVisible(), false);
      assert.equal(await page.locator("canvas").count(), 1);
      const fillsHero = await hero.evaluate(element => {
        const image = element.getBoundingClientRect();
        const output = element.querySelector("canvas").getBoundingClientRect();
        return Math.abs(image.width - output.width) <= 1 && Math.abs(image.height - output.height) <= 1;
      });
      assert.ok(fillsHero, "Procedural canvas must cover the entire hero frame");
      assert.ok(await canvas.evaluate(output => output.width <= 840 && output.height <= 540), "DPR 1 studio must respect its render-size limit");
      const theme = await page.evaluate(() => ({
        background: getComputedStyle(document.documentElement).backgroundColor,
        accent: getComputedStyle(document.querySelector(".section-intro .eyebrow")).color,
        geist: [...document.fonts].some(face => face.family === "Geist" && face.status === "loaded"),
      }));
      assert.deepEqual(theme, { background: "rgb(238, 240, 237)", accent: "rgb(39, 81, 90)", geist: true });
      evidence.measurements.liquidTheme = theme;
      await checkContrast(page, [
        ".config-copy h2", ".hero .button", ".card-description", ".finish-choices input:checked + span",
      ], "liquidMinCheckedContrast");
      await fullLiquidScreenshot(page, `${stem}-webgpu-full.png`);
      const polished = await checkFinish("polished");

      const configurations = await page.evaluate(() => window.__visualProbe.configurations);
      await page.evaluate(() => {
        const products = document.querySelector("#product");
        const finishes = [...document.querySelectorAll('[name="finish"]')];
        for (let index = 0; index < 20; index++) {
          products.selectedIndex = index % products.options.length;
          products.dispatchEvent(new Event("change", { bubbles: true }));
          finishes[index % finishes.length].click();
        }
      });
      assert.equal(await control(page).inputValue(), "orb");
      assert.match(await page.locator("[data-detail-image]").getAttribute("src"), /orb-satin\.webp$/);
      assert.match(await poster.getAttribute("src"), /hero-satin\.webp$/);
      const satin = await checkFinish("satin");
      assert.notDeepEqual(satin.texture.average, polished.texture.average);
      assert.equal(await page.locator("canvas").count(), 1);
      assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
      assert.equal(await page.evaluate(() => window.__visualProbe.configurations), configurations);
      const before = await textureCount(page);
      const started = performance.now();
      await page.waitForTimeout(1200);
      evidence.measurements.liquidStudios ??= {};
      evidence.measurements.liquidStudios[stem] = {
        polished, satin,
        acquisitionsPerSecond: Number(((await textureCount(page) - before) * 1000 / (performance.now() - started)).toFixed(2)),
        pixelRatio: await canvas.evaluate(element => element.width / element.getBoundingClientRect().width),
      };

      await capture(page, page.locator("#configure"), `${stem}-product.png`);
      await phase(page, "still");
      await quiet(page);
      await page.evaluate(() => window.scrollTo(0, 0));
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
      await page.evaluate(() => window.__visualProbe.loseDevice());
      await page.waitForFunction(() => window.__visualProbe.devices > 1, null, { timeout: 35_000 });
      await phase(page, "running");
      assert.equal(await stage(page).getAttribute("data-finish"), "satin");
      await probe.assertPrivate(site.origin);

      await captureSession.detach();
      const nextLang = prefix ? "zh-Hant" : "en";
      await page.locator(`header a[lang="${nextLang}"]`).click();
      assert.equal(page.url(), url((prefix ? "" : "en/") + route));
      await phase(page, "running");
      await page.locator(`.forme-footer a[href="${base}${prefix ? "" : "en/"}"]`).click();
      assert.equal(page.url(), url(prefix ? "" : "en/"));
      await page.goBack({ waitUntil: "commit" });
      assert.equal(page.url(), url((prefix ? "" : "en/") + route));
      await page.evaluate(() => window.scrollTo(0, 0));
      await phase(page, "running");
      await probe.assertPrivate(site.origin);
    });
  }
  evidence.checks.liquid = "PASS bilingual inquiry and download, four widths/200%, keyboard/touch, no-JS and no-GPU, visible procedural studio in both finishes, natural 12-second cycles, fixed 0/45/90/135/180 and return, frozen native pause, resume, visibility, device recovery, back and privacy";
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
    evidence.downloads = await checkPaperCommercial({ browser, withPage, open, screenshot, site, work, evidenceDir });
    evidence.checks.paperCommercial = "PASS bilingual series prefill and suggestions, preserved custom choices, specifications, units, touch, validation, keyboard focus, edit, and exact local download with privacy";
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
    evidence.measurements.paperMaterial = await checkPaperMaterial({
      browser, withPage, open, work, site, phase, capture: paperSurface, difference: paperLightDifference, screenshot,
    });
    evidence.checks.paperMaterial = "PASS two viewports, full natural cycle, five lamp angles, same-frame pause and resume";
    if (!paperOnly && worksFor("candidate").some(({ id }) => id === "V002")) await checkLiquid(browser);
    if (!paperOnly && worksFor("candidate").some(({ id }) => id === "V003")) await checkSignal(browser, {
      evidence, evidenceDir, site, withPage, open, layout, phase, stage, textureCount, quiet, screenshot,
    });
    await checkCandidateComposites(browser);
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
