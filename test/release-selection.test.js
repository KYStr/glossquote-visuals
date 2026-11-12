import assert from "node:assert/strict";
import test from "node:test";
import { isReleaseWork, releaseWorkIds } from "../scripts/site-map.mjs";
import { verifyDesignScores } from "../scripts/release-proof.mjs";

test("release selection supports single and batch work IDs", () => {
  assert.deepEqual(releaseWorkIds("V001"), ["V001"]);
  assert.deepEqual(releaseWorkIds("V001, V002,V003"), ["V001", "V002", "V003"]);
  assert.deepEqual(releaseWorkIds(""), []);
});

test("each commercial design score must independently exceed nine", () => {
  const passing = { artDirection: 9.2, uiDesign: 9.3, commercialCompleteness: 9.1 };
  assert.doesNotThrow(() => verifyDesignScores(passing));
  for (const category of Object.keys(passing)) {
    for (const score of [undefined, 9, 8.9, 10.1, NaN, "9.5"]) {
      assert.throws(() => verifyDesignScores({ ...passing, [category]: score }));
    }
  }
  assert.throws(() => verifyDesignScores(undefined));
});

test("only selected reviewed works enter the release build", () => {
  const previous = process.env.GQ_RELEASE_WORK;
  process.env.GQ_RELEASE_WORK = "V001,V002";
  try {
    assert.equal(isReleaseWork({ id: "V001", status: "reviewed" }, "release"), true);
    assert.equal(isReleaseWork({ id: "V002", status: "reviewed" }, "release"), true);
    assert.equal(isReleaseWork({ id: "V003", status: "reviewed" }, "release"), false);
    assert.equal(isReleaseWork({ id: "V001", status: "candidate" }, "release"), false);
    assert.equal(isReleaseWork({ id: "V001", status: "reviewed" }, "candidate"), false);
  } finally {
    if (previous === undefined) delete process.env.GQ_RELEASE_WORK;
    else process.env.GQ_RELEASE_WORK = previous;
  }
});
