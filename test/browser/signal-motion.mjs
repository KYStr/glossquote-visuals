import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const fingerprint = (buffer) => createHash("sha256").update(buffer).digest("hex");
const schedule = (period) => [...new Set([0, 2, 4, 6, 8, ...Array.from({ length: period - 7 }, (_, i) => i + 9)])];

export function signalMotionEvidence({ evidence, evidenceDir }) {
  const measurements = evidence.measurements.signalMotion = { cycles: {}, transitions: {}, freeze: {} };
  async function raw(page, name) {
    const before = performance.now();
    const { png, ...texture } = await page.evaluate(() => window.__visualProbe.readFrame(true));
    const bytes = Buffer.from(png, "base64");
    const file = name + "-texture.png";
    await writeFile(resolve(evidenceDir, file), bytes);
    evidence.screenshots.push(file);
    return { ...texture, file, sha256: fingerprint(bytes), readbackMs: Math.round(performance.now() - before) };
  }

  async function viewport(page, name) {
    const file = name + ".png";
    const png = await page.screenshot({ path: resolve(evidenceDir, file) });
    evidence.screenshots.push(file);
    return { file, sha256: fingerprint(png) };
  }

  async function follow(page, stem, offsets, composites, change) {
    const epoch = performance.now();
    const frames = [];
    for (const offset of offsets) {
      const wait = epoch + offset - performance.now();
      if (wait > 0) await page.waitForTimeout(wait);
      const start = performance.now();
      if (offset === 0 && change) await change();
      const label = stem + "-" + String(offset).padStart(5, "0") + "ms";
      const gpu = await raw(page, label);
      const composite = composites ? await viewport(page, label) : undefined;
      frames.push({ targetMs: offset, captureStartedMs: Math.round(start - epoch), gpu, composite });
    }
    assert.ok(frames.every(({ gpu }) => gpu.colors > 20), JSON.stringify(frames));
    assert.equal(new Set(frames.map(({ gpu }) => gpu.sha256)).size, frames.length, stem + " did not change");
    return frames;
  }

  return {
    async cycle(page, viewportName, id, period) {
      const stem = "signal-" + viewportName + "-" + id;
      measurements.cycles[stem] = {
        nominalPeriodSeconds: period,
        samples: await follow(page, stem, schedule(period).map((seconds) => seconds * 1000), true),
      };
    },
    async transition(page, from, to) {
      const key = from + "-to-" + to;
      const stem = "signal-transition-" + key;
      const before = await raw(page, stem + "-before");
      const samples = await follow(page, stem, [0, 350, 700, 1050], true, () => page.evaluate((value) => {
        document.querySelector('input[name="program"][value="' + value + '"]').click();
      }, to));
      assert.notEqual(samples.at(-1).gpu.sha256, before.sha256);
      measurements.transitions[key] = { before, samples };
    },
    async freeze(page, stem, surface, { pause, resume, quiet, nextFrame }) {
      const clip = await surface.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
      });
      async function capture(suffix) {
        const file = "signal-" + stem + "-" + suffix + ".png";
        const png = await page.screenshot({ path: resolve(evidenceDir, file), clip });
        evidence.screenshots.push(file);
        return { file, sha256: fingerprint(png) };
      }

      const before = await capture("pre-pause");
      await pause();
      assert.equal(await surface.locator("canvas").isVisible(), true, "Pause must keep the GPU canvas visible");
      assert.equal(await surface.locator("img").isVisible(), false, "Pause must keep the still poster hidden");
      const frozen = await capture("pause");
      await quiet(page);
      const later = await capture("pause-held");
      assert.equal(later.sha256, frozen.sha256, "Visible stage changed while motion was paused");
      await resume();
      await nextFrame();
      const resumed = await capture("resumed");
      assert.notEqual(resumed.sha256, frozen.sha256, "The sculpture did not move after resuming");
      measurements.freeze[stem] = { before, frozen, later, resumed };
    },
  };
}
