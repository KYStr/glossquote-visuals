import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

// DevTools filmstrips use Screenshot.ts (monotonic microseconds) and the native
// Chromium JPEG in args.snapshot. Convert it for delivery only after recording.
export function firstVisitFrames(events, navigationStartMs, visibleAt) {
  return events.filter(event => event.name === "Screenshot" && typeof event.args?.snapshot === "string")
    .map(event => ({ ms: event.ts / 1000 - navigationStartMs, traceUs: event.ts, jpeg: event.args.snapshot }))
    .filter(frame => frame.ms >= visibleAt && frame.ms <= 3000)
    .sort((left, right) => left.ms - right.ms);
}

async function decodeFrame(page, jpeg, view) {
  return page.evaluate(async ({ encoded, view }) => {
    const bytes = Uint8Array.fromBase64(encoded);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const scaleX = bitmap.width / view.viewport.width, scaleY = bitmap.height / view.viewport.height;
    const x = Math.max(0, Math.floor(view.stage.x * scaleX));
    const y = Math.max(0, Math.floor(view.stage.y * scaleY));
    const right = Math.min(bitmap.width, Math.ceil(view.stage.right * scaleX));
    const bottom = Math.min(bitmap.height, Math.ceil(view.stage.bottom * scaleY));
    if (right <= x || bottom <= y) throw Error("No stage visible in first-visit viewport");
    const pixels = context.getImageData(x, y, right-x, bottom-y).data;
    const digest = await crypto.subtle.digest("SHA-256", pixels);
    const png = await canvas.convertToBlob({ type: "image/png" });
    bitmap.close();
    return { png: new Uint8Array(await png.arrayBuffer()).toBase64(),
      stageHash: new Uint8Array(digest).toHex(), crop: [x,y,right-x,bottom-y],
      jpegSize: [canvas.width, canvas.height] };
  }, { encoded: jpeg, view });
}

async function prepareNeutralTab(page) {
  // Model a visitor whose browser already displays a tab. This neutral page
  // loads neither the target origin nor the shader package and uses no GPU API.
  await page.setContent('<html lang="en"><title>Initial tab</title><body style="background:#ddd">Initial tab</body></html>');
  await page.screenshot({ type: "jpeg", quality: 40 });
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const stage = document.querySelector("[data-stage]");
      const title = document.querySelector("h1");
      if (!stage || !title) return;
      const io = new IntersectionObserver(entries => {
        const entry = entries.at(-1);
        const style = getComputedStyle(stage);
        if (!entry?.isIntersecting || style.visibility !== "visible" || Number(style.opacity) === 0) return;
        if (!title.checkVisibility({ visibilityProperty: true })) return;
        const { x,y,right,bottom } = entry.boundingClientRect;
        window.__m04InitialView = { at: entry.time, stage: { x,y,right,bottom },
          viewport: { width: innerWidth, height: innerHeight } };
        io.disconnect();
      });
      io.observe(stage);
    }, { once: true });
  });
}

const documentTiming = page => page.evaluate(() => ({
  origin: performance.timeOrigin, anchorMs: performance.mark("m04-first-visit-anchor").startTime,
  firstContentfulPaint: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
  view: window.__m04InitialView ?? null,
}));

async function rendererClock(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const get = name => {
    const metric = metrics.find(item => item.name === name);
    return metric ? metric.value * 1000 : null;
  };
  return { nowMs: get("Timestamp"), navigationMs: get("NavigationStart") };
}

