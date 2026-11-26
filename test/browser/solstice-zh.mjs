import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { serveDist } from "./server.mjs";
if(process.env.RUNNER_ENVIRONMENT!=="github-hosted") throw Error("isolated runner required");
await mkdir("review",{recursive:true});
const server=await serveDist();
const browser=await chromium.launch({channel:"chromium",args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const res={};
try {
  await page.goto(server.origin+"/glossquote-visuals/works/solstice-voyage/");
  await page.waitForFunction(()=>document.querySelector("[data-stage]").dataset.motion==="running",null,{timeout:30000});
  res.states=await page.evaluate(async()=>{
    const rows=[];
    for(const delay of [0,6500,6500]){
      await new Promise(done=>setTimeout(done,delay));
      rows.push({t:performance.now(),phase:document.querySelector("[data-stage]").dataset.motion,chapter:document.querySelector("[data-instrument] input:checked").value,coord:document.querySelector("[data-scene-coord]").textContent,hour:document.querySelector("[data-scene-hour]").textContent});
    }
    return rows;
  });
  await writeFile("review/report.json",JSON.stringify(res,null,2));
  await page.locator("[data-pause]").evaluate(el=>el.click());
  for(const [name,value] of [["dest","fjord"],["pace","collector"],["guests","8"],["extra","chef"]])
    await page.locator('input[name="'+name+'"][value="'+value+'"]').evaluate(el=>el.click());
  await page.locator('textarea[name="note"]').fill("QA itinerary");
  const file=page.waitForEvent("download");
  await page.locator("[data-download-dossier]").evaluate(el=>el.click());
  const saved=await file;
  res.filename=saved.suggestedFilename();res.content=await readFile(await saved.path(),"utf8");
  await writeFile("review/report.json",JSON.stringify(res,null,2));
} finally {await browser.close();await server.close();}
