import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { setTimeout as wait } from "node:timers/promises";
import { chromium } from "playwright";
import { serveDist } from "./server.mjs";
import { base, root } from "../../scripts/site-map.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
assert.equal(process.env.RUNNER_OS, "Windows");
assert.equal(process.env.GITHUB_REPOSITORY.toLowerCase(), "kystr/glossquote-visuals");
assert.equal(process.env.GITHUB_REF, "refs/heads/codex/diagnose-cjk-cold-v007");
const mode = process.argv[2];
assert.ok(["baseline","no-js","single-font","font-ready"].includes(mode));
const js = mode !== "no-js", oneFont = ["single-font","font-ready"].includes(mode);
const dir = join(root,".runs","diagnosis",mode);
await fs.mkdir(dir,{recursive:true});
const save = (name,value) => fs.writeFile(join(dir,name),JSON.stringify(value,null,2));
if (oneFont) {
  const file=join(root,"dist","works","selvedge","index.html");
  let html=await fs.readFile(file,"utf8");
  html=html.replace(/<link\b[^>]*rel="preload"[^>]*studio-serif-tc\.woff2[^>]*>/g,"");
  assert.ok(html.includes("studio-text-tc.woff2"));
  const css=`@font-face{font-family:ProbeMonoTC;src:url("${base}fonts/studio-text-tc.woff2") format("woff2");font-style:normal;font-display:block;font-weight:100 900}html,body,*,*:before,*:after,form,button,input,select,option,textarea{font-family:ProbeMonoTC!important}`;
  await fs.writeFile(join(root,"dist","diagnostic-font.css"),css);
  html=html.replace("</head>",`<link rel="stylesheet" href="${base}diagnostic-font.css"></head>`);
  if(mode==="font-ready"){
    html=html.replace("<html ","<html data-diagnostic-font-wait ");
    await fs.appendFile(join(root,"dist","diagnostic-font.css"),"html[data-diagnostic-font-wait]{display:none!important}");
    const boot=`window.__fontBarrier={started:performance.now()};document.fonts.load('400 16px ProbeMonoTC','中文字123').then(faces=>{window.__fontBarrier.loaded=performance.now();window.__fontBarrier.faces=faces.map(f=>({family:f.family,status:f.status}));}).catch(error=>{window.__fontBarrier.error=String(error)}).finally(()=>{document.documentElement.removeAttribute('data-diagnostic-font-wait');window.__fontBarrier.revealed=performance.now()});`;
    await fs.writeFile(join(root,"dist","diagnostic-font-ready.js"),boot);
    html=html.replace("</head>",`<script src="${base}diagnostic-font-ready.js"></script></head>`);
  }
  await fs.writeFile(file,html);
}
const site=await serveDist();
const browser=await chromium.launch({headless:true,channel:"chromium",ignoreDefaultArgs:["--disable-back-forward-cache"],args:["--enable-unsafe-webgpu","--disable-gpu-watchdog","--enable-gpu","--use-angle=d3d11-warp","--use-webgpu-adapter=d3d11"]});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,javaScriptEnabled:js});
 const page=await context.newPage();
 await page.setContent('<html lang="en"><title>Initial tab</title><body style="background:#ddd">Initial tab</body></html>');
 await page.screenshot({type:"jpeg",quality:40});
 const cdp=await context.newCDPSession(page), browserCDP=await browser.newBrowserCDPSession();
 const available=(await browserCDP.send("Tracing.getCategories")).categories;
 const selected=["blink","blink.user_timing","loading","devtools.timeline","v8","v8.execute","toplevel","fonts","renderer.scheduler","mojom","ipc","skia","cc","disabled-by-default-devtools.timeline","disabled-by-default-devtools.timeline.stack",...available.filter(v=>/font/i.test(v))];
 await Promise.all([cdp.send("Performance.enable"),cdp.send("Network.enable"),cdp.send("Page.enable"),cdp.send("Profiler.enable")]);
 await cdp.send("Page.setLifecycleEventsEnabled",{enabled:true});
 const requests=[],lifecycle=[];
 cdp.on("Network.requestWillBeSent",x=>requests.push({event:"request",url:x.request.url,id:x.requestId,time:x.timestamp,loader:x.loaderId,type:x.type}));
 cdp.on("Network.responseReceived",x=>requests.push({event:"response",url:x.response.url,id:x.requestId,time:x.timestamp,loader:x.loaderId,status:x.response.status,type:x.type}));
 cdp.on("Network.loadingFinished",x=>requests.push({event:"complete",id:x.requestId,time:x.timestamp,length:x.encodedDataLength}));
 cdp.on("Page.lifecycleEvent",x=>lifecycle.push(x));
 await cdp.send("Profiler.setSamplingInterval",{interval:1000});
 await cdp.send("Profiler.start");
 await browser.startTracing(page,{screenshots:true,categories:["-*",...new Set(selected)]});
 const url=site.origin+base+"works/selvedge/";
 const response=await page.goto(url,{waitUntil:"commit",timeout:30000});
 assert.equal(response.status(),200);
 await wait(10000);
 const raw=await browser.stopTracing(), {profile}=await cdp.send("Profiler.stop");
 await Promise.all([fs.writeFile(join(dir,"chromium-trace.json.gz"),gzipSync(raw)),fs.writeFile(join(dir,"renderer.cpuprofile.gz"),gzipSync(JSON.stringify(profile)))]);
 const trace=JSON.parse(raw).traceEvents;
 const nav=trace.find(e=>e.name==="navigationStart"&&e.args?.data?.documentLoaderURL===url);
 assert.ok(nav?.ts,"Exact main-document navigation event absent");
 const offset=(ts)=>(ts-nav.ts)/1000;
 const processes=trace.filter(e=>e.ph==="M"&&e.name==="process_name").map(e=>({pid:e.pid,name:e.args.name}));
 const threads=trace.filter(e=>e.ph==="M"&&e.name==="thread_name").map(e=>({pid:e.pid,tid:e.tid,name:e.args.name}));
 const rid=nav.pid;
 const main=threads.find(t=>t.pid===rid&&t.name==="CrRendererMain"); assert.ok(main,JSON.stringify({rid,threads}));
 const spans=trace.filter(e=>e.ph==="X"&&e.dur>0&&e.ts>=nav.ts-10000&&e.ts<nav.ts+1e7);
 const event=e=>({ms:Math.round(offset(e.ts)),durMs:+(e.dur/1000).toFixed(3),pid:e.pid,tid:e.tid,name:e.name,cat:e.cat,data:e.args?.data});
 const mainSpans=spans.filter(e=>e.pid===rid&&e.tid===main.tid).sort((a,b)=>b.dur-a.dur);
 const longest=mainSpans[0];
 const near=spans.filter(e=>longest&&e.ts>=longest.ts&&e.ts<=longest.ts+longest.dur&&/font|DirectWrite|shape|glyph|layout|style|fallback|sync|paint|script/i.test(e.name));
 const groups=new Map();
 for(const e of near){const k=e.pid+":"+e.tid+":"+e.name;let old=groups.get(k);if(!old){old={name:e.name,thread:threads.find(t=>t.pid===e.pid&&t.tid===e.tid)?.name,pid:e.pid,tid:e.tid,count:0,us:0,peakUs:0};groups.set(k,old)}old.count++;old.us+=e.dur;old.peakUs=Math.max(old.peakUs,e.dur);}
 const parent=new Map(),nodes=new Map(profile.nodes.map(n=>[n.id,n]));
 for(const n of profile.nodes) for(const child of n.children??[])parent.set(child,n.id);
 const stacks=new Map();let t=profile.startTime;
 for(let i=0;i<(profile.samples??[]).length;i++){const delta=profile.timeDeltas[i];t+=delta;if(!longest||t<longest.ts||t>longest.ts+longest.dur)continue;let id=profile.samples[i];const chain=[];while(id){const node=nodes.get(id);if(!node)break;chain.push(node.callFrame.functionName||"(anonymous) "+node.callFrame.url);id=parent.get(id);}const k=chain.join(" ← ");stacks.set(k,(stacks.get(k)??0)+delta);}
 const getHTML=await cdp.send("Runtime.evaluate",{expression:`JSON.stringify({lang:document.documentElement.lang,fonts:document.fonts.status,nav:performance.getEntriesByType("navigation")[0].toJSON(),paint:performance.getEntriesByType("paint").map(p=>p.toJSON()),canvas:!!document.querySelector("canvas"),stage:document.querySelector("[data-stage]")?.dataset.motion,ready:document.readyState})`,returnByValue:true});
 await cdp.send("DOM.enable");await cdp.send("CSS.enable");const {root:documentRoot}=await cdp.send("DOM.getDocument");const fontNodes={};
 for(const selector of ["h1",".hero-lead","header","select","button",".hero-copy"]){const {nodeId}=await cdp.send("DOM.querySelector",{nodeId:documentRoot.nodeId,selector});if(nodeId)fontNodes[selector]=(await cdp.send("CSS.getPlatformFontsForNode",{nodeId})).fonts;}
 const output={mode,js,oneFont,browser:browser.version(),url,source:"c7628d44b396696323b65b3478d22033757f66c7",runner:"isolated GitHub-hosted Windows 2025; fresh browser process, 390x844; English neutral tab first",processes,main,fonts:fontNodes,requestedCategories:selected,knownFontCategories:available.filter(v=>/font/i.test(v)),navigation:JSON.parse(getHTML.result.value),requests,lifecycle,filmstripMs:trace.filter(e=>e.name==="Screenshot"&&e.args?.snapshot).map(e=>offset(e.ts)),longestMain:mainSpans.slice(0,28).map(event),relatedSpansByPeak:[...groups.values()].sort((a,b)=>b.peakUs-a.peakUs).slice(0,35),relatedSpansByInclusiveTotal:[...groups.values()].sort((a,b)=>b.us-a.us).slice(0,35),longTaskJsSamples:[...stacks].sort((a,b)=>b[1]-a[1]).slice(0,20),cpuTiming:{startTime:profile.startTime,endTime:profile.endTime,navUs:nav.ts,windowStartUs:longest?.ts,windowEndUs:longest?.ts+longest?.dur}};
 if(mode==="font-ready") output.fontBarrier=(await cdp.send("Runtime.evaluate",{expression:"window.__fontBarrier",returnByValue:true})).result.value;
 await save("summary.json",output);
 console.log(JSON.stringify({mode,main:output.longestMain.slice(0,8),paint:output.navigation.paint,js:output.longTaskJsSamples.slice(0,7),related:output.relatedSpansByPeak.slice(0,8)}));
} finally{await browser.close();await site.close();}
