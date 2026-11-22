import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { base, registry, root } from "../../scripts/site-map.mjs";
import { serveDist } from "./server.mjs";

assert.ok(process.platform === "win32" && process.env.RUNNER_ENVIRONMENT === "github-hosted" &&
  process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY?.toLowerCase() === "kystr/glossquote-visuals",
  "Art preview only runs inside the project's isolated GitHub Windows runner");
const id = process.argv[2];
assert.ok(["V008","V009","V010"].includes(id));
const work = registry.works.find(w => w.id === id);
const dir = join(root,".runs","art-preview",id);
await mkdir(dir,{recursive:true});
const server = await serveDist();
const browser = await chromium.launch({channel:"chromium",headless:true,args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
const report = {id, sha:process.env.GITHUB_SHA, browser:browser.version(), snapshots:[], errors:[]};
try {
  const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror",err => report.errors.push(err.message));
  const stage = page.locator("[data-stage]");
  const snap = async name => {
    assert.match(name,/^[a-z0-9-]+$/);
    const png = join(dir,name+".png");
    await stage.screenshot({path:png,scale:"css"});
    report.snapshots.push({name,motion:await stage.getAttribute("data-motion"),time:await page.evaluate(() => performance.now())});
  };
  await page.goto(server.origin+base+"works/"+work.slug+"/",{waitUntil:"domcontentloaded"});
  await page.screenshot({path:join(dir,"first-viewport.png")});
  await page.waitForFunction(() => document.querySelector("[data-stage]")?.dataset.motion === "running",null,{timeout:40000});
  const start = Date.now();
  for(const ms of [0,600,1200,2000,3000,4200,5500,8000]) {
    if (Date.now()-start<ms) await page.waitForTimeout(ms-Date.now()+start);
    await snap("opening-"+String(ms).padStart(4,"0"));
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(dir,"settled-viewport.png")});
  const api = await import("../../evidence/"+id+"/flow.mjs");
  report.hasAuthorFlow=typeof api.testApprovedHero === "function";
  if(report.hasAuthorFlow) report.interaction=await api.testApprovedHero(page,"mouse",name=>snap("approved-"+name));
  await context.close();
} catch(error) {
  report.errors.push(String(error.stack || error));
  process.exitCode=1;
} finally {
  await writeFile(join(dir,"preview.json"),JSON.stringify(report,null,2));
  await browser.close();
  await server.close();
}
