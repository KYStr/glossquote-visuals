import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { base } from "../../scripts/site-map.mjs";
import { observe, pixelEvidence } from "./probe.mjs";
import { signalMotionEvidence } from "./signal-motion.mjs";

export const signalFontPaths = [`${base}fonts/night-barlow-condensed-extrabold.ttf`];
const route = "works/night-signal/";
const selectProgram = (page, id) => page.locator(`[data-act="${id}"] label`);
const active = (page, selector) => page.locator(selector).evaluate((node) => node === document.activeElement);
const periods = { carrier: 10, echo: 8, dawn: 12 };
const devices = (page) => page.evaluate(() => window.__visualProbe.devices);

async function assertProgram(page, id, stage) {
  const row = page.locator(`[data-act="${id}"]`);
  assert.equal(await row.locator("input").isChecked(), true);
  const selectedDot = await row.locator(".act-indicator").evaluate((dot) => getComputedStyle(dot, "::before").backgroundColor);
  assert.notEqual(selectedDot, "rgba(0, 0, 0, 0)");
  assert.equal(await row.locator("[data-act-description]").isVisible(), true);
  assert.equal(await page.locator("[data-act-description]:visible").count(), 1);
  assert.equal(await stage(page).getAttribute("data-channel"), id);
  assert.equal(await page.locator("[data-hero-program]").textContent(), await row.locator("[data-act-title]").textContent());
}

async function measureContrast(page) {
  const ratios = await page.evaluate(() => {
    const luminance = (rgb) => rgb.match(/[\d.]+/g).slice(0, 3).map(Number)
      .map((value) => value / 255)
      .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
    return [".hero h1", ".event-details", ".hero-cta", ".act-name p", ".transit p", ".ticket-receipt h3", ".ticket-receipt .button"]
      .map((selector) => {
        const element = document.querySelector(selector);
        let background = "rgba(0, 0, 0, 0)";
        for (let node = element; node && background === "rgba(0, 0, 0, 0)"; node = node.parentElement) {
          background = getComputedStyle(node).backgroundColor;
        }
        const pair = [luminance(background), luminance(getComputedStyle(element).color)].sort((a, b) => b - a);
        return (pair[0] + 0.05) / (pair[1] + 0.05);
      });
  });
  assert.ok(ratios.every((ratio) => ratio >= 4.5), JSON.stringify(ratios));
  return Number(Math.min(...ratios).toFixed(2));
}

async function booking(page, english, { capture, layout, evidenceDir }) {
  const empty = page.locator("[data-empty]");
  const first = page.locator("#pass-single");
  const full = page.locator("#pass-full");
  const set = page.locator("#booking-set");
  const quantity = page.locator("#booking-quantity");
  const submit = page.locator("[data-receipt] button");
  const total = page.locator("[data-total]");
  const prefix = english ? "en-1440" : "zh-Hant-390";

  assert.equal(await empty.isVisible(), true);
  await submit.click();
  assert.equal(await page.locator("[data-error=pass]").isVisible(), true);
  assert.equal(await first.getAttribute("aria-invalid"), "true");
  assert.equal(await active(page, "#pass-single"), true);
  await first.press("Space");
  assert.equal(await first.isChecked(), true);
  assert.equal(await page.locator("[data-error=pass]").isVisible(), false);
  assert.equal(await set.isVisible(), true);
  assert.equal(await set.inputValue(), "echo");
  await selectProgram(page, "carrier").click();
  assert.equal(await set.inputValue(), "echo", "The preselected set is kept once a single-set pass is chosen");
  await set.selectOption("dawn");
  await selectProgram(page, "echo").click();
  assert.equal(await set.inputValue(), "dawn", "A manual ticket selection survives later lineup browsing");
  assert.equal(await page.locator("[data-unit]").textContent(), "NT$480");
  assert.equal(await page.locator("[data-sets] li").count(), 1);
  assert.match(await page.locator("[data-sets] li").textContent(), /21:45–23:30/);

  for (const value of ["", "0", "7", "2.5"]) {
    await quantity.fill(value);
    assert.equal(await total.textContent(), "—");
    await submit.click();
    assert.equal(await page.locator("[data-error=quantity]").isVisible(), true);
    assert.equal(await quantity.getAttribute("aria-invalid"), "true");
    assert.equal(await active(page, "#booking-quantity"), true);
  }
  await quantity.fill("3");
  assert.equal(await total.textContent(), "NT$1,440");
  assert.equal(await page.locator("[data-error=quantity]").isVisible(), false);
  await capture(page.locator("#passes"), `signal-${prefix}-selection.png`);
  await layout(page);
  await submit.click();
  assert.equal(await active(page, "#complete-title"), true);
  assert.equal(await page.locator("[data-complete-sets] li").count(), 1);
  await page.locator("[data-edit]").click();
  assert.equal(await active(page, "#pass-single"), true);
  assert.equal(await quantity.inputValue(), "3");
  assert.equal(await set.inputValue(), "dawn");
  await first.press("ArrowRight");
  assert.equal(await full.isChecked(), true);
  assert.equal(await set.isVisible(), false);
  assert.equal(await page.locator("[data-unit]").textContent(), "NT$880");
  assert.equal(await page.locator("[data-sets] li").count(), 3);
  assert.equal(await total.textContent(), "NT$2,640");
  await submit.click();
  const complete = page.locator("[data-complete]");
  assert.equal(await complete.isVisible(), true);
  assert.equal(await active(page, "#complete-title"), true);
  assert.match(await complete.locator("[data-complete-note]").textContent(), english ? /No payment.*no places/i : /尚未付款或保留席位/);
  await capture(page.locator("#passes"), `signal-${prefix}-complete.png`);
  const pending = page.waitForEvent("download");
  await page.locator("[data-download]").click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  const filename = download.suggestedFilename();
  assert.equal(filename, `night-signal-2026-11-21-${english ? "en" : "zh-Hant"}.txt`);
  const itinerary = resolve(evidenceDir, filename);
  await download.saveAs(itinerary);
  const text = await readFile(itinerary, "utf8");
  assert.match(text, /NT\$2,640/);
  assert.match(text, /NT\$880/);
  assert.match(text, /2026/);
  assert.match(text, english ? /No payment.*no places/i : /尚未付款或保留席位/);
  for (const range of ["19:00–20:00", "20:15–21:30", "21:45–23:30"]) assert.ok(text.includes(range));
  assert.equal(await complete.getByRole("status").isVisible(), true);
  await page.locator("[data-edit]").click();
  await full.press("ArrowLeft");
  assert.equal(await set.inputValue(), "dawn");
  assert.equal(await total.textContent(), "NT$1,440");
  return filename;
}

