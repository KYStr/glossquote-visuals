import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registry, releaseWorkIds, root, worksFor } from "./site-map.mjs";

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = /^[a-f0-9]{40}$/;
const gates = ["visual", "interaction", "shader", "lifecycle", "accessibility", "performance", "privacy", "seo", "reproducibility"];
const approvedMetadata = new Set(["coordination/work-registry.json", "README.md"]);

export async function releaseProof() {
  const head = git("rev-parse", "HEAD");
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
  assert.equal(process.env.GITHUB_REPOSITORY?.toLowerCase(), registry.repository.toLowerCase());
  assert.equal(process.env.GITHUB_SHA, head);
  assert.equal(process.env.GQ_RELEASE_SHA, head);

  const ids = releaseWorkIds();
  assert.ok(ids.length > 0, "Select at least one reviewed work");
  assert.equal(new Set(ids).size, ids.length, "Release work IDs must be unique");
  verifyReleaseSelection(ids, worksFor("release"));
  const works = [];
  for (const id of ids) {
    assert.match(id, /^V\d{3}$/);
    const work = registry.works.find((entry) => entry.id === id);
    await verifyWork(work, head);
    works.push({ work: work.id, slug: work.slug, candidate: work.candidateCommit });
  }
  return { commit: head, ...works[0], works };
}

async function verifyWork(work, head) {
  assert.ok(work && work.status === "reviewed" && work.blockers.length === 0, "Work needs a passing candidate review");
  assert.match(work.candidateCommit, sha);
  assert.match(work.id, /^V\d{3}$/);
  const path = `evidence/${work.id}/${work.candidateCommit}/acceptance.json`;
  assert.ok(work.reviewEvidence.includes(path), "Acceptance evidence missing from registry");
  const proof = JSON.parse(readFileSync(resolve(root, path), "utf8"));
  assert.equal(proof.commit, work.candidateCommit);
  assert.equal(proof.author, work.owner);
  assert.ok(proof.reviewer && proof.reviewer !== proof.author);
  for (const gate of gates) assert.equal(proof.gates[gate], "PASS", gate);
  verifyDesignScores(proof.scores, proof.designReview);
  verifyTemporalReview(proof.temporalReview, proof);
  for (const criteria of Object.values(proof.designReview.categories)) {
    for (const criterion of criteria) {
      for (const evidence of criterion.evidence) {
        assert.ok(evidence.startsWith(`evidence/${work.id}/${work.candidateCommit}/`),
          "Design evidence must belong to this work and candidate");
        const file = resolve(root, evidence);
        assert.ok(existsSync(file) && lstatSync(file).isFile(), `Missing design evidence file: ${evidence}`);
      }
    }
  }
  for (const evidence of temporalEvidence(proof.temporalReview)) {
    assert.ok(evidence.startsWith(`evidence/${work.id}/${work.candidateCommit}/`),
      "Temporal evidence must belong to this work and candidate");
    const file = resolve(root, evidence);
    assert.ok(existsSync(file) && lstatSync(file).isFile(), `Missing temporal evidence: ${evidence}`);
  }
  assert.ok(Number.isSafeInteger(proof.jobId) && proof.jobId > 0);
  assert.ok(Number.isSafeInteger(proof.runId) && proof.runId > 0);

  git("merge-base", "--is-ancestor", work.candidateCommit, head);
  for (const change of git("diff", "--name-only", work.candidateCommit, head).split("\n").filter(Boolean)) {
    assert.ok(change.startsWith("evidence/") || approvedMetadata.has(change), `Source changed after candidate review: ${change}`);
  }

  const response = await fetch(`https://api.github.com/repos/${registry.repository}/actions/jobs/${proof.jobId}`, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.ok(response.ok, `Unable to verify public Actions evidence: HTTP ${response.status}`);
  const job = await response.json();
  assert.equal(job.conclusion, "success");
  assert.equal(job.head_sha, work.candidateCommit);
  assert.equal(job.run_id, proof.runId);
  assert.equal(job.workflow_name, "Verify visual candidate");
  assert.equal(job.name, "All candidate checks", "Release needs the aggregate of all eight isolated browser lanes");
  assert.ok(job.labels.includes("windows-2025"), "Acceptance requires the verified Windows renderer");
}

export const designCriteria = {
  artDirection: ["brandIdentity", "heroComposition", "typography", "materialImagery", "pageRhythm"],
  uiDesign: ["informationHierarchy", "navigationActions", "formsStates", "responsiveAccessibility", "interactionConsistency"],
  commercialCompleteness: ["positioningValue", "decisionInformation", "truthfulTrust", "customerJourney", "completionRecovery"],
};

function temporalEvidence(review) {
  return review.views.flatMap((view) => [
    ...view.frames.map((frame) => frame.evidence),
    ...view.controlEvidence,
    ...(view.semanticControls?.sequence ?? []).flatMap(({ composite, texture }) => [composite, texture]),
    ...Object.values(view.pauseEvidence),
  ]);
}

export function verifyTemporalReview(review, proof) {
  assert.equal(review?.version, "material-motion-v1");
  assert.equal(review.status, "PASS");
  assert.equal(review.commit, proof.commit);
  assert.equal(review.reviewer, proof.reviewer);
  assert.notEqual(review.reviewer, proof.author);
  assert.deepEqual(review.views.map(({ viewport }) => viewport).sort(), ["desktop", "mobile"]);
  for (const view of review.views) {
    assert.equal(view.pauseMode, "freeze", "A static fallback is not a frozen GPU frame");
    assert.equal(view.coherence, "PASS");
    assert.ok(typeof view.reason === "string" && view.reason.trim().length > 0);
    assert.ok(["measured-wall-clock", "controlled-animation-clock"].includes(view.timeBasis),
      "Scheduled screenshot labels are not actual frame timestamps");
    const times = view.frames.map(({ seconds }) => seconds);
    assert.ok(times.length >= 5 && times[0] === 0 && times.at(-1) >= 8,
      "Review at least five original frames spanning eight measured animation seconds");
    assert.ok(times.every((time, index) => Number.isFinite(time) && time >= 0 &&
      (index === 0 || time > times[index - 1])), "Original frames need ordered unique timestamps");
    assert.ok(["periodic", "evolving"].includes(view.motionKind));
    if (view.motionKind === "periodic") {
      assert.ok(Number.isFinite(view.cycleSeconds) && view.cycleSeconds > 0);
      assert.ok(times.at(-1) >= view.cycleSeconds, "The full declared animation cycle must be reviewed");
    } else {
      const controls = view.semanticControls;
      assert.equal(controls?.status, "PASS", "Evolving pixels require an independent semantic form review");
      assert.ok(typeof controls.reason === "string" && controls.reason.trim().length > 0);
      assert.ok(Array.isArray(controls.sequence) && controls.sequence.length >= 4);
      const states = controls.sequence.map(({ state }) => state);
      assert.ok(states.every((state) => typeof state === "string" && state.length > 0));
      assert.ok(new Set(states).size >= 3 && states[0] === states.at(-1), "Review three distinct controls and the return state");
      for (const entry of controls.sequence) {
        assert.equal(entry.verdict, "PASS");
        assert.ok(typeof entry.observedShape === "string" && entry.observedShape.trim().length > 0);
      }
      for (const kind of ["composite", "texture"]) {
        assert.equal(new Set(controls.sequence.map((entry) => entry[kind])).size, controls.sequence.length,
          "Each form and its return require a distinct original capture");
      }
    }
    assert.ok(Array.isArray(view.controlEvidence) && view.controlEvidence.length >= 3,
      "Review minimum, middle/alternate, maximum and return control evidence");
    assert.deepEqual(Object.keys(view.pauseEvidence).sort(), ["before", "paused", "resumed", "stillPaused"]);
  }
  for (const path of temporalEvidence(review)) {
    assert.ok(typeof path === "string" && path.startsWith("evidence/") && path.length > 9 &&
      !path.endsWith("/") && !path.includes("\\") && !path.split("/").includes(".."));
  }
}

export function verifyReleaseSelection(ids, outputWorks) {
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), outputWorks.map(({ id }) => id).sort(),
    "Every work rebuilt into the Pages artifact needs this release's candidate review; include all output works");
}

