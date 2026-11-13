import test from "node:test";
import assert from "node:assert/strict";
import { assertNaturalCycleVariation } from "./browser/signal-motion.mjs";

test("natural motion may return to its first frame after a full cycle, but cannot freeze", () => {
  const frames = [0, 2000, 4000, 6000, 8000, 9000, 10000, 11000, 12000, 13000]
    .map((targetMs) => ({ targetMs, gpu: { sha256: String(targetMs % 12000) } }));
  assert.doesNotThrow(() => assertNaturalCycleVariation(frames, 12000, "dawn"));
  const frozen = structuredClone(frames);
  frozen[4].gpu.sha256 = frozen[3].gpu.sha256;
  assert.throws(() => assertNaturalCycleVariation(frozen, 12000, "dawn"), /distinct cycle phases/);
  const stopped = frames.map((frame) => ({ ...frame, gpu: { sha256: "same" } }));
  assert.throws(() => assertNaturalCycleVariation(stopped, 12000, "dawn"), /distinct cycle phases/);
});
