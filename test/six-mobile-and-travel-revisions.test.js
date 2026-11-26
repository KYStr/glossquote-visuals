import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sixWorks = [
  "kiln-glaze",
  "cymatic-brass",
  "botanica-press",
  "sleeper-line",
  "archipelago-log",
  "contour-expedition",
];
const copyFirstWorks = [
  "kiln-glaze",
  "botanica-press",
  "sleeper-line",
  "contour-expedition",
];

test("all six commercial works guard against 390px/320px overflow and fit 320x568 short-screen first view", () => {
  for (const slug of sixWorks) {
    const css = readFileSync(resolve(root, "src/works", slug, "page.css"), "utf8");
    assert.doesNotMatch(css, /grid-template-columns:\s*1fr\s*;/, `${slug}/page.css must use minmax(0, 1fr) instead of bare 1fr`);
    assert.match(css, /width:\s*100%;[\s\S]{0,60}max-width:\s*100%;[\s\S]{0,60}min-width:\s*0;/, `${slug}/page.css must constrain form inputs/selects`);
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*aspect-ratio:\s*16\s*\/\s*9/, `${slug}/page.css must use 16/9 mobile stage for 320x568 framing`);
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, `${slug}/page.css must keep 3-column mode switch on mobile`);
    assert.match(css, /@media\s*\(max-width:\s*360px\)/, `${slug}/page.css must include 320px narrow-viewport rules`);
  }
  for (const slug of copyFirstWorks) {
    const css = readFileSync(resolve(root, "src/works", slug, "page.css"), "utf8");
    assert.match(css, /\.hero-copy\s*\{\s*display:\s*contents;\s*\}/, `${slug}/page.css must place non-focusable spec strip below stage on short screens`);
    assert.match(css, /order:\s*5;/, `${slug}/page.css must elevate stage above non-focusable spec strip`);
    assert.match(css, /order:\s*10;/, `${slug}/page.css must place spec strip after stage`);
  }
});

test("botanica-press animates UV exposure on all three specimens and bakes distinct museum plates", () => {
  const wgsl = readFileSync(resolve(root, "src/works/botanica-press/cyanotype.wgsl"), "utf8");
  assert.match(wgsl, /let exposure = rise \* reset;/);
  assert.doesNotMatch(wgsl, /exposure\s*=\s*0\.92/, "selected specimens must not lock exposure to a static value");

  const hashes = new Set();
  for (const file of ["ginkgo.webp", "fern.webp", "eucalyptus.webp"]) {
    const bytes = readFileSync(resolve(root, "public/media/botanica-press", file));
    assert.ok(bytes.length > 5000, `${file} should be a valid non-empty image`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, 3, "all three botanica-press specimen posters must be distinct");
});

test("cymatic-brass updates mode posters cleanly on selection and never triggers image loads during pagehide", () => {
  const js = readFileSync(resolve(root, "src/works/cymatic-brass/page.js"), "utf8");
  assert.match(js, /let pageHiding = false;/);
  assert.match(js, /if \(pageHiding\) return;/);
  assert.match(js, /syncModeUI\(index,\s*\{\s*updatePoster:\s*true\s*\}\)/);
  assert.match(js, /addEventListener\("pagehide",\s*\(\)\s*=>\s*\{\s*pageHiding = true;/);

  const hashes = new Set();
  for (const file of ["quad.webp", "hex.webp", "lotus.webp"]) {
    const bytes = readFileSync(resolve(root, "public/media/cymatic-brass", file));
    assert.ok(bytes.length > 5000, `${file} should be a valid non-empty image`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, 3, "all three cymatic-brass mode posters must be distinct");
});

test("three travel websites have distinct per-destination shaders, aligned contour arrows, and distinct baked posters", () => {
  const travel = [
    { slug: "archipelago-log", wgsl: "lagoon.wgsl", markers: [/if \(sea == 0\)/, /else if \(sea == 1\)/, /caldera/, /routeY = 0\.02 \+/], files: ["miyako.webp", "cyclades.webp", "palau.webp"] },
    { slug: "contour-expedition", wgsl: "topo.wgsl", markers: [/startPt = vec2f\(-0\.46, -0\.20\)/, /startPt = vec2f\(0\.48, 0\.26\)/, /let fwd = normalize\(vec2f\(dtx, dty\)\)/, /let tipFade =/], files: ["montblanc.webp", "alps.webp", "patagonia.webp"] },
    { slug: "sleeper-line", wgsl: "window.wgsl", markers: [/towerA/, /mainCableY/, /crescent/, /pA = 1\.0 - abs\(sin/], files: ["alpine.webp", "seto.webp", "arctic.webp"] },
  ];

  for (const item of travel) {
    const shader = readFileSync(resolve(root, "src/works", item.slug, item.wgsl), "utf8");
    for (const marker of item.markers) {
      assert.match(shader, marker, `${item.slug}/${item.wgsl} missing expected destination feature ${marker}`);
    }
    const hashes = new Set();
    for (const file of item.files) {
      const bytes = readFileSync(resolve(root, "public/media", item.slug, file));
      assert.ok(bytes.length > 5000, `${item.slug}/${file} should be non-empty`);
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
    }
    assert.equal(hashes.size, 3, `${item.slug} must have 3 distinct destination posters`);
  }
});
