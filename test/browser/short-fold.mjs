import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {serveDist} from "./server.mjs";
if(process.env.RUNNER_ENVIRONMENT!=="github-hosted")throw Error("isolated runner required");
const work=process.argv[2],motion=work==="solstice-motion",slug=motion?"solstice-voyage":work;
const server=await serveDist(), browser=await chromium.launch({channel:"chromium",args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
const report={work,rows:[]};await mkdir("review",{recursive:true});
try {
 for(const lang of (motion?["en"]:["zh","en"])){
  const width=motion?390:320,height=motion?844:568,page=await browser.newPage({viewport:{width,height},hasTouch:true});
  const cdp=await page.context().newCDPSession(page);
  const row={lang,errors:[],offsite:[]};report.rows.push(row);
  page.on("pageerror",e=>row.errors.push(e.message));page.on("console",m=>{if(m.type()==="error")row.errors.push(m.text())});
  page.on("request",req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(server.origin+"/"))row.offsite.push(req.url())});
  try {
   await page.goto(server.origin+"/glossquote-visuals/"+(lang==="en"?"en/":"")+"works/"+slug+"/");
   await page.evaluate(()=>document.fonts.ready);
   const capture=async(name,clip)=>{const {data}=await cdp.send("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false,...(clip?{clip:{...clip,scale:1}}:{})});const b=Buffer.from(data,"base64");await writeFile("review/"+name+".png",b);return createHash("sha256").update(b).digest("hex")};
   row.layout=await page.evaluate(()=>{
    const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,visible:Math.round(100*Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))/r.height)}};
    return {cta:rect(document.querySelector(".hero-cta-row a.gold,main a.button.primary")),visual:rect(document.querySelector("[data-stage]")),overflow:document.documentElement.scrollWidth-innerWidth};
   });
   if(!motion){await capture(lang+"-320");continue}
   await page.waitForFunction(()=>document.querySelector("[data-stage]").dataset.motion==="running",null,{timeout:40000});
   const t0=await page.evaluate(()=>performance.now());
   const read=()=>page.evaluate(()=>({t:performance.now(),phase:document.querySelector("[data-stage]").dataset.motion,material:document.querySelector("[data-stage]").dataset.material,chapter:document.querySelector("[data-instrument] input:checked").value,coord:document.querySelector("[data-scene-coord]").textContent,hour:document.querySelector("[data-scene-hour]").textContent}));
   const clip={x:160,y:180,width:210,height:130};
   row.scenes=[];row.pauses=[];
   for(const t of [2000,8000,14000]){
    await page.evaluate(async(target)=>{await new Promise(done=>setTimeout(done,Math.max(0,target-performance.now())))},t0+t);
    const before=await read();const image=await capture("scene-"+t,clip);const after=await read();row.scenes.push({target:t,t0,before,image,after});
   }
   for(let i=0;i<3;i++){
    await page.locator("[data-pause]").evaluate(el=>el.click());await page.waitForTimeout(700);
    const before=await read();const a=await capture("pause-"+i+"-a",clip);await page.waitForTimeout(1200);const b=await capture("pause-"+i+"-b",clip);
    await page.locator("[data-pause]").evaluate(el=>el.click());await page.waitForTimeout(1100);const c=await capture("resume-"+i,clip);
    row.pauses.push({before,after:await read(),stable:a===b,resumed:c!==b});
   }
  }catch(e){row.failure=e.message}finally{await writeFile("review/report.json",JSON.stringify(report,null,2));await page.close()}
 }
} finally{await browser.close();await server.close()}
