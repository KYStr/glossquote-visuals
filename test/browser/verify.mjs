import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import { base, isPublished, origin, registry, releaseWorkIds, root, worksFor } from "../../scripts/site-map.mjs";
import { verifyReleaseReceipt } from "../../scripts/release-proof.mjs";
import { checkPaperCommercial } from "./paper-commercial.mjs";
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
  const png = await stage(page).screenshot({ path: resolve(evidenceDir, name) });
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
    await page.mouse.move(art.x + art.width * 0.8, art.y + art.height / 2);
    await page.waitForFunction(() => Number(document.querySelector("#light-angle").value) === 144);
    const beforePointerFrames = await textureCount(page);
    await page.waitForFunction((frames) => window.__visualProbe.textures >= frames + 2, beforePointerFrames);
    const paperAtAngle = await paperSurface(page, "paper-en-angle-surface.png");
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
    const paperOvercast = await paperSurface(page, "paper-en-overcast-surface.png");
    const pointerDifference = await paperLightDifference(page, paperBefore, paperAtAngle);
    const presetDifference = await paperLightDifference(page, paperBefore, paperOvercast);
    evidence.measurements.paperSurfaceDifference = { pointer: pointerDifference, preset: presetDifference };
    assert.ok(pointerDifference > 1 && presetDifference > 3, "Actual paper composition did not change with angle and light preset");
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
  const releasedWorks = verifyReleaseReceipt(release, releaseWorkIds());
  const workFonts = {
    "night-signal": signalFontPaths,
    "liquid-archive": [base + "fonts/liquid-geist.ttf"],
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
        await screenshot(page, `live-${releasedWork.slug}-${prefix ? "en" : "zh-Hant"}.png`);
        await probe.assertPrivate(site.origin, { fontPaths });
        await page.locator(".site-footer a").first().click();
        assert.equal(page.url(), url(prefix));
        await probe.assertPrivate(site.origin, { fontPaths });
      });
    }
  }
  evidence.checks.live = "PASS live HTTPS gallery, both localized works, visible WebGPU, source SHA, same-origin network and backlinks";
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

  await withPage(browser, { viewport: { width: 1440, height: 920 }, deviceScaleFactor: 1 }, async (page) => {
    const probe = await observe(page, { ...testFont, readPixels: true });
    const photo = page.locator(".hero-visual");
    const sample = async name => {
      await phase(page, "running");
      await page.locator("[data-hero-image]").evaluate(image => image.decode());
      const previous = await textureCount(page);
      await page.waitForFunction(count => window.__visualProbe.textures > count + 3, previous);
      const texture = await page.evaluate(() => window.__visualProbe.readFrame());
      assert.ok(texture.colors > 20, JSON.stringify({ name, texture }));
      const file = "liquid-forme-" + name + ".png";
      const pixels = await photo.screenshot({ path: resolve(evidenceDir, file) });
      evidence.screenshots.push(file);
      return { texture, pixels };
    };
    const difference = (first, second) => page.evaluate(async ([first, second]) => {
      const toPixels = async encoded => {
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 60;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, 80, 60);
        image.close();
        return context.getImageData(0, 0, 80, 60).data;
      };
      const a = await toPixels(first);
      const b = await toPixels(second);
      let changed = 0;
      let peak = 0;
      for (let i = 0; i < a.length; i += 4) {
        const diff = Math.max(...[0, 1, 2].map(c => Math.abs(a[i + c] - b[i + c])));
        if (diff > 10) changed++;
        peak = Math.max(peak, diff);
      }
      return { changed, peak };
    }, [first.toString("base64"), second.toString("base64")]);

    await open(page, "en/" + route);
    const polished = await sample("en-1440-polished-composite");
    const coversPhoto = await photo.evaluate(element => {
      const viewport = element.getBoundingClientRect();
      const image = element.querySelector("img").getBoundingClientRect();
      return image.left <= viewport.left + 1 && image.right >= viewport.right - 1 &&
        image.top <= viewport.top + 1 && image.bottom >= viewport.bottom - 1;
    });
    assert.equal(coversPhoto, true, "The hero photograph covers its entire frame");
    assert.equal(await page.evaluate(() => scrollY), 0, "The WebGPU composition is visible on entry");
    await checkContrast(page, [
      ".config-copy h2", ".hero .button", ".card-description", ".finish-choices input:checked + span",
    ], "liquidMinCheckedContrast");
    await fullLiquidScreenshot(page, "liquid-forme-en-1440-webgpu-full.png");

    const angle = page.locator("#object-angle");
    await angle.press("Home");
    assert.equal(await page.locator("output").textContent(), "0°");
    const start = await sample("en-angle-0");
    await angle.press("End");
    assert.equal(await page.locator("output").textContent(), "180°");
    const end = await sample("en-angle-180");
    const angleChange = await difference(start.pixels, end.pixels);
    assert.ok(angleChange.changed > 15, "Light angle must visibly change the photograph composition: " + JSON.stringify(angleChange));

    await page.getByRole("button", { name: "Pause motion" }).click();
    await phase(page, "paused");
    await quiet(page);
    const still = await photo.screenshot({ path: resolve(evidenceDir, "liquid-forme-en-still-reference.png") });
    evidence.screenshots.push("liquid-forme-en-still-reference.png");
    const shaderContribution = await difference(end.pixels, still);
    assert.ok(shaderContribution.changed > 40, "The visible shader should change the steel surface: " + JSON.stringify(shaderContribution));
    await page.getByRole("button", { name: "Resume motion" }).click();
    await phase(page, "running");

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
    assert.equal(await stage(page).getAttribute("data-finish"), "satin");
    assert.match(await page.locator("[data-detail-image]").getAttribute("src"), /orb-satin\.webp$/);
    assert.match(await page.locator("[data-hero-image]").getAttribute("src"), /hero-satin\.webp$/);
    const satin = await sample("en-1440-satin-composite");
    assert.notDeepEqual(satin.texture.average, polished.texture.average);
    assert.equal(await page.locator("canvas").count(), 1);
    assert.equal(await page.evaluate(() => window.__visualProbe.devices), 1);
    assert.equal(await page.evaluate(() => window.__visualProbe.configurations), configurations);

    await page.getByRole("button", { name: "Pause motion" }).click();
    await phase(page, "paused");
    const satinStill = await photo.screenshot({ path: resolve(evidenceDir, "liquid-forme-en-satin-still-reference.png") });
    evidence.screenshots.push("liquid-forme-en-satin-still-reference.png");
    const satinContribution = await difference(satin.pixels, satinStill);
    assert.ok(satinContribution.changed > 8, "Satin lighting should remain visible: " + JSON.stringify(satinContribution));
    await page.getByRole("button", { name: "Resume motion" }).click();
    await phase(page, "running");
    evidence.measurements.liquidHero = { polished: polished.texture, satin: satin.texture, angleChange, shaderContribution, satinContribution };

    const before = await textureCount(page);
    const started = performance.now();
    await page.waitForTimeout(1200);
    evidence.measurements.liquidTextureAcquisitionsPerSecond = Number(((await textureCount(page) - before) * 1000 / (performance.now() - started)).toFixed(2));
    evidence.measurements.liquidPixelRatio = await stage(page).locator("canvas").evaluate(canvas => canvas.width / canvas.getBoundingClientRect().width);
    await capture(page, page.locator("#configure"), "liquid-forme-en-1440-product.png");
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

    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(page.url(), url(route));
    await sample("zh-Hant-390-polished-composite");
    await fullLiquidScreenshot(page, "liquid-forme-zh-Hant-390-webgpu-full.png");
    await capture(page, page.locator("#configure"), "liquid-forme-zh-Hant-390-product.png");
    await phase(page, "still");
    await quiet(page);
    await page.locator(".forme-footer a[href=\"" + base + "\"]").click();
    assert.equal(page.url(), url());
    await page.goBack({ waitUntil: "commit" });
    assert.equal(page.url(), url(route));
    await page.evaluate(() => window.scrollTo(0, 0));
    await phase(page, "running");
    await probe.assertPrivate(site.origin);
  });
  evidence.checks.liquid = "PASS bilingual inquiry and downloaded contents, four widths/200%, keyboard/touch, no-JS, no-GPU, visible WebGPU hero composite and light angle, rapid finish switches on one device, pause/visibility/recovery/back and privacy";
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
    if (worksFor("candidate").some(({ id }) => id === "V002")) await checkLiquid(browser);
    if (worksFor("candidate").some(({ id }) => id === "V003")) await checkSignal(browser, {
      evidence, evidenceDir, site, withPage, open, layout, phase, stage, textureCount, quiet, screenshot,
    });
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
