import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { assemblePinnedBundles, verifyCarrySources } from "../scripts/carry-release.mjs";
import { carriedRuntimeAssets } from "../scripts/release-proof.mjs";
import { base } from "../scripts/site-map.mjs";

const head = "d".repeat(40);
const shared = "assets/shared-12345678.js";
const freshEntry = "assets/page-22222222.js", oldEntry = "assets/page-11111111.js";
const freshShader = "assets/shader-22222222.js", oldShader = "assets/shader-11111111.js";
const routes = ["works/cloth/index.html","en/works/cloth/index.html"];
const html = file => `<script src="${base}${file}"></script>`;
const manifest = (entry, shader) => ({
  page: { file: entry, dynamicImports: ["shader"], imports: ["shared"] },
  shader: { file: shader }, shared: { file: shared },
});

function fixture(t) {
  const dist = mkdtempSync(join(tmpdir(), "carry-release-"));
  t.after(() => rmSync(dist, { recursive: true }));
  const put = (name, contents) => {
    const path = join(dist, name);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, contents);
  };
  const current = manifest(freshEntry, freshShader);
  put(".vite/manifest.json", JSON.stringify(current));
  for (const path of routes) put(path, html(freshEntry));
  put("works/jelly/index.html",html(freshEntry));
  for (const asset of [freshEntry, freshShader, shared]) put(asset, asset);
  const bodies = Object.fromEntries([...routes.map(path => [path, html(oldEntry)]),
    ...[oldEntry,oldShader,shared].map(path => [path,path])]);
  const files = Object.fromEntries(Object.entries(bodies).map(([name,content]) => [name,
    {bytes:Buffer.byteLength(content),sha256:createHash("sha256").update(content).digest("hex")}]));
  const index = { deployment:head, manifest:manifest(oldEntry,oldShader), files,
    works:[{slug:"cloth",pages:routes,assets:[oldEntry,oldShader,shared]}] };
  const load = async file => Buffer.from(bodies[file]);
  return {dist, put, index, current, load};
}

test("only carried routes receive their live bytes and their original dynamic imports", async t => {
  const {dist,index,load,current} = fixture(t);
  await assemblePinnedBundles(dist,index,load);
  for (const route of routes) assert.equal(readFileSync(join(dist,route),"utf8"),html(oldEntry));
  assert.equal(readFileSync(join(dist,"works/jelly/index.html"),"utf8"),html(freshEntry));
  const result = JSON.parse(readFileSync(join(dist,".vite/manifest.json")));
  assert.deepEqual(carriedRuntimeAssets(html(freshEntry),result),carriedRuntimeAssets(html(freshEntry),current));
  assert.deepEqual(carriedRuntimeAssets(html(oldEntry),result),carriedRuntimeAssets(html(oldEntry),index.manifest));
  for (const path of [freshEntry, freshShader, shared, oldEntry, oldShader]) {
    assert.equal(readFileSync(join(dist,path),"utf8"),path);
  }
});

test("reject a corrupt fetch, immutable filename collision, altered HTML or escaping path before writing", async t => {
  for (const defect of ["digest","collision","copy","traversal","graph"]) {
    await t.test(defect, async t => {
      const {dist,index,put,load} = fixture(t);
      if (defect==="digest") index.files[oldShader].sha256="0".repeat(64);
      if (defect==="collision") put(oldShader,"other product's current bytes");
      if (defect==="copy") put(routes[0],html(freshEntry)+"changed copy");
      if (defect==="traversal") index.works[0].assets.push("assets/../escape-12345678.js");
      if (defect==="graph") index.manifest.page.dynamicImports=["missing"];
      await assert.rejects(assemblePinnedBundles(dist,index,load));
      assert.equal(readFileSync(join(dist,routes[1]),"utf8"),html(freshEntry));
    });
  }
});

test("changing a carried source, shared shader runtime or carried catalog entry requires independent review", t => {
  const repo = mkdtempSync(join(tmpdir(),"carry-source-"));
  t.after(() => rmSync(repo,{recursive:true}));
  const git = (...args) => execFileSync("git",["-c","user.name=Fixture","-c","user.email=fixture@example.invalid",
    "-c","core.hooksPath=unused-hooks","-c","commit.gpgSign=false",...args],{cwd:repo,encoding:"utf8"}).trim();
  const paths = ["src/works/cloth/shader.wgsl","src/shared/motion.js","src/works/catalog.json","src/works/jelly/shader.js"];
  for (const path of paths) {
    mkdirSync(dirname(join(repo,path)),{recursive:true});
    writeFileSync(join(repo,path),path.endsWith(".json") ? '{"cloth":{"text":"woven"},"jelly":{}}' : "original");
  }
  git("init","--quiet"); git("add","."); git("commit","--quiet","-m","Previous deployment");
  const deploy = git("rev-parse","HEAD");
  const check = () => verifyCarrySources(deploy,[{slug:"cloth"}],repo);
  writeFileSync(join(repo,paths[3]),"new jelly"); check();
  for (const path of paths.slice(0,3)) {
    writeFileSync(join(repo,path),path.endsWith(".json") ? '{"cloth":{"text":"changed"}}' : "changed");
    assert.throws(check,/Carried source changed|Changed carried catalog/);
    git("restore","--",path);
  }
});
