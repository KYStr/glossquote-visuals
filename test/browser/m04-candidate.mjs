import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { base, registry, root } from "../../scripts/site-map.mjs";
import { observe } from "./probe.mjs";
import { serveDist } from "./server.mjs";
import { captureOpening } from "./m04-opening.mjs";
import { captureBrowserZoom, checkPerformance, installPresentationMeter, layoutInventory, measureSubmissions } from "./m04-measure.mjs";

if (process.platform !== "win32" || process.env.RUNNER_OS !== "Windows" ||
    process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
    process.env.GITHUB_REPOSITORY?.toLowerCase() !== "kystr/glossquote-visuals") {
  throw Error("NOT_RUN_USER_FOCUS_BOUNDARY: browser capture is restricted to the project's GitHub-hosted Windows VM");
}
const [work, lang, viewport, series = "m04"] = process.argv.slice(2);
assert.ok(["m04", "m05"].includes(series));
const entry = registry.works.find(candidate => candidate.id === work);
assert.ok(entry && ["zh-Hant", "en"].includes(lang) && ["desktop", "mobile"].includes(viewport));
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(commit, process.env.GITHUB_SHA);
const dir = join(root, ".runs", series + "-evidence", [work, lang, viewport].join("-"));
await mkdir(dir, { recursive: true });
const mobile = viewport === "mobile";
const size = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const report = { work, lang, viewport, commit, cssSize: size, runner: "GitHub-hosted windows-2025",
  adapterMode: "D3D11 WARP (software)", emulatedMobileViewport: mobile, checks: {}, capture: {}, manual: {
    "ART-1": "NOT_RUN: director must identify brand, offer, CTA and hero subject in initial captures.",
    "ART-2": "NOT_RUN: director must inspect motion sequence, three material states and return against the brief.",
    "ART-3": "NOT_RUN: director compares the batch and two inner sections per work.",
    "UI-1": "NOT_RUN: geometry checks supplement manual inspection for clipping/overlap.",
    "UI-2": "NOT_RUN: inspect focus order, control hit areas and actual composited text contrast.",
    "BIZ-1": "NOT_RUN: compare both languages, values and labels to brief.",
  } };
const save = () => writeFile(join(dir, "results.json"), JSON.stringify(report, null, 2) + "\n");
const hash = buffer => createHash("sha256").update(buffer).digest("hex");
async function check(name, operation) {
  try {
    const details = await operation();
    report.checks[name] = { status: "PASS", details };
  } catch (error) {
    report.checks[name] = { status: "FAIL", error: String(error.stack || error) };
    console.error(name, error.message);
  }
  await save();
}

const launch = { headless: true, channel: "chromium", ignoreDefaultArgs: ["--disable-back-forward-cache"],
  args: ["--enable-unsafe-webgpu", "--disable-gpu-watchdog", "--enable-gpu", "--use-angle=d3d11-warp", "--use-webgpu-adapter=d3d11"] };
const server = await serveDist();
const url = server.origin + base + (lang === "en" ? "en/" : "") + "works/" + entry.slug + "/";
const scene = page => page.locator("[data-stage]");
const phase = (page, expected) => page.waitForFunction(value =>
  document.querySelector("[data-stage]")?.dataset.motion === value, expected, { timeout: 35_000 });