export async function checkSignal(browser, {
  evidence, evidenceDir, site, withPage, open, layout, phase, stage, textureCount, quiet, screenshot,
}) {
  evidence.downloads ??= [];
  const motionEvidence = signalMotionEvidence({ evidence, evidenceDir });
  const privateRequests = (probe) => probe.assertPrivate(site.origin, { fontPaths: signalFontPaths });
  const capture = async (locator, name) => {
    await locator.screenshot({ path: resolve(evidenceDir, name) });
    evidence.screenshots.push(name);
  };

  for (const width of [320, 390, 768, 1440]) {
    for (const prefix of ["", "en/"]) {
      await withPage(browser, { viewport: { width, height: 844 }, reducedMotion: "reduce", hasTouch: width === 390 }, async (page) => {
        const probe = await observe(page);
        await open(page, prefix);
        await page.locator(`.exhibition-card[href="${base}${prefix}${route}"]`).click();
        await phase(page, "reduced");
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        assert.equal(await page.evaluate(() => document.fonts.check('800 32px "Night Barlow Condensed"')), true);
        assert.equal(await page.locator("html").getAttribute("lang"), prefix ? "en" : "zh-Hant");
        assert.equal(await page.locator("canvas").count(), 1);
        assert.equal(await textureCount(page), 0);
        assert.equal(await devices(page), 0);
        assert.ok(!probe.requests.some(({ url }) => /\/assets\/(?:shader|standalone)-/.test(url)));
        await page.keyboard.press("Tab");
        assert.equal(await active(page, ".skip"), true);
        await page.keyboard.press("Enter");
        assert.equal(await active(page, "main"), true);
        await layout(page);
        const targets = await page.locator(".hero-cta, .act-select, .pass-option label, #booking-quantity, [data-receipt] button")
          .evaluateAll((nodes) => nodes.map((node) => [node.offsetWidth, node.offsetHeight]));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(targets));
        const cta = await page.locator(".hero-cta").boundingBox();
        assert.ok(cta && cta.y + cta.height <= (width === 1440 ? 844 : 580), `CTA below mobile fold at ${width}px`);
        if (width === 320 && prefix) {
          await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
          await capture(page.locator(".hero"), "signal-en-320-200-percent.png");
          await page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
        }
        if (width === 768 && !prefix) await screenshot(page, "signal-zh-Hant-768-still.png");
        if (width === 390) {
          const venue = await page.locator(".venue-inner").evaluate((element) => {
            const heading = element.querySelector(".venue-heading").getBoundingClientRect();
            const image = element.querySelector("figure").getBoundingClientRect();
            const details = element.querySelector(".venue-details").getBoundingClientRect();
            return heading.bottom <= image.top && image.bottom <= details.top;
          });
          assert.equal(venue, true, "Mobile should show the venue image before arrival details");
          await selectProgram(page, "echo").tap();
          await assertProgram(page, "echo", stage);
          assert.equal(await stage(page).locator("img").evaluate((image) => getComputedStyle(image).filter !== "none"), true);
          await page.evaluate(() => window.scrollTo(0, 0));
          await screenshot(page, `signal-${prefix ? "en" : "zh-Hant"}-390-still.png`);
        }
        if ((width === 390 && !prefix) || (width === 1440 && prefix)) {
          await selectProgram(page, "echo").click();
          await assertProgram(page, "echo", stage);
          await page.locator(".hero-cta").press("Enter");
          assert.equal(new URL(page.url()).hash, "#passes");
          assert.equal(await active(page, "#passes"), true);
          evidence.downloads.push(await booking(page, Boolean(prefix), { capture, layout, evidenceDir }));
        }
        assert.ok(probe.requests.some(({ type, url }) => type === "font" && new URL(url).pathname === signalFontPaths[0]));
        await privateRequests(probe);
      });
    }
  }

  evidence.checks.signalBooking = "PASS both locales: pass and set selection, empty/invalid quantity, pricing, retained set when browsing, keyboard review/edit, local UTF-8 itinerary download, no purchase or reservation";

  for (const prefix of ["", "en/"]) {
    await withPage(browser, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, async (page) => {
      await open(page, prefix + route);
      assert.equal(await page.locator(".act-description:visible").count(), 3);
      assert.equal(await page.locator(".pass-option:visible").count(), 2);
      assert.equal(await page.locator("[data-receipt]").isVisible(), false);
      assert.equal(await page.locator("[data-program-hint]").isVisible(), false);
      assert.equal(await page.locator("audio, video, iframe").count(), 0);
      assert.ok(await stage(page).locator("img").isVisible());
      assert.ok(await page.locator("noscript p").isVisible());
      await page.locator("summary").first().press("Enter");
      assert.equal(await page.locator("details[open]").count(), 1);
    });
  }

  await withPage(browser, {}, async (page) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "gpu", { value: undefined }));
    const probe = await observe(page);
    await open(page, "en/" + route);
    await phase(page, "unavailable");
    await page.locator('[name="program"][value="carrier"]').press("ArrowRight");
    await assertProgram(page, "echo", stage);
    await page.locator('label[for="pass-single"]').click();
    assert.equal(await page.locator("#booking-set").inputValue(), "echo");
    assert.equal(await page.locator("[data-total]").textContent(), "NT$480");
    await privateRequests(probe);
  });

  await withPage(browser, {}, async (page) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.gpu, "requestAdapter", { value: async () => null });
    });
    const probe = await observe(page);
    await open(page, route);
    await phase(page, "unavailable");
    assert.equal(await stage(page).locator("img").isVisible(), true);
    assert.equal(await stage(page).locator("canvas").isVisible(), false);
    assert.equal(await textureCount(page), 0);
    await privateRequests(probe);
  });

  await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page) => {
    const probe = await observe(page, { readPixels: true });
    await open(page, "en/" + route);
    await phase(page, "running");
    evidence.measurements.signalMinCheckedContrast = await measureContrast(page);

    const captures = {};
    async function nextFrame() {
      await page.evaluate(() => window.scrollTo(0, 0));
      await phase(page, "running");
      const count = await textureCount(page);
      await page.waitForFunction((previous) => window.__visualProbe.textures > previous + 3, count);
    }

    for (const id of ["carrier", "echo", "dawn"]) {
      await selectProgram(page, id).click();
      await assertProgram(page, id, stage);
      await nextFrame();
      await page.waitForTimeout(1050);
      const texture = await page.evaluate(() => window.__visualProbe.readFrame());
      const name = `signal-${id}-webgpu.png`;
      const visible = await pixelEvidence(page, stage(page), resolve(evidenceDir, name));
      assert.ok(texture.colors > 20 && visible.colors > 20, `Program ${id} did not render: ${JSON.stringify({ texture, visible })}`);
      evidence.screenshots.push(name);
      captures[id] = { texture, visible };
      await nextFrame();
      await motionEvidence.cycle(page, "desktop", id, periods[id]);
    }
    assert.equal(new Set(Object.values(captures).map(({ texture }) => texture.average.join(","))).size, 3);
    evidence.measurements.signalChannels = captures;

    const configurations = await page.evaluate(() => window.__visualProbe.configurations);
    await page.evaluate(() => {
      const radios = [...document.querySelectorAll('[name="program"]')];
      for (let i = 0; i < 18; i++) radios[i % radios.length].click();
    });
    await assertProgram(page, "dawn", stage);
    await nextFrame();
    assert.equal(await devices(page), 1);
    assert.equal(await page.evaluate(() => window.__visualProbe.configurations), configurations);
    assert.equal(await page.locator("canvas").count(), 1);
    const started = performance.now();
    const frames = await textureCount(page);
    await page.waitForTimeout(1200);
    evidence.measurements.signalTextureAcquisitionsPerSecond = Number(((await textureCount(page) - frames) * 1000 / (performance.now() - started)).toFixed(2));
    evidence.measurements.signalPixelRatio = await stage(page).locator("canvas").evaluate((canvas) => canvas.width / canvas.getBoundingClientRect().width);

    await selectProgram(page, "carrier").click();
    await nextFrame();
    await screenshot(page, "signal-en-1440-webgpu.png");
    await capture(page.locator(".hero"), "signal-en-1440-poster.png");
    await motionEvidence.freeze(page, "desktop", stage(page), {
      pause: async () => {
        await page.getByRole("button", { name: "Pause motion" }).evaluate((button) => button.click());
        await phase(page, "paused");
      },
      resume: () => page.getByRole("button", { name: "Resume motion" }).evaluate((button) => button.click()),
      quiet, nextFrame,
    });

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

    const beforeLoss = await devices(page);
    await page.evaluate(() => window.__visualProbe.loseDevice());
    await page.waitForFunction((previous) => window.__visualProbe.devices > previous, beforeLoss, { timeout: 35_000 });
    await nextFrame();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    await phase(page, "still");
    await quiet(page);
    const configurationsBeforeReturn = await page.evaluate(() => window.__visualProbe.configurations);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow")));
    await nextFrame();
    // The pinned SDK can reuse its GPU device after destroying the previous renderer.
    assert.ok(await page.evaluate(() => window.__visualProbe.configurations) > configurationsBeforeReturn,
      "Returning to the page should reconfigure the canvas for a fresh renderer");
    assert.equal(await stage(page).locator("canvas").isVisible(), true);
    const returnedTexture = await page.evaluate(() => window.__visualProbe.readFrame());
    assert.ok(returnedTexture.colors > 20, "The reconfigured canvas should present a real shader frame");
    await privateRequests(probe);

    await page.locator('header a[lang="zh-Hant"]').click();
    assert.equal(new URL(page.url()).pathname, base + route);
    await nextFrame();
    await screenshot(page, "signal-zh-Hant-1440-webgpu.png");
    await page.setViewportSize({ width: 390, height: 844 });
    await nextFrame();
    await screenshot(page, "signal-zh-Hant-390-webgpu.png");
    await capture(page.locator(".hero"), "signal-zh-Hant-390-poster.png");
    await nextFrame();
    for (const id of Object.keys(periods)) {
      await selectProgram(page, id).click();
      await assertProgram(page, id, stage);
      await nextFrame();
      await page.waitForTimeout(1050);
      await motionEvidence.cycle(page, "mobile", id, periods[id]);
    }
    await motionEvidence.freeze(page, "mobile", stage(page), {
      pause: async () => {
        await page.getByRole("button", { name: "暫停動態" }).evaluate((button) => button.click());
        await phase(page, "paused");
      },
      resume: () => page.getByRole("button", { name: "繼續動態" }).evaluate((button) => button.click()),
      quiet, nextFrame,
    });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await phase(page, "still");
    await quiet(page);
    await privateRequests(probe);
    await page.locator('header a[lang="en"]').click();
    assert.equal(new URL(page.url()).pathname, base + "en/" + route);
    await nextFrame();
    await screenshot(page, "signal-en-390-webgpu.png");
    await privateRequests(probe);
  });
  await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page) => {
    await page.clock.install();
    const probe = await observe(page, { readPixels: true });
    await open(page, "en/" + route);
    await phase(page, "running");
    await page.waitForFunction(() => window.__visualProbe.textures > 3);
    await motionEvidence.transitions(page, stage(page), ["carrier", "echo", "dawn", "carrier"]);
    await assertProgram(page, "carrier", stage);
    await privateRequests(probe);
  });
  evidence.checks.signalMotion = "PASS natural desktop and mobile cycles for all three programs, three in-place transitions, and stable original-resolution stage pixels and zero extra presentation frames during native pause on desktop and mobile";
  evidence.checks.signal = "PASS bilingual 320/390/768/1440 and 200% text layout, keyboard/touch, three visible WebGPU programs, 18 switches on one device, lifecycle and recovery, no-GPU/no-JS/reduced motion and privacy";
}
