import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { base, registry, root } from "../../scripts/site-map.mjs";
import { installPresentationMeter, measureSubmissions, checkPerformance } from "./m04-measure.mjs";
import { serveDist } from "./server.mjs";

assert.ok(process.platform === "win32" && process.env.RUNNER_ENVIRONMENT === "github-hosted" &&
  process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY?.toLowerCase() === "kystr/glossquote-visuals");
const [id,lang]=process.argv.slice(2);
assert.ok(["zh-Hant","en"].includes(lang) && ["V009","V010"].includes(id));
const {slug}=registry.works.find(work=>work.id===id);
const sha=process.env.GITHUB_SHA;
const dir=join(root,".runs","art-preview",id+"-"+lang);
await mkdir(dir,{recursive:true});
const server=await serveDist();
const browser=await chromium.launch({headless:true,channel:"chromium",ignoreDefaultArgs:["--disable-back-forward-cache"],
  args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
const report={id,lang,sha,browser:browser.version(),errors:[]};
const options={viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:false};
const url=server.origin+base+(lang==="en"?"en/":"")+"works/"+slug+"/";
async function open(page) {
  const response=await page.goto(url,{waitUntil:"domcontentloaded"});
  assert.equal(response.status(),200);
  assert.equal(await page.locator("html").getAttribute("lang"),lang);
  assert.equal(await page.locator("h1").count(),1);
  assert.equal(await page.locator("[data-stage]").count(),1);
  await page.waitForFunction(()=>document.querySelector("[data-stage]")?.dataset.motion==="running",null,{timeout:35000});
}
try {
  const ctx=await browser.newContext(options);
  const page=await ctx.newPage();
  await page.addInitScript(installPresentationMeter);
  await open(page);
  report.performance=await measureSubmissions(page);
  try {checkPerformance(report.performance);report.status="PASS";}
  catch(error){report.status="FAIL";report.errors.push(String(error));process.exitCode=1;}
  const {medianMs,p95Ms,longestMs}=report.performance;
  console.log("PERF-1",report.status,JSON.stringify({medianMs,p95Ms,longestMs}));
  await ctx.close();
  // Use a new context for interaction and screenshots after the timing sample.
  const evidence=await browser.newContext(options);
  const art=await evidence.newPage();
  await open(art);
  const stage=art.locator("[data-stage]");
  const api=await import("../../evidence/"+id+"/flow.mjs");
  report.interaction=await api.testApprovedHero(art,"mouse",async state=>{
    assert.match(state,/^[a-z-]+$/);
    await stage.screenshot({path:join(dir,"approved-"+state+".png"),scale:"css"});
  });
  await evidence.close();
} catch(error) {report.errors.push(String(error.stack||error));process.exitCode=1;}
finally {
  await writeFile(join(dir,"preview.json"),JSON.stringify(report,null,2));
  await browser.close();
  await server.close();
}
