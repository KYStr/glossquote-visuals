import assert from "node:assert/strict";
import test from "node:test";
import { isReleaseWork, registry, releaseWorkIds } from "../scripts/site-map.mjs";
import { designCriteria, verifyDesignScores, verifyReleaseReceipt, verifyReleaseSelection } from "../scripts/release-proof.mjs";

function designReview() {
  return {
    rubricVersion: "commercial-v1",
    categories: Object.fromEntries(Object.entries(designCriteria).map(([category, ids]) => [
      category,
      ids.map((id) => ({ id, score: 1.9, status: "PASS", reason: "Evidence reviewed", evidence: ["evidence/review.md"] })),
    ])),
  };
}

test("release selection supports single and batch work IDs", () => {
  assert.deepEqual(releaseWorkIds("V001"), ["V001"]);
  assert.deepEqual(releaseWorkIds("V001, V002,V003"), ["V001", "V002", "V003"]);
  assert.deepEqual(releaseWorkIds(""), []);
});

test("each commercial design score must independently exceed nine", () => {
  const passing = { artDirection: 9.5, uiDesign: 9.5, commercialCompleteness: 9.5 };
  assert.doesNotThrow(() => verifyDesignScores(passing, designReview()));
  for (const category of Object.keys(passing)) {
    for (const score of [undefined, 9, 8.9, 10.1, NaN, "9.5"]) {
      assert.throws(() => verifyDesignScores({ ...passing, [category]: score }, designReview()));
    }
  }
  assert.throws(() => verifyDesignScores(undefined));
  assert.throws(() => verifyDesignScores(passing));
  for (const change of [
    (item) => { item.status = "NOT_RUN"; },
    (item) => { item.evidence = []; },
    (item) => { item.evidence = ["evidence/"]; },
    (item) => { item.evidence = ["evidence/..\\README.md"]; },
    (item) => { item.score = 1.8; },
    (item) => { item.id = "unknown"; },
  ]) {
    const review = designReview();
    change(review.categories.artDirection[0]);
    assert.throws(() => verifyDesignScores(passing, review));
  }
});

test("rounding cannot promote an actual nine to a passing design score", () => {
  const review = designReview();
  for (const criterion of review.categories.artDirection) criterion.score = 1.8;
  assert.throws(() => verifyDesignScores({ artDirection: 9.0001, uiDesign: 9.5, commercialCompleteness: 9.5 }, review));
  const fractional = designReview();
  fractional.categories.artDirection[0].score = 1.90001;
  assert.throws(() => verifyDesignScores({ artDirection: 9.5, uiDesign: 9.5, commercialCompleteness: 9.5 }, fractional));
});

test("a release cannot silently rebuild unreviewed existing works", () => {
  const outputs = [{ id: "V001" }, { id: "V002" }, { id: "V003" }];
  assert.doesNotThrow(() => verifyReleaseSelection(["V003", "V001", "V002"], outputs));
  assert.throws(() => verifyReleaseSelection(["V001"], outputs));
  assert.throws(() => verifyReleaseSelection(["V001", "V001", "V002", "V003"], outputs));
  assert.throws(() => verifyReleaseSelection([], []));
  assert.doesNotThrow(() => verifyReleaseSelection(["V001"], [{ id: "V001" }]));
});

test("live receipt must contain exactly the requested works and candidates", () => {
  const works = registry.works.map((work) => ({ work: work.id, slug: work.slug, candidate: work.candidateCommit }));
  const ids = works.map((work) => work.work);
  assert.deepEqual(verifyReleaseReceipt({ works }, ids), works);
  assert.deepEqual(verifyReleaseReceipt(works[0], [ids[0]]), [works[0]]);
  assert.throws(() => verifyReleaseReceipt({ works: [] }, ids));
  assert.throws(() => verifyReleaseReceipt({ works: works.slice(1) }, ids));
  assert.throws(() => verifyReleaseReceipt({ works: [...works, works[0]] }, ids));
  assert.throws(() => verifyReleaseReceipt({ works }, []));
  assert.throws(() => verifyReleaseReceipt({ ...works[0], candidate: "wrong" }, [ids[0]]));
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
