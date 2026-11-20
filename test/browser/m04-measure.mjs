import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { PNG } from "playwright-core/lib/utilsBundle";

// This hook records the first successful queue submission after a presentation
// texture is acquired. Compute-only submissions and readback copies are excluded.
export function installPresentationMeter() {
  window.__m04Times = [];
  if (!window.GPUCanvasContext || !window.GPUQueue || !window.GPUAdapter) return;
  const nativeTexture = GPUCanvasContext.prototype.getCurrentTexture;
  const nativeSubmit = GPUQueue.prototype.submit;
  const nativeDevice = GPUAdapter.prototype.requestDevice;
  const nativeConfigure = GPUCanvasContext.prototype.configure;
  const contextQueues = new WeakMap();
  const pendingQueues = new Set();
  GPUAdapter.prototype.requestDevice = async function (...args) {
    const device = await nativeDevice.apply(this, args);
    const info = this.info;
    window.__m04Adapter = { vendor: info.vendor, architecture: info.architecture,
      device: info.device, description: info.description, isFallbackAdapter: info.isFallbackAdapter };
    return device;
  };
  GPUCanvasContext.prototype.configure = function (options) {
    const result = nativeConfigure.call(this, options);
    contextQueues.set(this, options.device.queue);
    return result;
  };
  GPUCanvasContext.prototype.getCurrentTexture = function () {
    const texture = nativeTexture.call(this);
    if (this.canvas.closest?.("[data-stage]")) pendingQueues.add(contextQueues.get(this));
    return texture;
  };
  GPUQueue.prototype.submit = function (...args) {
    const submitted = pendingQueues.delete(this);
    const result = nativeSubmit.apply(this, args);
    if (submitted) window.__m04Times.push(performance.now());
    return result;
  };
}

export async function measureSubmissions(page) {
  await page.waitForTimeout(2000);
  const data = await page.evaluate(async () => {
    const start = performance.now();
    do {
      await new Promise(resolve => setTimeout(resolve, Math.max(1, start + 10_000 - performance.now())));
    } while (performance.now() - start < 10_000);
    const end = performance.now();
    return { start, end, timestamps: window.__m04Times.filter(t => t >= start && t <= end),
      adapter: window.__m04Adapter, dpr: devicePixelRatio, cssSize: [innerWidth, innerHeight],
      canvasSize: [...document.querySelectorAll("[data-stage] canvas")].map(c => [c.width, c.height]) };
  });
  const frames = data.timestamps;
  // Include both observation-window edges so a renderer stalling at either
  // end cannot pass with a short burst of frequent submissions.
  const edges = [data.start, ...frames, data.end];
  const gaps = edges.slice(1).map((time, i) => time - edges[i]).sort((a,b) => a-b);
  const percentile = p => gaps[Math.ceil(gaps.length * p) - 1];
  return { ...data, measuredMs: data.end - data.start, medianMs: percentile(.5), p95Ms: percentile(.95),
    longestMs: gaps.at(-1), method: "Window-bounded presentation-texture queue submissions; CPU timestamps, not display scan-out." };
}

export function checkPerformance(data) {
  assert.ok(data.measuredMs >= 10_000 && data.timestamps.length >= 2 && data.canvasSize.length === 1);
  assert.ok(data.medianMs <= 34 && data.p95Ms <= 50 && data.longestMs <= 150,
    JSON.stringify({ medianMs: data.medianMs, p95Ms: data.p95Ms, longestMs: data.longestMs }));
}

export function layoutInventory() {
  const rect = element => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  };
  const name = el => (el.labels?.[0]?.textContent || el.getAttribute("aria-label") ||
    el.innerText || el.value || el.getAttribute("title") || el.id || "").trim().slice(0, 90);
  const visible = el => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
    el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
  const controls = [...document.querySelectorAll("main button, main a[href], main input, main select, main summary")].filter(visible);
  const text = [...document.querySelectorAll("h1,h2,h3,p,button,summary,label,a[href]")].filter(visible);
  return {
    viewport: [innerWidth, innerHeight], scrollWidth: document.documentElement.scrollWidth,
    controls: controls.map(el => ({ label: name(el), tag: el.tagName, rect: rect(el),
      labels: [...el.labels ?? []].map(label => ({ text: name(label), rect: rect(label) })), disabled: el.disabled })),
    text: text.map(el => {
      const style = getComputedStyle(el);
      const layers = [];
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
        const background = getComputedStyle(ancestor);
        layers.push({ color: background.backgroundColor, image: background.backgroundImage !== "none", opacity: background.opacity });
        if (background.backgroundColor.startsWith("rgb(")) break;
      }
      return { label: name(el), tag: el.tagName, rect: rect(el), color: style.color,
        size: style.fontSize, weight: style.fontWeight, backgroundLayers: layers };
    }),
  };
}