export function verifyDesignScores(scores, review) {
  assert.equal(review?.rubricVersion, "commercial-v1");
  for (const [category, expected] of Object.entries(designCriteria)) {
    const score = scores?.[category];
    assert.ok(Number.isFinite(score) && score > 9 && score <= 10,
      `${category} requires an evidence-backed score strictly above 9/10`);
    assert.ok(Number.isInteger(score * 10), "Category scores use 0.1-point increments");
    const criteria = review.categories?.[category];
    assert.ok(Array.isArray(criteria));
    assert.deepEqual(criteria.map((criterion) => criterion.id).sort(), [...expected].sort());
    let tenths = 0;
    for (const criterion of criteria) {
      assert.equal(criterion.status, "PASS");
      assert.ok(Number.isFinite(criterion.score) && criterion.score >= 0 && criterion.score <= 2);
      assert.ok(Number.isInteger(criterion.score * 10), "Criterion scores use 0.1-point increments");
      assert.ok(typeof criterion.reason === "string" && criterion.reason.trim().length > 0);
      assert.ok(Array.isArray(criterion.evidence) && criterion.evidence.length > 0);
      for (const path of criterion.evidence) {
        assert.ok(typeof path === "string" && path.startsWith("evidence/") && path.length > 9 &&
          !path.endsWith("/") && !path.includes("\\") && !path.split("/").includes(".."));
      }
      tenths += criterion.score * 10;
    }
    assert.ok(tenths > 90 && tenths <= 100, `${category} criteria must sum to strictly more than 9/10`);
    assert.equal(tenths, score * 10, `${category} total differs from its criteria`);
  }
}

export function verifyReleaseReceipt(release, expectedIds) {
  assert.ok(expectedIds.length > 0, "Live verification needs the requested work IDs");
  const works = release.works ?? [release];
  assert.ok(Array.isArray(works) && works.length > 0);
  const ids = works.map((work) => work.work);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...expectedIds].sort());
  for (const work of works) {
    const expected = registry.works.find(({ id }) => id === work.work);
    assert.ok(expected);
    assert.equal(work.slug, expected.slug);
    assert.equal(work.candidate, expected.candidateCommit);
  }
  return works;
}