const count = page => page.evaluate(() => window.__m04Times.length);
const frame = (page, prefix) => page.screenshot({ path: join(dir, prefix + ".png"), timeout: 20_000 });
const timer = page => page.evaluate(() => performance.now());
async function open(page) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await scene(page).count(), 1);
}
async function authorTools() {
  return import(new URL("../../evidence/" + work + "/flow.mjs", import.meta.url));
}
async function flow(page) {
  const { testFlow } = await authorTools();
  const observations = await testFlow(page, lang);
  assert.ok(observations && typeof observations === "object" && Object.keys(observations).length, "Flow must return its checked selections and export observations");
  return observations;
}
async function captureTexture(page, prefix) {
  const data = await page.evaluate(() => Promise.race([
    window.__visualProbe.readFrame(true),
    new Promise((_, reject) => setTimeout(() => reject(Error("GPU readback timed out")), 20_000)),
  ]));
  const raw = Buffer.from(data.png, "base64");
  const { png, ...stats } = data;
  assert.ok(raw.length > 0);
  const file = prefix + "-texture.png";
  await writeFile(join(dir, file), raw);
  return { file, sha256: hash(raw), ...stats };
}
async function stageImage(page, name) {
  const clip = await scene(page).evaluate(element => {
    const box = element.getBoundingClientRect();
    const x = Math.max(0, Math.floor(box.left)), y = Math.max(0, Math.floor(box.top));
    return { x, y, width: Math.min(innerWidth, Math.ceil(box.right)) - x,
      height: Math.min(innerHeight, Math.ceil(box.bottom)) - y };
  });
  assert.ok(clip.width > 0 && clip.height > 0, "Stage is outside viewport");
  const file = name + ".png";
  const start = await timer(page);
  const png = await page.screenshot({ path: join(dir, file), clip, timeout: 20_000 });
  return { file, sha256: hash(png), start, end: await timer(page), clip };
}
async function quiet(page) {
  await page.waitForTimeout(250);
  const before = await count(page);
  await page.waitForTimeout(1100);
  assert.equal(await count(page), before);
  return before;
}
let browser;
async function withPage(options, test) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, hasTouch: mobile, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  try { return await test(page); }
  finally { await context.close(); }
}
async function instrument(page) {
  const probe = await observe(page, { readPixels: true });
  await page.addInitScript(installPresentationMeter);
  return probe;
}
// A work may ship fonts alongside its own licensed media. Only allow files
// committed to this candidate, including those in the common font directory.
const fontPaths = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--",
  "public/fonts/", "public/media/" + entry.slug + "/"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/).filter(path => /\.(?:woff2?|ttf|otf)$/i.test(path))
  .map(path => base + path.slice("public/".length));
