import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {serveDist} from "./server.mjs";
if(process.env.RUNNER_ENVIRONMENT!=="github-hosted")throw Error("isolated runner required");
const server=await serveDist(),browser=await chromium.launch({channel:"chromium",args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const report={scenes:[],pauses:[]};await mkdir("review",{recursive:true});
try{
 await page.addInitScript(()=>{
  let ctx,dev,fmt,texture,pending;
  const proto=GPUCanvasContext.prototype,configure=proto.configure,acquire=proto.getCurrentTexture,submit=GPUQueue.prototype.submit;
  proto.configure=function(c){if(this.canvas.hasAttribute("data-canvas")){ctx=this;dev=c.device;fmt=c.format;c={...c,usage:(c.usage??GPUTextureUsage.RENDER_ATTACHMENT)|GPUTextureUsage.COPY_SRC}}return configure.call(this,c)};
  proto.getCurrentTexture=function(){const t=acquire.call(this);if(this===ctx)texture=t;return t};
  window.__frameCount=0;
  window.__sample=(chapter)=>new Promise((resolve,reject)=>{pending={chapter,resolve,reject}});
  GPUQueue.prototype.submit=function(commands){
   const ret=submit.call(this,commands);if(!texture||this!==dev?.queue)return ret;
   window.__frameCount++;
   const stage=document.querySelector("[data-stage]");
   if(!pending||stage.dataset.material!==String(pending.chapter))return ret;
   const {resolve,reject}=pending;pending=null;
   const w=texture.width,h=texture.height,pitch=Math.ceil(w*4/256)*256;
   const buffer=dev.createBuffer({size:pitch*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
   const enc=dev.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer,bytesPerRow:pitch},[w,h]);submit.call(this,[enc.finish()]);
   const labels={index:stage.dataset.material,checked:document.querySelector("[data-instrument] input:checked").value,coord:document.querySelector("[data-scene-coord]").textContent,hour:document.querySelector("[data-scene-hour]").textContent,t:performance.now(),fmt};
   buffer.mapAsync(GPUMapMode.READ).then(()=>{const src=new Uint8Array(buffer.getMappedRange()),rgba=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=y*pitch+x*4,b=(y*w+x)*4;rgba[b]=src[a+(fmt.startsWith("bgra")?2:0)];rgba[b+1]=src[a+1];rgba[b+2]=src[a+(fmt.startsWith("bgra")?0:2)];rgba[b+3]=255}
    buffer.unmap();buffer.destroy();const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").putImageData(new ImageData(rgba,w,h),0,0);resolve({...labels,png:c.toDataURL("image/png").split(",")[1]});
   }).catch(reject);return ret;
  };
 });
 await page.goto(server.origin+"/glossquote-visuals/en/works/solstice-voyage/");
 await page.waitForFunction(()=>document.querySelector("[data-stage]").dataset.motion==="running",null,{timeout:45000});
 for(let i=0;i<3;i++){
  await page.waitForFunction(i=>document.querySelector("[data-stage]").dataset.material===String(i),i,{timeout:90000});
  await page.waitForTimeout(850);
  const {png,...labels}=await page.evaluate(i=>Promise.race([window.__sample(i),new Promise((_,reject)=>setTimeout(()=>reject(Error("GPU readback timeout")),65000))]),i);
  await writeFile("review/scene-"+i+".png",Buffer.from(png,"base64"));report.scenes.push(labels);await writeFile("review/report.json",JSON.stringify(report,null,2));
 }
 const count=()=>page.evaluate(()=>({count:window.__frameCount,phase:document.querySelector("[data-stage]").dataset.motion}));
 for(let i=0;i<3;i++){
  await page.locator("[data-pause]").evaluate(el=>el.click());await page.waitForTimeout(1800);
  const a=await count();await page.waitForTimeout(1400);const b=await count();
  await page.locator("[data-pause]").evaluate(el=>el.click());await page.waitForTimeout(1400);const c=await count();
  report.pauses.push({a,b,c});await writeFile("review/report.json",JSON.stringify(report,null,2));
 }
}catch(e){report.failure=e.message}finally{await writeFile("review/report.json",JSON.stringify(report,null,2));await browser.close();await server.close()}
