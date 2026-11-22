import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveDist } from "../../test/browser/server.mjs";
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
    args: ["--enable-unsafe-webgpu", "--disable-gpu-watchdog", "--use-angle=swiftshader", "--enable-gpu"],
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
  const stage = page.locator("[data-stage]");
  assert.equal((await page.goto(url, { waitUntil: "domcontentloaded" })).status(), 200);
  await page.evaluate(() => document.fonts.ready);
  await stage.scrollIntoViewIfNeeded();
  await page.locator('[data-stage][data-rendered][data-motion="running"]').waitFor();
  const gpu = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? { vendor: adapter.info.vendor, device: adapter.info.device,
      architecture: adapter.info.architecture, description: adapter.info.description } : null;
  });
  assert.ok(gpu);
  await page.screenshot({ path: join(dir, "viewport.png") });
  const capture = async name => {
    await stage.screenshot({ path: join(dir, `${name}-hero.png`) });
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
  await writeFile(join(dir, "results.json"), JSON.stringify({ input, lang, gpu, hero, flow, reduced: true }, null, 2));
} finally {
  await browser?.close();
  await site.close();
}
