import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const fingerprint = (buffer) => createHash("sha256").update(buffer).digest("hex");
const schedule = (period) => [...new Set([0, 2, 4, 6, 8, ...Array.from({ length: period - 8 }, (_, i) => i + 9)])];

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

  const difference = (page, first, second) => page.evaluate(async ([a, b]) => {
    async function decode(encoded) {
      const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    const [first, second] = await Promise.all([decode(a), decode(b)]);
    if (first.width !== second.width || first.height !== second.height) throw new Error("Pause changed stage size");
    let sum = 0;
    let peak = 0;
    let changedPixels = 0;
    for (let i = 0; i < first.data.length; i += 4) {
      const r = Math.abs(first.data[i] - second.data[i]);
      const g = Math.abs(first.data[i + 1] - second.data[i + 1]);
      const b = Math.abs(first.data[i + 2] - second.data[i + 2]);
      sum += r + g + b;
      const delta = Math.max(r, g, b);
      peak = Math.max(peak, delta);
      if (delta > 1) changedPixels++;
    }
    return { mean: sum / (first.width * first.height * 3), peak, changedPixels };
  }, [first.toString("base64"), second.toString("base64")]);

  async function follow(page, stem, offsets, change) {
    const epoch = performance.now();
    const frames = [];
    for (const offset of offsets) {
      const wait = epoch + offset - performance.now();
      if (wait > 0) await page.waitForTimeout(wait);
      const start = performance.now();
      if (offset === 0 && change) await change();
      const label = stem + "-" + String(offset).padStart(5, "0") + "ms";
      const gpu = await raw(page, label);
      frames.push({ targetMs: offset, captureStartedMs: Math.round(start - epoch), gpu });
    }
    assert.ok(frames.every(({ gpu }) => gpu.colors > 20), JSON.stringify(frames));
    assert.equal(new Set(frames.map(({ gpu }) => gpu.sha256)).size, frames.length, stem + " did not change");
    if (!change) {
      assert.ok(frames.every(({ targetMs, captureStartedMs }) => Math.abs(captureStartedMs - targetMs) < 600),
        stem + " missed real-time capture deadlines: " + JSON.stringify(frames.map(({ targetMs, captureStartedMs }) => [targetMs, captureStartedMs])));
    }
    return frames;
  }

  return {
    async cycle(page, viewportName, id, period) {
      const stem = "signal-" + viewportName + "-" + id;
      measurements.cycles[stem] = {
        nominalPeriodSeconds: period,
        samples: await follow(page, stem, schedule(period).map((seconds) => seconds * 1000)),
      };
    },
    async transition(page, from, to) {
      const key = from + "-to-" + to;
      const stem = "signal-transition-" + key;
      const before = await raw(page, stem + "-before");
      const samples = await follow(page, stem, [0, 350, 700, 1150], () => page.evaluate((value) => {
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
        return { png, metadata: { file, sha256: fingerprint(png) } };
      }

      const { metadata: before } = await capture("pre-pause");
      await pause();
      assert.equal(await surface.locator("canvas").isVisible(), true, "Pause must keep the GPU canvas visible");
      assert.equal(await surface.locator("img").isVisible(), false, "Pause must keep the still poster hidden");
      // A submitted frame can still be in flight in the GPU/compositor at click time.
      // Flush already submitted commands; this does not submit a new frame.
      await page.evaluate(async () => {
        await window.__visualProbe.device.queue.onSubmittedWorkDone();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const frozen = await capture("pause");
      await quiet(page);
      const later = await capture("pause-held");
      const pixels = await difference(page, frozen.png, later.png);
      const report = measurements.freeze[stem] = { before, frozen: frozen.metadata, later: later.metadata, pixels };
      assert.ok(pixels.mean <= 0.01 && pixels.peak <= 2 && pixels.changedPixels <= 24,
        "Visible stage moved while paused: " + JSON.stringify(pixels));
      await resume();
      await nextFrame();
      const resumed = await capture("resumed");
      const motion = await difference(page, frozen.png, resumed.png);
      assert.ok(motion.mean > 0.05 && motion.changedPixels > 24, "The sculpture did not move after resuming");
      report.resumed = resumed.metadata;
      report.resumePixels = motion;
    },
  };
}