// Use Chromium's tabs.setZoom on a disposable GitHub VM profile. This changes
// actual tab zoom, including its layout viewport, unlike CSS transforms.
export async function captureBrowserZoom(chromium, options, url, file) {
  const directory = await mkdtemp(join(tmpdir(), "gq-m04-zoom-"));
  const extension = join(directory, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({
    name: "Isolated tab zoom check", version: "1.0", manifest_version: 3, permissions: ["tabs"],
    background: { service_worker: "zoom.js" },
  }));
  await writeFile(join(extension, "zoom.js"), 'chrome.runtime.onInstalled.addListener(() => {});');
  const context = await chromium.launchPersistentContext(join(directory, "profile"), {
    ...options, args: [...options.args, "--disable-extensions-except=" + extension, "--load-extension=" + extension],
    viewport: { width: 1440, height: 900 }, reducedMotion: "reduce",
  });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker", { timeout: 15_000 });
    const zoom = await worker.evaluate(async url => {
      const tab = (await chrome.tabs.query({})).find(item => item.url === url);
      if (!tab) throw new Error("Site tab unavailable for zoom measurement");
      await chrome.tabs.setZoom(tab.id, 2);
      return chrome.tabs.getZoom(tab.id);
    }, url);
    assert.equal(zoom, 2);
    await page.waitForFunction(() => innerWidth <= 721);
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-type-pending"));
    await page.evaluate(async () => { await document.fonts.ready; });
    const scrollToPosition = position => page.evaluate(async y => {
      scrollTo({ top: y, behavior: "instant" });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all([...document.images].filter(img => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      }).map(img => img.decode()));
      return { y: scrollY, width: innerWidth, height: innerHeight, dpr: devicePixelRatio };
    }, position);
    const bottom = await scrollToPosition(10_000_000);
    await scrollToPosition(0);
    const layout = await page.evaluate(layoutInventory);
    assert.ok(layout.scrollWidth <= layout.viewport[0] + 1);
    // A fullPage CSS clip loses the right half under native tab zoom. Capture
    // Chromium's original un-clipped compositor viewport at each scroll offset.
    // Preserve the raw PNGs and join their unique rows at 1:1 pixel resolution.
    const cdp = await context.newCDPSession(page);
    const { width, height } = page.viewportSize();
    assert.equal(bottom.width * bottom.dpr, width);
    assert.equal(bottom.height * bottom.dpr, height);
    const pageHeight = Math.round((bottom.y + bottom.height) * bottom.dpr);
    const joined = new PNG({ width, height: pageHeight });
    const tiles = [];
    let writtenRows = 0;
    while (writtenRows < pageHeight) {
      const y = Math.min(bottom.y, Math.max(0, writtenRows / bottom.dpr - 16));
      const viewport = await scrollToPosition(y);
      assert.deepEqual([viewport.width, viewport.height, viewport.dpr], [bottom.width, bottom.height, bottom.dpr]);
      const capture = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const bytes = Buffer.from(capture.data, "base64");
      const tile = PNG.sync.read(bytes);
      assert.deepEqual([tile.width, tile.height], [width, height], "Native screenshot must cover the entire physical viewport");
      const name = basename(file, ".png") + "-viewport-" + tiles.length + ".png";
      await writeFile(join(dirname(file), name), bytes);
      const top = Math.round(viewport.y * viewport.dpr);
      const skip = writtenRows - top;
      assert.ok(skip >= 0 && skip < tile.height, "Viewport strips must overlap or abut and advance");
      const rows = Math.min(tile.height - skip, pageHeight - writtenRows);
      const stride = width * 4;
      tile.data.copy(joined.data, writtenRows * stride, skip * stride, (skip + rows) * stride);
      tiles.push({ name, cssY: viewport.y, top, copiedFromRow: skip, copiedRows: rows });
      writtenRows += rows;
    }
    assert.equal(writtenRows, pageHeight);
    await writeFile(file, PNG.sync.write(joined));
    return { zoom, layout, capture: { method: "Native un-clipped compositor viewport PNGs, lossless 1:1 row assembly",
      width, height: pageHeight, viewportHeight: height, devicePixelRatio: bottom.dpr, tiles } };
  } finally {
    await context.close();
  }
}
