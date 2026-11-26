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

test("all six commercial works guard against 390px and 320px horizontal overflow and keep compact mobile first-screen framing", () => {
  for (const slug of sixWorks) {
    const css = readFileSync(resolve(root, "src/works", slug, "page.css"), "utf8");
    assert.doesNotMatch(css, /grid-template-columns:\s*1fr\s*;/, `${slug}/page.css must use minmax(0, 1fr) instead of bare 1fr`);
    assert.match(css, /width:\s*100%;[\s\S]{0,60}max-width:\s*100%;[\s\S]{0,60}min-width:\s*0;/, `${slug}/page.css must constrain form inputs/selects`);
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*aspect-ratio:\s*16\s*\/\s*10/, `${slug}/page.css must tighten mobile stage aspect-ratio`);
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, `${slug}/page.css must keep 3-column mode switch on mobile`);
    assert.match(css, /@media\s*\(max-width:\s*360px\)/, `${slug}/page.css must include 320px narrow-viewport rules`);
  }
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

test("three travel websites have distinct per-destination shaders and distinct baked posters", () => {
  const travel = [
    { slug: "archipelago-log", wgsl: "lagoon.wgsl", markers: [/if \(sea == 0\)/, /else if \(sea == 1\)/, /caldera/, /routeY = 0\.02 \+/], files: ["miyako.webp", "cyclades.webp", "palau.webp"] },
    { slug: "contour-expedition", wgsl: "topo.wgsl", markers: [/startPt = vec2f\(-0\.46, -0\.20\)/, /startPt = vec2f\(0\.48, 0\.26\)/], files: ["montblanc.webp", "alps.webp", "patagonia.webp"] },
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