async function captureTrace(browser, page, url) {
  await prepareNeutralTab(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  let timing, trace;
  try {
    await browser.startTracing(page, { screenshots: true, categories: ["-*", "blink.user_timing", "loading"] });
    try {
      const response = await page.goto(url, { waitUntil: "commit", timeout: 30_000 });
      assert.equal(response.status(), 200);
      // No screenshots, control interaction, locator or rendering readiness
      // assertions in the measurement window. The compositor owns capture time.
      await page.waitForTimeout(3500);
      timing = await documentTiming(page);
      timing.navigationStartMetricMs = (await rendererClock(cdp)).navigationMs;
    } finally {
      trace = JSON.parse((await browser.stopTracing()).toString("utf8"));
    }
  } finally { await cdp.detach(); }
  const events = trace.traceEvents;
  const anchor = events.find(event => event.name === "m04-first-visit-anchor" && event.cat?.includes("blink.user_timing"));
  const anchored = anchor ? anchor.ts / 1000 - timing.anchorMs : null;
  const start = anchored ?? timing.navigationStartMetricMs;
  const navEvent = events.find(event => event.name === "navigationStart" && event.args?.data?.documentLoaderURL === url);
  const traceStart = navEvent ? navEvent.ts / 1000 : start;
  const clock = { navigationStartTraceMs: traceStart, navigationStartEventUs: navEvent?.ts ?? null,
    anchorTraceUs: anchor?.ts ?? null, fcpTraceClockUs: Number.isFinite(timing.firstContentfulPaint) ?
      (traceStart + timing.firstContentfulPaint) * 1000 : null };
  assert.ok(Number.isFinite(start) && start > 0, "Missing navigation time on Chromium trace clock");
  if (anchored !== null && timing.navigationStartMetricMs !== null) {
    assert.ok(Math.abs(anchored - timing.navigationStartMetricMs) < 10, "Navigation clock sources disagree");
  }
  assert.ok(Math.abs(start - traceStart) < 10, "Trace and page navigation refer to different clock origins");
  const total = events.filter(event => event.name === "Screenshot" && typeof event.args?.snapshot === "string").length;
  const firstVisible = Math.max(timing.firstContentfulPaint ?? Infinity, timing.view?.at ?? Infinity);
  const frames = firstVisitFrames(events, traceStart, firstVisible);
  return { frames, detail: { ...timing, ...clock, screenshotEvents: total, filmstripFramesInWindow: frames.length,
    basis: "Original Chromium filmstrip JPEG and compositor trace timestamp on navigation and FCP clock" } };
}

async function captureJpegs(page, url) {
  // Only a missing filmstrip facility uses this method. A late first paint or
  // stationary hero in an available filmstrip remains a failed observation.
  await prepareNeutralTab(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  try {
    const { width, height } = page.viewportSize();
    const response = await page.goto(url, { waitUntil: "commit", timeout: 30_000 });
    assert.equal(response.status(), 200);
    const samples = [];
    for (let index = 0; index < 20; index++) {
      const before = await rendererClock(cdp);
      assert.ok(Number.isFinite(before.nowMs) && before.navigationMs > 0);
      const lower = before.nowMs - before.navigationMs;
      if (lower >= 3000) break;
      const result = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 65, optimizeForSpeed: true,
        fromSurface: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width, height, scale: Math.min(1, 640/width) } });
      const after = await rendererClock(cdp);
      assert.equal(after.navigationMs, before.navigationMs);
      samples.push({ start: lower, ms: after.nowMs - after.navigationMs, jpeg: result.data });
      await page.waitForTimeout(140);
    }
    const timing = await documentTiming(page);
    const firstVisible = Math.max(timing.firstContentfulPaint ?? Infinity, timing.view?.at ?? Infinity);
    const frames = samples.filter(sample => sample.start >= firstVisible && sample.ms <= 3000);
    return { frames, detail: { ...timing, basis: "CDP JPEG capture bounded by renderer clock before/after each call",
      sampleBoundsMs: samples.map(sample => [sample.start, sample.ms]) } };
  } finally { await cdp.detach(); }
}

async function saveFrames(page, dir, captured, frames) {
  // Keep evenly distributed observations including both ends. No frame after
  // the three-second window is eligible even if the renderer starts late.
  const selected = Math.min(frames.length, 12);
  for (let i=0; i<selected; i++) {
    const frame = frames[Math.round(i * (frames.length - 1) / Math.max(1, selected - 1))];
    const source = "opening-" + i + ".jpg", file = "opening-" + i + ".png";
    const jpg = Buffer.from(frame.jpeg, "base64");
    const decoded = await decodeFrame(page, frame.jpeg, captured.view);
    const png = Buffer.from(decoded.png, "base64");
    await Promise.all([writeFile(join(dir, source), jpg), writeFile(join(dir, file), png)]);
    captured.frames.push({ start: frame.start, ms: frame.ms, traceUs: frame.traceUs, file, sha256: sha256(png), source,
      originalSha256: sha256(jpg), stageHash: decoded.stageHash, crop: decoded.crop, jpegSize: decoded.jpegSize });
  }
  assert.ok(captured.frames.length >= 2 && new Set(captured.frames.map(frame => frame.stageHash)).size >= 2,
    "Need two distinct, visible stage images from the first three navigation seconds");
}

export async function captureOpening({ browser, page, url, dir, report }) {
  const first = await captureTrace(browser, page, url);
  const captured = report.capture.opening = { ...first.detail, frames: [],
    scenario: "Already-open neutral tab, fresh context, first visit to work origin, no GPU prewarm or user input" };
  if (first.detail.screenshotEvents > 0) {
    await saveFrames(page, dir, captured, first.frames);
    return;
  }
  captured.traceAttempt = { ...first.detail, result: "No compositor Screenshot event emitted by this Chromium session" };
  const context = await browser.newContext({ viewport: page.viewportSize(), deviceScaleFactor: 1, hasTouch: report.viewport === "mobile" });
  try {
    const fresh = await context.newPage();
    const second = await captureJpegs(fresh, url);
    Object.assign(captured, second.detail);
    await saveFrames(fresh, dir, captured, second.frames);
  } finally { await context.close(); }
}
