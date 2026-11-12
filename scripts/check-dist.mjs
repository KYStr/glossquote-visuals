import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { base, languages, origin, root, routesFor, worksFor } from "./site-map.mjs";

const dist = resolve(root, "dist");
const file = (path) => resolve(dist, path);
const read = (path) => readFileSync(file(path), "utf8");
const limit = 2 * 1024 * 1024;

function localFile(url) {
  assert.ok(url.startsWith(base), `Unexpected base for ${url}`);
  const path = url.slice(base.length).split(/[?#]/)[0];
  const local = path === "" || path.endsWith("/") ? path + "index.html" : path;
  assert.ok(existsSync(file(local)), `Missing output for ${url}`);
  return local;
}

function checkPage({ route, lang, slug }, release, manifest) {
  const path = route + "index.html";
  const html = read(path);
  const canonical = origin + base + route;
  assert.ok(html.includes(`<html lang="${lang}">`));
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
  assert.ok(html.includes(`name="robots" content="${release ? "index, follow" : "noindex, nofollow"}"`));
  for (const [alternate, prefix] of Object.entries({ ...languages, "x-default": "" })) {
    const alternateUrl = origin + base + prefix + (slug ? `works/${slug}/` : "");
    assert.ok(html.includes(`hreflang="${alternate}" href="${alternateUrl}"`));
    localFile(alternateUrl.slice(origin.length));
  }
  const csp = html.indexOf('http-equiv="Content-Security-Policy"');
  assert.ok(csp !== -1 && csp < html.indexOf("<link"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!html.includes("%BASE_URL%"));
  assert.ok(!html.includes("<!-- work-source -->"));
  assert.doesNotMatch(html, /<(?:script|img|link[^>]*rel="stylesheet")[^>]+(?:src|href)="https?:/i);

  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  assert.ok(ogImage?.startsWith(origin + base));
  localFile(ogImage.slice(origin.length));

  const loaded = new Set([path]);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const local = localFile(match[1]);
    if (!local.endsWith(".html")) loaded.add(local);
  }
  const visited = new Set();
  function visit(key) {
    if (visited.has(key) || !manifest[key]) return;
    visited.add(key);
    const chunk = manifest[key];
    for (const path of [chunk.file, ...chunk.css ?? [], ...chunk.assets ?? []]) loaded.add(path);
    for (const reference of [...chunk.imports ?? [], ...chunk.dynamicImports ?? []]) visit(reference);
  }
  for (const [key, chunk] of Object.entries(manifest)) {
    if (loaded.has(chunk.file)) visit(key);
  }
  const bytes = [...loaded].reduce((sum, asset) => sum + gzipSync(readFileSync(file(asset))).length, 0);
  assert.ok(bytes <= limit, `${path} would exceed the 2 MiB gzip transfer target`);
  console.log(`PASS ${base}${route} · ${bytes} bytes gzip incl. lazy chunks`);
}

export function checkDist(mode) {
  const manifest = JSON.parse(read(".vite/manifest.json"));
  const routes = routesFor(mode);
  const works = worksFor(mode);
  const release = mode === "release" && works.length > 0;
  for (const route of routes) checkPage(route, release, manifest);
  assert.match(read("404.html"), /name="robots" content="noindex, nofollow"/);
  assert.ok(existsSync(file(".nojekyll")));
  assert.equal(read("sitemap.xml").includes("<loc>"), release);
  assert.equal(read("robots.txt").includes("Disallow: /"), !release);
  if (works.length) {
    const chunks = readdirSync(file("assets")).filter((name) => name.endsWith(".js"));
    assert.ok(chunks.some((name) => /disableTelemetry:\s*(?:true|!0)\b/.test(read(`assets/${name}`))));
    for (const chunk of chunks) {
      assert.ok(!/Function\(["'`]+return true["'`]+\)/.test(read(`assets/${chunk}`)), `JIT capability probe was emitted in ${chunk}`);
    }
    console.log("PASS emitted telemetry opt-out and no JIT probe");
  }
  assert.ok(!read("index.html").includes("<canvas"));
  assert.ok(!read("en/index.html").includes("<canvas"));
  console.log("PASS static routes, reciprocal metadata, share assets, CSP and gallery without canvas");
}
