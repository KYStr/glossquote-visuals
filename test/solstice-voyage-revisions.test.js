import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHAPTERS,
  CHAPTER_SECONDS,
  CYCLE_SECONDS,
  sceneIndexFromElapsed,
} from "../src/works/solstice-voyage/scene-state.js";

const root = resolve(import.meta.dirname, "..");

test("solstice-voyage scene-state advances through all three chapters at 2s, 9s, and 16s", () => {
  assert.equal(CYCLE_SECONDS, 18);
  assert.equal(CHAPTER_SECONDS, 6);
  assert.equal(CHAPTERS.length, 3);

  const at2 = sceneIndexFromElapsed(2);
  const at9 = sceneIndexFromElapsed(9);
  const at16 = sceneIndexFromElapsed(16);

  assert.equal(at2, 0);
  assert.match(CHAPTERS[at2].coord, /ERG CHEBBI/);
  assert.match(CHAPTERS[at2].hour, /18:42/);

  assert.equal(at9, 1);
  assert.match(CHAPTERS[at9].coord, /LOFOTEN/);
  assert.match(CHAPTERS[at9].hour, /23:55/);

  assert.equal(at16, 2);
  assert.match(CHAPTERS[at16].coord, /ENGADIN/);
  assert.match(CHAPTERS[at16].hour, /05:28/);

  assert.equal(sceneIndexFromElapsed(20), 0);
});

test("solstice-voyage page and shader share one scene state and freeze cleanly on pause", () => {
  const js = readFileSync(resolve(root, "src/works/solstice-voyage/page.js"), "utf8");
  const shader = readFileSync(resolve(root, "src/works/solstice-voyage/shader.js"), "utf8");

  assert.match(js, /let settings = \{ preset: 0, index: 0 \};/);
  assert.match(js, /settings = \{ index: nextIndex, preset: nextIndex \};/);
  assert.match(js, /if \(paused\) stopCycleLoop\(\);/);
  assert.match(js, /if \(pageHiding\) return;/);
  assert.match(shader, /props:\s*\{\s*preset:\s*\{\s*default:\s*0\s*\}/);
  assert.match(shader, /Math\.max\(width,\s*height,\s*1\)/);
});

test("solstice-voyage and short-screen targets enforce 320x568 first-screen compaction", () => {
  const solsticeCss = readFileSync(resolve(root, "src/works/solstice-voyage/page.css"), "utf8");
  assert.doesNotMatch(solsticeCss, /grid-template-columns:\s*1fr\s*;/);
  assert.match(solsticeCss, /@media\s*\(max-width:\s*360px\)/);
  assert.match(solsticeCss, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);

  for (const slug of ["cymatic-brass", "contour-expedition"]) {
    const css = readFileSync(resolve(root, "src/works", slug, "page.css"), "utf8");
    assert.match(css, /@media\s*\(max-width:\s*360px\)[\s\S]*max-height:\s*1(46|48|52)px/);
  }
  for (const slug of ["archipelago-log", "kuroyu-ryokan"]) {
    const css = readFileSync(resolve(root, "src/works", slug, "page.css"), "utf8");
    assert.doesNotMatch(css, /grid-template-columns:\s*1fr\s*;/);
    assert.match(css, /@media\s*\(max-width:\s*360px\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    const wgslFile = slug === "archipelago-log" ? "lagoon.wgsl" : "onsen.wgsl";
    const wgsl = readFileSync(resolve(root, "src/works", slug, wgslFile), "utf8");
    assert.doesNotMatch(wgsl, /\bfor\s*\(/, `${slug}/${wgslFile} must stay O(1) with zero raymarching loops for 5-year-old laptops`);
  }
});
