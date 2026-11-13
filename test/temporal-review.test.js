import assert from "node:assert/strict";
import test from "node:test";
import { verifyTemporalReview } from "../scripts/release-proof.mjs";

const proof = { commit: "a".repeat(40), author: "producer", reviewer: "independent-reviewer" };
function fixture() {
  return { version: "material-motion-v1", status: "PASS", commit: proof.commit, reviewer: proof.reviewer,
    views: ["desktop", "mobile"].map((viewport) => ({
      viewport, pauseMode: "freeze", coherence: "PASS", reason: "Original frames reviewed",
      motionKind: "periodic", cycleSeconds: 8, timeBasis: "controlled-animation-clock",
      frames: [0, 2, 4, 6, 8].map((seconds) => ({ seconds, evidence: `evidence/${viewport}-${seconds}.png` })),
      controlEvidence: ["min", "middle", "max", "return"].map((label) => `evidence/${viewport}-${label}.png`),
      pauseEvidence: Object.fromEntries(["before", "paused", "stillPaused", "resumed"]
        .map((label) => [label, `evidence/${viewport}-${label}.png`])),
    })),
  };
}

test("motion acceptance rejects fallback substitution and incomplete or mismatched evidence", () => {
  assert.doesNotThrow(() => verifyTemporalReview(fixture(), proof));
  for (const mutate of [
    (review) => { review.commit = "b".repeat(40); },
    (review) => { review.reviewer = proof.author; },
    (review) => { review.views.pop(); },
    (review) => { review.views[0].pauseMode = "legacy-fallback"; },
    (review) => { review.views[0].coherence = "NOT_RUN"; },
    (review) => { review.views[0].frames.pop(); },
    (review) => { review.views[0].timeBasis = "scheduled-targets"; },
    (review) => { review.views[0].cycleSeconds = 12; },
    (review) => { delete review.views[0].pauseEvidence.resumed; },
    (review) => { review.views[0].controlEvidence = []; },
    (review) => { review.views[0].frames[0].evidence = "evidence/../other.png"; },
  ]) {
    const review = fixture();
    mutate(review);
    assert.throws(() => verifyTemporalReview(review, proof));
  }
  const simulation = fixture();
  for (const view of simulation.views) { view.motionKind = "evolving"; delete view.cycleSeconds; }
  assert.throws(() => verifyTemporalReview(simulation, proof), /semantic form review/);
  for (const view of simulation.views) {
    view.semanticControls = { status: "PASS", reason: "Original composite and GPU shape inspected, not inferred from DOM or pixel movement",
      sequence: ["identity", "motion", "digital", "identity"].map((state, index) => ({
        state, verdict: "PASS", observedShape: { identity: "ring", motion: "helix", digital: "ribbon" }[state],
        composite: `evidence/${view.viewport}-form-${index}.png`, texture: `evidence/${view.viewport}-gpu-${index}.png`,
      })),
    };
  }
  assert.doesNotThrow(() => verifyTemporalReview(simulation, proof));
  for (const mutate of [
    (view) => { view.semanticControls.sequence.pop(); },
    (view) => { view.semanticControls.sequence[1].verdict = "NOT_RUN"; },
    (view) => { view.semanticControls.sequence[1].texture = view.semanticControls.sequence[0].texture; },
    (view) => { delete view.semanticControls.sequence[1].observedShape; },
  ]) {
    const altered = structuredClone(simulation);
    mutate(altered.views[0]);
    assert.throws(() => verifyTemporalReview(altered, proof));
  }
});
