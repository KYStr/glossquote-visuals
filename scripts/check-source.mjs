import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalog, registry, root, routesFor } from "./site-map.mjs";

const read = (name) => readFileSync(resolve(root, name));
const lock = JSON.parse(read("package-lock.json"));
const manifest = JSON.parse(read("package.json"));
for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.packages[`node_modules/${name}`].version, version);
}
assert.equal(lock.packages["node_modules/shaders"].integrity,
  "sha512-v/EQv2U6TQccRuoWX0D5lhkJsIizigCRVadsavY8olKLwb4uhHFi+JlIREEMYD4pvywjLnwVpMNpTtJgzR/FwQ==");
assert.equal(createHash("sha256").update(read("node_modules/shaders/dist/js/bundle.js")).digest("hex"),
  "2f88fd951debc56d84689d7567a1f382ec4d715d36bd1b2faf2c6de6cf32f37c");

for (const [slug, entry] of Object.entries(catalog)) {
  assert.match(slug, /^[a-z]+(?:-[a-z]+)*$/);
  assert.equal(registry.works.filter((work) => work.slug === slug).length, 1);
  assert.ok(existsSync(resolve(root, "public", entry.image)));
  for (const locale of ["zh-Hant", "en"]) {
    assert.ok(entry[locale].title && entry[locale].description);
  }
  const shader = read(`src/works/${slug}/shader.js`).toString();
  assert.match(shader, /\}, \{ disableTelemetry: true,/);
  assert.doesNotMatch(shader, /rendererSettings|createPreview\(/);
}

const notices = read("public/licenses/NOTICES.txt").toString();
for (const dependency of ["shaders", "colorjs.io", "typegpu", "tinyest", "typed-binary", "tsover-runtime"]) {
  assert.ok(notices.includes(`\n${dependency} `), `Missing notice for ${dependency}`);
}
assert.ok(registry.works.filter((work) => work.status === "building").length <= 1);
for (const { route } of routesFor("candidate")) {
  assert.ok(existsSync(resolve(root, route, "index.html")), `Missing route ${route}`);
}
console.log("PASS exact pins, standalone bundle integrity, telemetry option, notices, registry and bilingual entries");
