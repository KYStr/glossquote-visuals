import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Exercise the deployed material controls and customer flow under normal wall-clock animation. */
export async function checkM04Live({ page, work, locale, evidenceDir, evidence, phase }) {
  assert.match(work.work, /^V\d{3}$/);
  const { setMaterial, testFlow, testHeroInteraction } = await import(`../../evidence/${work.work}/flow.mjs`);
  const stem = `live-${work.slug}-${locale}`;
  const canvas = page.locator("[data-stage] canvas");
  assert.equal(await canvas.count(), 1);
  const frames = [];
  for (const [index, state] of [0, 1, 2, 0].entries()) {
    await setMaterial(page, state, "keyboard");
    await phase(page, "running");
    const { png, ...stats } = await page.evaluate(() => window.__visualProbe.readFrame(true));
    assert.ok(stats.colors > 1 && stats.width > 0 && stats.height > 0, "Non-empty material texture");
    const bytes = Buffer.from(png, "base64");
    const file = `${stem}-material-${index}.png`;
    await writeFile(resolve(evidenceDir, file), bytes);
    evidence.screenshots.push(file);
    frames.push({ state, ...stats, file, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  assert.ok(new Set(frames.slice(0, 3).map(({ sha256 }) => sha256)).size === 3,
    "Three selectable materials or levels should yield distinct GPU images");
  const pause = page.locator("[data-pause]");
  assert.equal(await pause.count(), 1);
  await pause.evaluate(button => button.click());
  await phase(page, "paused");
  const frozenFile = `${stem}-frozen.png`;
  const held = await canvas.screenshot({ path: resolve(evidenceDir, frozenFile) });
  evidence.screenshots.push(frozenFile);
  const textures = await page.evaluate(() => window.__visualProbe.textures);
  await page.waitForTimeout(1000);
  assert.ok(held.equals(await canvas.screenshot()), "Held visual changed during native pause");
  assert.equal(await page.evaluate(() => window.__visualProbe.textures), textures);
  await pause.evaluate(button => button.click());
  await phase(page, "running");
  await page.waitForFunction(count => window.__visualProbe.textures > count, textures);
  let heroInteraction;
  if (testHeroInteraction) {
    const images = [];
    const states = ["before", "after", "reset"];
    const observations = await testHeroInteraction(page, "mouse", async state => {
      assert.equal(state, states[images.length]);
      const file = `${stem}-interaction-${state}.png`;
      const bytes = await page.locator("[data-stage]").screenshot({ path: resolve(evidenceDir, file) });
      evidence.screenshots.push(file);
      images.push({ state, file, sha256: createHash("sha256").update(bytes).digest("hex") });
    });
    assert.equal(images.length, states.length);
    assert.ok(observations && Object.keys(observations).length, "Record the pressed, scooped and reset states");
    assert.notEqual(images[0].sha256, images[1].sha256, "The scoop should visibly change the product");
    heroInteraction = { input: "mouse", observations, images };
  }
  const order = await testFlow(page, locale);
  assert.ok(order && typeof order === "object" && Object.keys(order).length, "Commercial flow needs concrete observations");
  return { frames, frozenFile, order, ...(heroInteraction && { heroInteraction }) };
}
