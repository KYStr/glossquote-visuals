import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { observe } from "./probe.mjs";

export async function checkPaperMaterial({
  browser, withPage, open, work, site, phase, capture, difference, screenshot,
}) {
  const evidence = { cycleSeconds: 8, viewports: {} };
  for (const { width, height, prefix, touch } of [
    { width: 1440, height: 900, prefix: "en/", touch: false },
    { width: 390, height: 844, prefix: "", touch: true },
  ]) {
    await withPage(browser, { viewport: { width, height }, hasTouch: touch }, async (page) => {
      const probe = await observe(page);
      const frames = [];
      const angles = [];
      const pause = page.locator("[data-pause]");
      const stage = page.locator("[data-stage]");
      const range = page.locator("#light-angle");
      const textures = () => page.evaluate(() => window.__visualProbe.textures);
      const nextFrames = async (count) => {
        const target = await textures() + count;
        await page.waitForFunction((minimum) => window.__visualProbe.textures >= minimum, target);
      };
      const snap = (label) => capture(page, "paper-material-" + width + "-" + label + ".png");
      await open(page, prefix + work);
      await phase(page, "running");
      await nextFrames(2);
      assert.equal(await stage.getAttribute("data-surface"), "rendered");
      const start = performance.now();
      let first;
      for (const second of [0, 2, 4, 6, 8]) {
        const wait = start + second * 1000 - performance.now();
        if (wait > 0) await page.waitForTimeout(wait);
        const elapsed = (performance.now() - start) / 1000;
        const frame = await snap("auto-" + second + "s");
        first ??= frame;
        frames.push({ seconds: second, elapsed, difference: await difference(page, first, frame) });
      }
      assert.ok(frames[2].difference > 0.65, "The natural cycle is not visible");
      assert.ok(frames[4].difference < frames[2].difference, "The full cycle did not return near its starting phase");

      let zero;
      for (const angle of [0, 45, 90, 135, 180, 0]) {
        await range.evaluate((input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }, angle);
        await nextFrames(3);
        const label = angle === 0 && zero ? "angle-000-return" : "angle-" + String(angle).padStart(3, "0");
        const frame = await snap(label);
        zero ??= frame;
        angles.push({ angle, difference: await difference(page, zero, frame) });
      }
      assert.ok(angles[4].difference > 0.65, "The angle endpoints did not change the paper");
      assert.ok(angles[5].difference < angles[4].difference, "Returning to zero did not restore the lamp direction");

      // Hold the browser clock just before the product action, then advance it
      // while paused. This gives a same-frame comparison without click/RAF races.
      await page.clock.install();
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 450);
      const before = await snap("pause-before");
      const beforeCount = await textures();
      await pause.evaluate((button) => button.click());
      assert.equal(await stage.getAttribute("data-motion"), "paused");
      assert.equal(await stage.getAttribute("data-surface"), "rendered");
      await page.clock.runFor(1600);
      const paused = await snap("pause-held");
      assert.equal(await textures(), beforeCount);
      const freeze = await difference(page, before, paused);
      assert.equal(freeze, 0, "Pause changed the actual paper composition");
      await pause.evaluate((button) => button.click());
      assert.equal(await stage.getAttribute("data-motion"), "running");
      await page.clock.resume();
      await nextFrames(3);
      await page.waitForTimeout(1100);
      const resumed = await snap("pause-resumed");
      assert.ok(await textures() > beforeCount);
      const resume = await difference(page, paused, resumed);
      assert.ok(resume > 0.15, "The paper did not change after resume");
      await page.locator("main img").evaluateAll(async (images) => {
        for (const image of images) image.loading = "eager";
        await Promise.all(images.map((image) => image.decode()));
      });
      await screenshot(page, "paper-material-" + width + "-full.png");
      await probe.assertPrivate(site.origin);
      evidence.viewports[width] = { frames, angles, freeze, resume };
    });
  }
  return evidence;
}
