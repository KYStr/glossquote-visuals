import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registry, releaseWorkIds, root } from "./site-map.mjs";

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
  if (registry.milestone === "M02") verifyDesignScores(proof.scores);
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
  assert.ok(job.labels.includes("windows-2025"), "Acceptance requires the verified Windows renderer");
}

export function verifyDesignScores(scores) {
  for (const category of ["artDirection", "uiDesign", "commercialCompleteness"]) {
    const score = scores?.[category];
    assert.ok(Number.isFinite(score) && score > 9 && score <= 10,
      `${category} requires an evidence-backed score strictly above 9/10`);
  }
}
