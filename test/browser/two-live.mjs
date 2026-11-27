import {chromium} from "playwright";
import {mkdir,writeFile,readFile} from "node:fs/promises";
if(process.env.RUNNER_ENVIRONMENT!=="github-hosted")throw Error("isolated runner required");
const [slug,w]=process.argv.slice(2),width=Number(w),height=width===320?568:width===390?844:900;
const origin="https://visuals.glossquote.com",sea=slug==="archipelago-log";
const receipt=await fetch(origin+"/release.json",{cache:"no-store"}).then(r=>r.json());
const expected="f35e7abe1cb9f0192a5f8156ff2b44c64a727409";
if(receipt.commit!==expected)throw Error("Unexpected live version "+receipt.commit);
const report={slug,width,height,commit:receipt.commit,rows:[]};await mkdir("review",{recursive:true});
const browser=await chromium.launch({channel:"chromium",args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
try{for(const lang of ["zh-hant","en"]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<500});page.setDefaultTimeout(25000);
 await page.addInitScript(()=>{window.__submits=0;const prev=GPUQueue.prototype.submit;GPUQueue.prototype.submit=function(args){window.__submits++;return prev.call(this,args)}});
 const cdp=await page.context().newCDPSession(page),r={lang,errors:[],offsite:[],bad:[]};report.rows.push(r);
 page.on("pageerror",e=>r.errors.push(e.message));page.on("console",m=>{if(m.type()==="error")r.errors.push(m.text())});
 page.on("response",v=>{if(v.status()>=400)r.bad.push([v.status(),v.url()])});
 page.on("request",v=>{if(/^https?:/.test(v.url())&&!v.url().startsWith(origin+"/"))r.offsite.push(v.url())});
 const capture=async(name)=>{const {data}=await cdp.send("Page.captureScreenshot",{format:"jpeg",quality:82,fromSurface:true});await writeFile("review/"+name+".jpg",Buffer.from(data,"base64"))};
 const state=()=>page.evaluate(()=>({t:performance.now(),count:window.__submits,phase:document.querySelector("[data-stage]").dataset.motion,radio:document.querySelector("[data-instrument] input:checked").value,marker:document.querySelector("[data-onsen-loc],[data-sea-coord]").textContent,sub:document.querySelector("[data-onsen-temp],[data-sea-wind]").textContent}));
 try{
  const url=origin+"/"+lang+"/works/"+slug+"/";r.status=(await page.goto(url)).status();
  await page.evaluate(()=>document.fonts.ready);
  r.first=await page.evaluate(()=>{const rect=s=>{const v=document.querySelector(s).getBoundingClientRect();return {top:v.top,bottom:v.bottom,fraction:Math.round(100*Math.max(0,Math.min(v.bottom,innerHeight)-Math.max(v.top,0))/v.height)}};return{stage:rect("[data-stage]"),cta:rect('a.gold[href="#salon"]'),overflow:document.documentElement.scrollWidth-innerWidth,canonical:document.querySelector("link[rel=canonical]").href}});
  await capture(lang+"-first");
  await page.waitForFunction(()=>["running","unavailable"].includes(document.querySelector("[data-stage]").dataset.motion),null,{timeout:40000});
  r.gpu=await state();
  if(lang==="en"&&width===390){r.auto=[];for(const delay of [0,6500,6500]){await page.waitForTimeout(delay);r.auto.push(await state());await capture("auto-"+r.auto.length)}}
  try {const first=page.locator("[data-instrument] input").first();await first.focus();await page.keyboard.press("ArrowRight");r.manual=await state();
  const toggle=page.locator("[data-pause]");await toggle.focus();await page.keyboard.press("Space");await page.waitForTimeout(1100);const a=await state();await page.waitForTimeout(1200);const b=await state();await page.keyboard.press("Space");await page.waitForTimeout(1400);r.pause={a,b,c:await state()};
  }catch(e){r.controlFailure=e.message}
  const select=async(n,v)=>page.locator("label").filter({has:page.locator('input[name="'+n+'"][value="'+v+'"]')}).click();
  for(const [n,v] of sea?[["sea","miyako"],["yacht","super68"],["guests","6"],["addon","dive"]]:[["sanctuary","autumn"],["villa","buyout"],["guests","6"],["ritual","tea"]])await select(n,v);
  await page.locator('textarea[name="note"]').fill("QA private planning");
  const downloaded=page.waitForEvent("download");await page.locator("[data-download-sanctuary],[data-download-voyage]").click();
  const file=await downloaded,body=await readFile(await file.path(),"utf8");r.download={name:file.suggestedFilename(),body,expected:sea?"764,200":"1,005,200",ok:body.includes(sea?"764,200":"1,005,200")&&body.includes("QA private planning")};
 }catch(e){r.failure=e.message}finally{await writeFile("review/report.json",JSON.stringify(report,null,2));await page.close()}
}}finally{await browser.close()}
