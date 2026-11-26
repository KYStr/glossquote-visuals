import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CYCLE_SECONDS,
  RESONANCE_MODES,
  activeModeFromPos,
  computeModePos,
} from "../src/works/cymatic-brass/mode-state.js";

const root = resolve(import.meta.dirname, "..");

test("V012-V014 offline builders have no native <form> submission pathway in either locale", () => {
  const pages = [
    "works/kiln-glaze/index.html",
    "en/works/kiln-glaze/index.html",
    "works/cymatic-brass/index.html",
    "en/works/cymatic-brass/index.html",
    "works/botanica-press/index.html",
    "en/works/botanica-press/index.html",
  ];
  for (const rel of pages) {
    const html = readFileSync(resolve(root, rel), "utf8");
    assert.doesNotMatch(html, /<form\b/i, `${rel} must not contain a native <form>`);
    assert.match(html, /data-qty-error/, `${rel} must include a quantity validation alert`);
    assert.match(html, /step="1"/, `${rel} quantity input must enforce integer step`);
  }
});

test("V012-V014 product cards use distinct dedicated product images that exist on disk", () => {
  const expected = {
    "kiln-glaze": ["product-chawan.webp", "product-plate.webp", "product-pitcher.webp"],
    "cymatic-brass": ["product-desk.webp", "product-wall.webp", "product-array.webp"],
    "botanica-press": ["product-single.webp", "product-diptych.webp", "product-kit.webp"],
  };
  for (const [slug, files] of Object.entries(expected)) {
    for (const file of files) {
      assert.equal(existsSync(resolve(root, "public/media", slug, file)), true, `missing public/media/${slug}/${file}`);
    }
    for (const prefix of ["works", "en/works"]) {
      const html = readFileSync(resolve(root, prefix, slug, "index.html"), "utf8");
      for (const file of files) {
        assert.match(html, new RegExp(`media/${slug}/${file}`), `${prefix}/${slug}/index.html must reference ${file}`);
      }
    }
  }
});

test("V013 cymatic-brass mode-state drives all three resonance modes cleanly over one 12s cycle", () => {
  assert.equal(CYCLE_SECONDS, 12);
  assert.equal(RESONANCE_MODES.length, 3);

  // Plateaus: 0-3s -> mode 0 (288 Hz), 4-7s -> mode 1 (512 Hz), 8-11s -> mode 2 (768 Hz)
  assert.equal(computeModePos(0), 0);
  assert.equal(computeModePos(2.5), 0);
  assert.equal(activeModeFromPos(computeModePos(2.5)), 0);

  assert.equal(computeModePos(4.0), 1);
  assert.equal(computeModePos(6.5), 1);
  assert.equal(activeModeFromPos(computeModePos(6.5)), 1);

  assert.equal(computeModePos(8.0), 2);
  assert.equal(computeModePos(10.5), 2);
  assert.equal(activeModeFromPos(computeModePos(10.5)), 2);

  // Transitions cross midpoints smoothly
  assert.equal(activeModeFromPos(computeModePos(3.4)), 0);
  assert.equal(activeModeFromPos(computeModePos(3.6)), 1);
  assert.equal(activeModeFromPos(computeModePos(7.4)), 1);
  assert.equal(activeModeFromPos(computeModePos(7.6)), 2);
  assert.equal(activeModeFromPos(computeModePos(11.4)), 2);
  assert.equal(activeModeFromPos(computeModePos(11.6)), 0);
});
