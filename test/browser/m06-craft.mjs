import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "playwright-core/lib/utilsBundle";

// Box-average the original render into the small proof. Never resize the page,
// re-render the hero or upscale a filmstrip frame to obtain a "native" sample.
export function stageThumbnail(png, width = 160) {
  const source = PNG.sync.read(png);
  assert.ok(source.width >= width, "Native stage must have at least 160 physical pixels");
  const height = Math.max(1, Math.round(source.height * width / source.width));
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    const top = Math.floor(y * source.height / height);
    const bottom = Math.floor((y + 1) * source.height / height);
    for (let x = 0; x < width; x++) {
      const left = Math.floor(x * source.width / width);
      const right = Math.floor((x + 1) * source.width / width);
      const total = [0, 0, 0, 0];
      for (let sy = top; sy < bottom; sy++) {
        for (let sx = left; sx < right; sx++) {
          const offset = (sy * source.width + sx) * 4;
          for (let c = 0; c < 4; c++) total[c] += source.data[offset + c];
        }
      }
      const area = (bottom - top) * (right - left);
      const offset = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) result.data[offset + c] = Math.round(total[c] / area);
    }
  }
  return { width, height, png: PNG.sync.write(result) };
}

export async function captureCraft({ page, open, phase, stageImage, dir, report }) {
  const craft = report.capture.craft = { version: "hero-craft-v1", video: "craft-opening.webm", frames: [] };
  // The full viewport video starts before navigation. Original screenshot
  // timestamps below are separate wall-clock bounds on the actual compositor.
  await page.addInitScript(() => {
    const watch = new MutationObserver(() => {
      if (document.querySelector('[data-stage][data-motion="running"]')) {
        window.__m06RunningAt = performance.now();
        watch.disconnect();
      }
    });
    watch.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-motion"], childList: true });
  });
  await open(page);
  craft.frames.push({ targetMs: null, native: await stageImage(page, "craft-00-native") });
  await phase(page, "running");
  craft.runningAt = await page.evaluate(() => window.__m06RunningAt);
  assert.ok(Number.isFinite(craft.runningAt), "Missing onset on the navigation clock");
  for (const targetMs of [500, 1000, 1600, 2200, 3000, 4000, 5000, 6500, 8500]) {
    const elapsed = await page.evaluate(start => performance.now() - start, craft.runningAt);
    if (elapsed < targetMs) await page.waitForTimeout(targetMs - elapsed);
    const index = String(craft.frames.length).padStart(2, "0");
    craft.frames.push({ targetMs, native: await stageImage(page, "craft-" + index + "-native") });
  }
  // Produce exact same-frame small copies after acquisition, outside its timeline.
  for (const frame of craft.frames) {
    const { file } = frame.native;
    const { width, height, png } = stageThumbnail(await readFile(join(dir, file)));
    const name = file.replace("-native.png", "-160.png");
    await writeFile(join(dir, name), png);
    frame.thumb = { file: name, width, height, sha256: createHash("sha256").update(png).digest("hex") };
  }
}
