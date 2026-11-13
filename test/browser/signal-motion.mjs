import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const fingerprint = (buffer) => createHash("sha256").update(buffer).digest("hex");
const schedule = (period) => [...new Set([0, 2, 4, 6, 8, ...Array.from({ length: period - 8 }, (_, i) => i + 9)])];

export function signalMotionEvidence({ evidence, evidenceDir }) {
  const measurements = evidence.measurements.signalMotion = { cycles: {}, transitions: {}, freeze: {} };
  async function saveTexture(name, { png, ...texture }) {
    const bytes = Buffer.from(png, "base64");
    const file = name + "-texture.png";
    await writeFile(resolve(evidenceDir, file), bytes);
    evidence.screenshots.push(file);
    return { ...texture, file, sha256: fingerprint(bytes) };
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

  async function follow(page, stem, offsets) {
    const captured = await page.evaluate(async (offsets) => {
      const epoch = performance.now();
      return Promise.all(offsets.map(async (targetMs) => {
        await new Promise((resolve) => setTimeout(resolve, targetMs));
        const requestedMs = performance.now() - epoch;
        const texture = await window.__visualProbe.readFrame(true);
        return { targetMs, requestedMs, epoch, texture };
      }));
    }, offsets);
    const frames = [];
    for (const { targetMs, requestedMs, epoch, texture } of captured) {
      const label = stem + "-" + String(targetMs).padStart(5, "0") + "ms";
      const { submittedAt, ...image } = texture;
      const gpu = await saveTexture(label, image);
      frames.push({ targetMs, requestedMs: Math.round(requestedMs), presentedMs: Math.round(submittedAt - epoch), gpu });
    }
    measurements.cycles[stem].samples = frames;
    assert.ok(frames.every(({ gpu }) => gpu.colors > 20), JSON.stringify(frames));
    assert.equal(new Set(frames.map(({ gpu }) => gpu.sha256)).size, frames.length, stem + " did not change");
    assert.ok(frames.every(({ targetMs, presentedMs }) => Math.abs(presentedMs - targetMs) < 600),
      stem + " missed natural capture deadlines: " + JSON.stringify(frames.map(({ targetMs, presentedMs }) => [targetMs, presentedMs])));
    return frames;
  }

  return {
    async cycle(page, viewportName, id, period) {
      const stem = "signal-" + viewportName + "-" + id;
      measurements.cycles[stem] = { nominalPeriodSeconds: period, samples: [] };
      await follow(page, stem, schedule(period).map((seconds) => seconds * 1000));
    },
    async transitions(page, surface, sequence) {
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 100);
      const clip = await surface.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
      });

      try {
        for (let index = 1; index < sequence.length; index++) {
          const to = sequence[index];
          const key = sequence[index - 1] + "-to-" + to;
          const stem = "signal-transition-" + key;
          const epoch = performance.now();
          const start = await page.evaluate((value) => {
            document.querySelector('input[name="program"][value="' + value + '"]').click();
            return Date.now();
          }, to);
          const samples = [];
          measurements.transitions[key] = { method: "paused Playwright clock with real GPU rendering", samples };
          let elapsed = 0;
          for (const targetMs of [0, 350, 700, 1080]) {
            if (targetMs > 0) {
              await page.clock.runFor(targetMs - elapsed - 34);
              await page.evaluate(() => { window.__signalTransitionFrame = window.__visualProbe.readFrame(true); });
              await page.clock.runFor(34);
              elapsed = targetMs;
            }
            const { logicalMs, textures } = await page.evaluate(async (start) => {
              await window.__visualProbe.device.queue.onSubmittedWorkDone();
              return { logicalMs: Date.now() - start, textures: window.__visualProbe.textures };
            }, start);
            const label = stem + "-" + String(targetMs).padStart(5, "0") + "ms";
            const file = label + "-composite.png";
            const captureStartedWallMs = Math.round(performance.now() - epoch);
            const composite = await page.screenshot({ path: resolve(evidenceDir, file), clip });
            evidence.screenshots.push(file);
            let gpu;
            if (targetMs > 0) {
              let timeout;
              try {
                const texture = await Promise.race([
                  page.evaluate(() => window.__signalTransitionFrame),
                  new Promise((_, reject) => {
                    timeout = setTimeout(() => reject(new Error(label + " readback timed out")), 15_000);
                  }),
                ]);
                gpu = await saveTexture(label, texture);
              } finally {
                clearTimeout(timeout);
              }
            }
            assert.equal(logicalMs, targetMs);
            samples.push({
              targetMs, logicalMs, captureStartedWallMs, textures,
              composite: { file, sha256: fingerprint(composite) }, gpu,
            });
          }
          assert.equal(await surface.getAttribute("data-channel"), to);
          assert.equal(new Set(samples.map(({ composite }) => composite.sha256)).size, samples.length);
          assert.ok(samples.slice(1).every(({ gpu }) => gpu.colors > 20));
        }
      } finally {
        await page.clock.resume();
      }
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