async function privacy(page, probe) {
  await probe.assertPrivate(server.origin, { fontPaths });
  return probe.requests;
}
function collectDiagnostics(page) {
  const problems = [];
  page.on("console", message => {
    if (message.type() === "error") problems.push({ kind: "console", message: message.text(), location: message.location() });
  });
  page.on("response", response => {
    if (response.status() >= 400) problems.push({ kind: "http", status: response.status(), url: response.url() });
  });
  page.on("pageerror", error => problems.push({ kind: "script", message: error.message }));
  return problems;
}
const inPage = (options, fn) => () => withPage(options, fn);
try {
  browser = await chromium.launch(launch);
  report.browser = browser.version();
  const system = await browser.newBrowserCDPSession();
  const { gpu } = await system.send("SystemInfo.getInfo");
  report.renderer = gpu.devices.map(({ vendorString, deviceString }) => ({ vendorString, deviceString }));
  await system.detach();

  await check("first-three-seconds", inPage({}, async page => {
    await captureOpening({ browser, page, url, dir, report, inspectRunningMotion: series === "m05" });
  }));

  await check("initial-and-material-sequence", inPage({}, async page => {
    await instrument(page);
    await open(page);
    report.capture.firstFold = "first-fold.png";
    report.capture.firstFoldStart = await timer(page);
    await frame(page, "first-fold");
    report.capture.firstFoldEnd = await timer(page);
    await phase(page, "running");
    const cycle = await scene(page).getAttribute("data-cycle-seconds");
    assert.ok(cycle === "evolving" || (Number.isFinite(Number(cycle)) && Number(cycle) > 0), "Declare a valid material cycle");
    report.capture.cycle = cycle;
    const span = Math.max(8, cycle === "evolving" ? 8 : Number(cycle)) * 1000;
    const times = [0, 900, 2200, Math.max(3800, span / 2), Math.max(6000, span * .75), span + 40];
    const samples = report.capture.sequence = [];
    for (const [i, target] of times.entries()) {
      if (i) await page.waitForTimeout(Math.max(0, target - (await timer(page) - samples[0].texture.submittedAt)));
      const texture = await captureTexture(page, "frame-" + i);
      const composite = await stageImage(page, "frame-" + i + "-composite");
      samples.push({ texture, composite, seconds: (texture.submittedAt - (samples[0]?.texture.submittedAt ?? texture.submittedAt)) / 1000 });
    }
    assert.ok(samples.at(-1).seconds >= span / 1000);
    assert.ok(samples.every(({ texture }) => texture.colors > 1 && texture.average[3] > 0), "Empty presentation texture");
    assert.ok(new Set(samples.map(({ texture }) => texture.sha256)).size > 1, "GPU imagery never changed");
    assert.equal(await scene(page).locator("canvas").count(), 1);
    return page.evaluate(() => ({ adapter: window.__m04Adapter, devices: window.__visualProbe.devices }));
  }));

  await check("PERF-1", inPage({}, async page => {
    // No screenshots, pixel copies, per-frame readbacks or commercial interactions during timing.
    await page.addInitScript(installPresentationMeter);
    await open(page);
    await phase(page, "running");
    report.performance = await measureSubmissions(page);
    checkPerformance(report.performance);
  }));

  await check("GPU-2-controls-and-pause", inPage({}, async page => {
    await instrument(page);
    await open(page);
    await phase(page, "running");
    const { setMaterial } = await authorTools();
    const input = mobile ? "touch" : "keyboard";
    const controls = report.capture.controls = [];
    for (const state of [0, 1, 2, 0]) {
      await setMaterial(page, state, input);
      await phase(page, "running");
      const id = "control-" + controls.length;
      controls.push({ state, composite: await stageImage(page, id), texture: await captureTexture(page, id) });
    }
    const pause = page.locator("[data-pause]");
    const toggle = () => mobile ? pause.tap() : pause.press("Enter");
    await pause.scrollIntoViewIfNeeded();
    const freeze = report.capture.freeze = {};
    freeze.before = await stageImage(page, "pause-before");
    await toggle();
    await phase(page, "paused");
    assert.ok(await scene(page).locator("canvas").isVisible());
    freeze.immediate = await stageImage(page, "pause-immediate");
    await quiet(page);
    freeze.after1s = await stageImage(page, "pause-after-1s");
    assert.equal(freeze.immediate.sha256, freeze.after1s.sha256, "Frozen composite changed");
    const frozen = await count(page);
    await toggle();
    await phase(page, "running");
    await page.waitForFunction(last => window.__m04Times.length > last + 1, frozen);
    freeze.resumed = await stageImage(page, "pause-resumed");
    assert.notEqual(freeze.resumed.sha256, freeze.after1s.sha256, "Resumed composite remained frozen");
    await toggle(); await toggle(); await toggle(); await toggle();
    await phase(page, "running");
  }));

  if (series === "m05" && work === "V008") await check("hero-interaction", inPage({}, async page => {
    await instrument(page);
    await open(page);
    await phase(page, "running");
    const { testHeroInteraction } = await authorTools();
    const input = mobile ? "touch" : "keyboard";
    const evidence = report.capture.heroInteraction = { input, samples: [] };
    await page.evaluate(() => {
      window.__m05HeroInputs = [];
      for (const type of ["keydown", "pointerdown"]) {
        document.addEventListener(type, event => {
          if (event.isTrusted) window.__m05HeroInputs.push({
            type, key: event.key, pointerType: event.pointerType, at: performance.now(),
          });
        }, { capture: true });
      }
    });
    const checkpoints = ["before", "after", "reset"];
    const capture = async state => {
      assert.equal(state, checkpoints[evidence.samples.length], "Scoop and reset must both be observed");
      await scene(page).scrollIntoViewIfNeeded();
      const name = "interaction-" + state;
      evidence.samples.push({ state, inputs: await page.evaluate(() => window.__m05HeroInputs.splice(0)),
        composite: await stageImage(page, name), texture: await captureTexture(page, name) });
    };
    evidence.observations = await testHeroInteraction(page, input, capture);
    assert.ok(evidence.observations && Object.keys(evidence.observations).length);
    assert.deepEqual(evidence.samples.map(s => s.state), checkpoints);
    for (const sample of evidence.samples.slice(1)) {
      assert.ok(sample.inputs.some(e => mobile ? e.type === "pointerdown" && e.pointerType === "touch" :
        e.type === "keydown" && e.key !== "Tab"), "No real " + input + " input for " + sample.state);
    }
    assert.notEqual(evidence.samples[0].composite.sha256, evidence.samples[1].composite.sha256, "Scoop did not change the visible hero");
    assert.notEqual(evidence.samples[1].composite.sha256, evidence.samples[2].composite.sha256, "Reset did not change the visible hero");
  }));

  await check("BIZ-2-and-privacy", inPage({}, async page => {
    report.pageProblems = collectDiagnostics(page);
    const probe = await instrument(page);
    await open(page);
    await phase(page, "running");
    const result = await flow(page);
    report.capture.flow = result;
    report.requests = await privacy(page, probe);
    await page.screenshot({ path: join(dir, "flow-complete.png"), fullPage: true });
    if (series === "m05") assert.deepEqual(report.pageProblems, []);
    return result;
  }));
  for (const mode of ["no-js", "gpu-init-fail", "reduced"]) {
    await check("FALL-1-" + mode, inPage({ javaScriptEnabled: mode !== "no-js", reducedMotion: mode === "reduced" ? "reduce" : "no-preference" }, async page => {
      if (mode !== "no-js") await instrument(page);
      if (mode === "gpu-init-fail") await page.addInitScript(() => {
        if (window.GPU) GPU.prototype.requestAdapter = async () => null;
      });
      await open(page);
      if (mode !== "no-js") {
        await phase(page, mode === "reduced" ? "reduced" : "unavailable");
        assert.equal(await count(page), 0);
      }
      await frame(page, mode);
      await page.screenshot({ path: join(dir, mode + "-page.png"), fullPage: true });
      assert.ok(await page.locator("main").isVisible() && await page.locator("h1").isVisible());
      if (mode === "gpu-init-fail") return flow(page);
    }));
  }
  await check("FALL-2-and-PERF-2", inPage({}, async page => {
    const probe = await instrument(page);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await open(page);
    await phase(page, "running");
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await phase(page, "still");
    await quiet(page);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await phase(page, "running");
    // Exercise the same lifecycle listener under an explicit hidden notification.
    // The fixture is recorded as synthetic; real navigation is tested separately.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.deepEqual(await page.evaluate(() => [document.visibilityState, document.hidden]), ["hidden", true]);
    await phase(page, "still");
    await quiet(page);
    await page.evaluate(() => {
      delete document.visibilityState;
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.deepEqual(await page.evaluate(() => [document.visibilityState, document.hidden]), ["visible", false]);
    await phase(page, "running");
    await privacy(page, probe);
    const before = await page.evaluate(() => window.__visualProbe.devices);
    await page.evaluate(() => window.__visualProbe.loseDevice());
    await page.waitForFunction(last => window.__visualProbe.devices > last ||
      document.querySelector("[data-stage]").dataset.motion === "unavailable", before, { timeout: 35_000 });
    await page.waitForFunction(() => ["running", "unavailable"].includes(document.querySelector("[data-stage]").dataset.motion), null, { timeout: 35_000 });
    const afterLoss = await scene(page).getAttribute("data-motion");
    if (afterLoss === "running") await captureTexture(page, "device-recovered");
    else assert.ok(await page.locator("main").isVisible());
    await frame(page, "after-device-loss");
    const next = await page.goto(server.origin + base);
    assert.equal(next.status(), 200);
    // A BFCache restoration commits the previous page without a fresh load.
    // Assert the actual returned page and subsequent rendering independently.
    await page.goBack({ waitUntil: "commit" });
    assert.equal(page.url(), url);
    assert.ok(await scene(page).isVisible());
    await scene(page).scrollIntoViewIfNeeded();
    await phase(page, "running");
    assert.equal(await scene(page).locator("canvas").count(), 1);
    await captureTexture(page, "navigation-return");
    assert.deepEqual(errors, []);
    return { afterLoss, hiddenMode: "synthetic visibilitychange", navigation: "actual away/back" };
  }));
  await check("responsive-and-focus", inPage({ reducedMotion: "reduce" }, async page => {
    await open(page);
    const layouts = report.capture.layouts = [];
    for (const width of mobile ? [320, 390] : [768, 1440]) {
      await page.setViewportSize({ width, height: size.height });
      const layout = await page.evaluate(layoutInventory);
      await page.screenshot({ path: join(dir, "layout-" + width + ".png"), fullPage: true });
      layouts.push(layout);
      assert.ok(layout.scrollWidth <= width + 1, "Horizontal overflow at " + width);
    }
    const focus = report.capture.focus = [];
    for (let step = 0; step < 150; step++) {
      await page.keyboard.press("Tab");
      const item = await page.evaluate(() => {
        const el = document.activeElement;
        const style = getComputedStyle(el);
        return { tag: el.tagName, id: el.id, text: (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.innerText || el.title || el.name || "").trim().slice(0, 100),
          outline: [style.outlineStyle, style.outlineWidth, style.outlineColor], boxShadow: style.boxShadow,
          visibleFocus: el.matches(":focus-visible"), top: el.getBoundingClientRect().top + scrollY };
      });
      if (item.tag === "BODY") break;
      focus.push(item);
    }
    assert.ok(focus.length > 0);
  }));
  if (!mobile) await check("desktop-real-200-percent-zoom", async () => {
    report.capture.zoom = await captureBrowserZoom(chromium, launch, url, join(dir, "layout-zoom-200.png"));
  });
  if (!mobile && lang === "zh-Hant") await check("Edge-default-render-and-flow", async () => {
    // Test the installed Microsoft Edge with its ordinary GPU selection.
    // Chromium/WARP test flags would change the condition the user reported.
    const edge = await chromium.launch({ channel: "msedge", headless: true });
    try {
      const context = await edge.newContext({ viewport: size, reducedMotion: "no-preference" });
      const page = await context.newPage();
      const problems = collectDiagnostics(page);
      const probe = await observe(page);
      await page.addInitScript(installPresentationMeter);
      await open(page);
      const details = report.capture.edge = { channel: "msedge", version: edge.version(),
        runtime: "GitHub-hosted Windows Server 2025, headless Edge, default GPU selection",
        requestedGraphicsFlags: [], url: page.url(), problems };
      await frame(page, "edge-first-fold");
      await page.waitForFunction(() => ["running", "unavailable"].includes(
        document.querySelector("[data-stage]")?.dataset.motion), null, { timeout: 35_000 });
      details.phase = await scene(page).getAttribute("data-motion");
      details.gpu = await page.evaluate(() => ({
        api: Boolean(navigator.gpu), devices: window.__visualProbe.devices,
        textures: window.__visualProbe.textures, adapter: window.__m04Adapter ?? null,
      }));
      await frame(page, "edge-settled-fold");
      if (details.phase === "running") {
        await page.waitForFunction(() => window.__m04Times.length >= 2);
        details.presentationSubmissions = await count(page);
        assert.ok(details.gpu.devices >= 1);
        details.presentation = "WebGPU";
      } else {
        assert.ok(await scene(page).isVisible() && await page.locator("h1").isVisible());
        details.presentation = "static fallback";
      }
      details.flow = await flow(page);
      details.requests = await privacy(page, probe);
      if (details.presentation === "WebGPU") {
        // A separate diagnostic page adds COPY_SRC for reading texture bytes.
        // The page used for the default-start and customer-flow checks above
        // kept the application's original canvas configuration.
        const diagnostic = await context.newPage();
        await instrument(diagnostic);
        await open(diagnostic);
        await phase(diagnostic, "running");
        details.diagnosticTexture = await captureTexture(diagnostic, "edge-native");
        assert.ok(details.diagnosticTexture.colors > 1 && details.diagnosticTexture.average[3] > 0);
      }
      return { phase: details.phase, presentation: details.presentation, version: details.version };
    } finally {
      await edge.close();
    }
  });
} catch (error) {
  report.checks.runner = { status: "FAIL", error: String(error.stack || error) };
} finally {
  await save();
  await browser?.close();
  await server.close();
}
if (Object.values(report.checks).some(check => check.status !== "PASS")) process.exitCode = 1;
