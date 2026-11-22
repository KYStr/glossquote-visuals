import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveDist } from "../../test/browser/server.mjs";
import { checkPerformance, installPresentationMeter, measureSubmissions } from "../../test/browser/m04-measure.mjs";
import { base, root } from "../../scripts/site-map.mjs";
import { testApprovedHero, testFlow, testHeroInteraction } from "./flow.mjs";

if (process.platform !== "win32" || process.env.RUNNER_OS !== "Windows" ||
    process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
    process.env.GITHUB_REPOSITORY?.toLowerCase() !== "kystr/glossquote-visuals") {
  throw Error("NOT_RUN_USER_FOCUS_BOUNDARY: only the project's GitHub-hosted Windows VM may run this capture");
}

const [input, lang] = process.argv.slice(2);
assert.ok(["mouse", "touch", "keyboard"].includes(input));
assert.ok(["zh-Hant", "en"].includes(lang));
const mobile = input === "touch";
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const dir = join(root, ".runs", "m07-v008", `${lang}-${input}`);
await mkdir(dir, { recursive: true });
const site = await serveDist();
const url = site.origin + base + (lang === "en" ? "en/" : "") + "works/sorbet-hour/";
const errors = [];
let browser;
try {
  browser = await chromium.launch({
    headless: true, channel: "chromium",
    args: ["--enable-unsafe-webgpu", "--disable-gpu-watchdog", "--enable-gpu",
      "--use-angle=d3d11-warp", "--use-webgpu-adapter=d3d11"],
  });
  const context = await browser.newContext({
    viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, acceptDownloads: true,
    recordVideo: { dir, size: viewport },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  const diagnostics = [];
  page.on("requestfailed", request => diagnostics.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on("response", response => {
    if (response.status() >= 400) diagnostics.push(`${response.status()} ${response.url()}`);
  });
  const stage = page.locator("[data-stage]");
  assert.equal((await page.goto(url, { waitUntil: "domcontentloaded" })).status(), 200);
  await page.evaluate(() => document.fonts.ready);
  await stage.scrollIntoViewIfNeeded();
  const gpu = await page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    return adapter ? { vendor: adapter.info.vendor, device: adapter.info.device,
      architecture: adapter.info.architecture, description: adapter.info.description } : null;
  });
  try {
    assert.ok(gpu, "The isolated runner did not provide a WebGPU adapter");
    await page.locator('[data-stage][data-rendered][data-motion="running"]').waitFor();
  } catch (error) {
    const state = await stage.evaluate(element => ({
      ...element.dataset, canvas: [element.querySelector("canvas").width, element.querySelector("canvas").height],
    }));
    await page.screenshot({ path: join(dir, "startup-failure.png") });
    await writeFile(join(dir, "startup-failure.json"), JSON.stringify({ gpu, state, errors, diagnostics }, null, 2));
    console.error({ gpu, state, errors, diagnostics });
    throw error;
  }
  await page.screenshot({ path: join(dir, "viewport.png") });
  const capture = async name => {
    const clip = await stage.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const x = Math.max(0, Math.floor(bounds.left));
      const y = Math.max(0, Math.floor(bounds.top));
      return { x, y, width: Math.min(innerWidth, Math.ceil(bounds.right)) - x,
        height: Math.min(innerHeight, Math.ceil(bounds.bottom)) - y };
    });
    assert.ok(clip.width > 0 && clip.height > 0);
    await page.screenshot({ path: join(dir, `${name}-hero.png`), clip });
    await page.screenshot({ path: join(dir, `${name}-viewport.png`) });
  };
  capture.checkpoints = ["mid"];
  const hero = input === "keyboard"
    ? await testHeroInteraction(page, input, capture)
    : await testApprovedHero(page, input, capture);
  const flow = await testFlow(page, lang);
  await context.close();

  const reduced = await browser.newContext({ viewport, reducedMotion: "reduce", hasTouch: mobile });
  const still = await reduced.newPage();
  await still.goto(url);
  const stillStage = still.locator('[data-stage][data-motion="reduced"]:not([data-rendered])');
  await stillStage.waitFor();
  const hit = stillStage.locator("[data-scoop-hit]");
  await hit.press("ArrowLeft");
  await hit.press("Enter");
  await still.locator('[data-stage][data-cuts="left"][data-bite-phase="held"]').waitFor();
  await hit.press("ArrowRight");
  await hit.press("Enter");
  await still.locator('[data-stage][data-cuts="left center"][data-bite-phase="held"]').waitFor();
  await stillStage.screenshot({ path: join(dir, "reduced-second-bite.png") });
  await still.locator("[data-scoop-reset]").press("Enter");
  await still.locator('[data-stage][data-hero-state="intact"][data-scoop-visual="ready"]').waitFor();
  await reduced.close();
  assert.deepEqual(errors, []);
  let performance;
  if (input !== "keyboard") {
    const timing = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile });
    try {
      const timedPage = await timing.newPage();
      await timedPage.addInitScript(installPresentationMeter);
      await timedPage.goto(url, { waitUntil: "domcontentloaded" });
      await timedPage.locator('[data-stage][data-rendered][data-motion="running"]').waitFor();
      performance = await measureSubmissions(timedPage);
      await writeFile(join(dir, "performance.json"), JSON.stringify(performance, null, 2));
    } finally {
      await timing.close();
    }
  }
  await writeFile(join(dir, "results.json"), JSON.stringify({ input, lang, gpu, hero, flow, reduced: true, performance }, null, 2));
  if (performance) checkPerformance(performance);
} finally {
  await browser?.close();
  await site.close();
}
