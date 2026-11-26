import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { serveDist } from "./server.mjs";

if (process.env.RUNNER_ENVIRONMENT !== "github-hosted" || process.env.RUNNER_OS !== "Windows") throw Error("Isolated Windows runner required");
const slug = process.argv[2];
await mkdir("review", { recursive: true });
const server = await serveDist();
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"] });
const results = [];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
try {
  for (const [mode, width, height] of [["desktop",1440,900],["mobile",390,844]]) {
    const page = await browser.newPage({ viewport: { width,height }, hasTouch: mode === "mobile" });
    page.setDefaultTimeout(10000);
    const r = { mode, slug, errors: [], offsite: [], downloads: [] };
    results.push(r);
    page.on("console", m => { if (["error","warning"].includes(m.type())) r.errors.push(m.text().slice(0,800)); });
    page.on("pageerror", e => r.errors.push(e.message));
    page.on("request", req => { if (req.url().startsWith("http") && !req.url().startsWith(server.origin + "/")) r.offsite.push(req.url()); });
    try {
      await page.goto(server.origin + "/glossquote-visuals/" + (mode === "desktop" ? "" : "en/") + "works/" + slug + "/");
      await page.screenshot({path:"review/" + mode + "-first.jpg"});
      const stage = page.locator("[data-stage]");
      await stage.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => ["running","unavailable","reduced"].includes(document.querySelector("[data-stage]").dataset.motion), null,{timeout:30000}).catch(()=>{});
      r.phase = await stage.getAttribute("data-motion");
      r.adapter = await page.evaluate(async () => (await navigator.gpu?.requestAdapter())?.info?.description || null);
      for (const n of [0,1,2]) {
        await page.waitForTimeout(1000);
        await stage.screenshot({path:"review/" + mode + "-stage-" + n + ".jpg"});
      }
      const instrument = page.locator("[data-instrument] input");
      if (await instrument.count()) {
        await instrument.first().focus();
        await page.keyboard.press("ArrowRight");
        r.keyboardChoice = await page.locator("[data-instrument] input:checked").inputValue();
      }
      const pause = page.locator("[data-pause]");
      if (await pause.isEnabled() && await pause.isVisible()) {
        await pause.focus(); await page.keyboard.press("Space");
        r.pause = await pause.getAttribute("aria-pressed");
        const canvas = stage.locator("canvas");
        await page.waitForTimeout(400);
        const a = hash(await canvas.screenshot());
        await page.waitForTimeout(1100);
        r.pausedPixelsUnchanged = a === hash(await canvas.screenshot());
      }
      const qty = page.locator('input[name="guests"],input[name="hikers"],input[name="quantity"]').first();
      const download = page.locator('button').filter({hasText: /下載|download/i}).last();
      for (const value of ["2.5","3"]) {
        await qty.fill(value);
        await qty.press("Tab");
        const received = page.waitForEvent("download",{timeout:2500}).catch(()=>null);
        if (await download.isEnabled()) await download.click();
        const file = await received;
        r.downloads.push({ value, file: file?.suggestedFilename() || null, content: file ? (await readFile(await file.path(),"utf8")).slice(0,1800) : null });
      }
      await page.evaluate(()=>scrollTo(0,0));
      r.overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth);
      await page.screenshot({path:"review/" + mode + "-page.jpg",fullPage:true});
    } catch (error) { r.failure = error.message; }
    await writeFile("review/results.json",JSON.stringify(results,null,2));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
