import assert from "node:assert/strict";
import test from "node:test";
import { prepareReadbackPixels } from "./browser/readback-pixels.mjs";

test("premultiplied GPU bytes are unassociated for PNG, but not multiplied again for black", () => {
  const raw = new Uint8ClampedArray([64, 32, 16, 128, 0, 0, 0, 0, 9, 8, 7, 255]);
  const { display, black } = prepareReadbackPixels(raw, "premultiplied");
  assert.deepEqual([...display], [128, 64, 32, 128, 0, 0, 0, 0, 9, 8, 7, 255]);
  assert.deepEqual([...black], [64, 32, 16, 255, 0, 0, 0, 255, 9, 8, 7, 255]);
  assert.deepEqual([...raw], [64, 32, 16, 128, 0, 0, 0, 0, 9, 8, 7, 255]);
});

test("opaque canvas alpha is ignored; out-of-gamut associated RGB is retained in raw/black", () => {
  const raw = new Uint8ClampedArray([250, 2, 3, 128]);
  assert.deepEqual([...prepareReadbackPixels(raw, "opaque").display], [250, 2, 3, 255]);
  const { display, black } = prepareReadbackPixels(raw, "premultiplied");
  assert.deepEqual([...display], [255, 4, 6, 128]);
  assert.deepEqual([...black], [250, 2, 3, 255]);
  assert.throws(() => prepareReadbackPixels(raw, "straight"), /alphaMode/);
});
