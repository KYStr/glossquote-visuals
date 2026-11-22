import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import { base, isPublished, origin, registry, releaseWorkIds, root, worksFor } from "./site-map.mjs";

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = /^[a-f0-9]{40}$/;
const gates = ["visual", "interaction", "shader", "lifecycle", "accessibility", "performance", "privacy", "seo", "reproducibility"];
const approvedMetadata = new Set(["coordination/work-registry.json", "README.md"]);
// Historical reviews may be replayed against commits already in the last
// released M05 tree. Removing version fields on a new branch cannot opt out.
const lastLegacyHead = "8206c4a55e8be0faee2ff4b265878d4da75445f7";
export const craftVersion = "hero-craft-v1";
export const craftCriteria = ["silhouette", "finish", "material", "narrative", "continuity", "fidelity"];
const m06Works = new Set(["V008", "V009", "V010"]);

// Pin the workflow to the batch declared by this specific source candidate.
// M06 predates the explicit milestone field and owns exactly these three works.
export function craftMilestone(work) {
  assert.equal(work.acceptanceVersion, craftVersion);
  const milestone = work.acceptanceMilestone ?? (m06Works.has(work.id) ? "M06" : undefined);
  assert.ok(typeof milestone === "string" && /^M(?:0[6-9]|[1-9]\d+)$/.test(milestone),
    "Declare an M06-or-later acceptanceMilestone on the candidate");
  if (milestone === "M06") assert.ok(m06Works.has(work.id), "Work not in the fixed M06 cohort");
  return milestone;
}

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
  const outputWorks = worksFor("release");
  const carriedWorks = await verifyCarriedWorks(outputWorks.filter((work) => !ids.includes(work.id)), head);
  verifyReleaseSelection(ids, outputWorks, carriedWorks);
  const works = [];
  const actionReports = new Map();
  for (const id of ids) {
    assert.match(id, /^V\d{3}$/);
    const work = registry.works.find((entry) => entry.id === id);
    await verifyWork(work, head, actionReports);
    works.push({ work: work.id, slug: work.slug, candidate: work.candidateCommit });
  }
  return { commit: head, ...works[0], works, carriedWorks };
}

async function readAction(path, cache) {
  if (!cache.has(path)) {
    const response = await fetch(`https://api.github.com/repos/${registry.repository}/actions/${path}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15_000),
    });
    assert.ok(response.ok, `Unable to verify public Actions evidence for ${path}: HTTP ${response.status}`);
    cache.set(path, await response.json());
  }
  return cache.get(path);
}

async function verifyWork(work, head, actionReports) {
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
  const newCandidate = git("merge-base", work.candidateCommit, lastLegacyHead) !== work.candidateCommit;
  if (newCandidate) {
    const candidateRegistry = JSON.parse(git("show", work.candidateCommit + ":coordination/work-registry.json"));
    const sourceWork = candidateRegistry.works.find(entry => entry.id === work.id);
    assert.ok(sourceWork, "Work absent from the fixed candidate");
    assert.equal(craftMilestone(work), craftMilestone(sourceWork),
      "The release registry must retain the fixed candidate's acceptance milestone");
  }
  verifyCommercialReview(work, proof);
  verifyTemporalReview(proof.temporalReview, proof);
  for (const evidence of temporalEvidence(proof.temporalReview)) {
    verifyEvidenceFile(work, evidence);
  }
  assert.ok(Number.isSafeInteger(proof.jobId) && proof.jobId > 0);
  assert.ok(Number.isSafeInteger(proof.runId) && proof.runId > 0);

  git("merge-base", "--is-ancestor", work.candidateCommit, head);
  for (const change of git("diff", "--name-only", work.candidateCommit, head).split("\n").filter(Boolean)) {
    assert.ok(change.startsWith("evidence/") || approvedMetadata.has(change), `Source changed after candidate review: ${change}`);
  }

  const job = await readAction(`jobs/${proof.jobId}`, actionReports);
  assert.equal(job.conclusion, "success");
  assert.equal(job.head_sha, work.candidateCommit);
  assert.equal(job.run_id, proof.runId);
  const rules = usesRules(work, proof);
  if (rules) {
    if (newCandidate || work.acceptanceVersion) {
      const run = await readAction(`runs/${job.run_id}`, actionReports);
      const file = "verify-" + craftMilestone(work).toLowerCase() + ".yml";
      const workflow = await readAction(`workflows/${file}`, actionReports);
      verifyCraftWorkflow(job, run, work, workflow);
      assert.equal(git("ls-tree", "--name-only", work.candidateCommit, "--", run.path), run.path);
    } else {
      const workflow = job.workflow_name?.match(/^Verify (M04|M05) candidate$/)?.[1];
      assert.ok(workflow, "Unrecognized rule-based candidate workflow");
      assert.equal(job.name, `All ${workflow} candidate checks`);
    }
    const report = await readAction(`runs/${job.run_id}/attempts/${job.run_attempt}/jobs?per_page=100`, actionReports);
    verifyCandidateLanes(work, job, report.jobs);
  } else {
    assert.equal(job.workflow_name, "Verify visual candidate");
    assert.equal(job.name, "All candidate checks");
  }
  assert.ok(job.labels.includes("windows-2025"), "Acceptance requires the verified Windows renderer");
}

export function verifyCraftWorkflow(job, run, work, workflow) {
  const milestone = craftMilestone(work);
  const name = `Verify ${milestone} candidate`;
  const path = `.github/workflows/verify-${milestone.toLowerCase()}.yml`;
  assert.equal(workflow.name, name);
  assert.equal(workflow.path, path);
  assert.ok(Number.isSafeInteger(workflow.id) && workflow.id > 0);
  assert.equal(run.workflow_id, workflow.id);
  assert.equal(job.workflow_name, name);
  assert.equal(job.name, `All ${milestone} candidate checks`);
  assert.equal(run.path, path);
  assert.equal(run.id, job.run_id);
  assert.equal(run.head_sha, work.candidateCommit);
}

export function verifyCandidateLanes(work, aggregate, jobs) {
  for (const lang of ["zh-Hant", "en"]) {
    for (const viewport of ["desktop", "mobile"]) {
      const name = `evidence (${work.id}, ${lang}, ${viewport})`;
      const matches = jobs.filter(job => job.name === name);
      assert.equal(matches.length, 1, `Missing unique candidate job: ${name}`);
      const [job] = matches;
      assert.equal(job.run_id, aggregate.run_id);
      assert.equal(job.run_attempt, aggregate.run_attempt);
      assert.equal(job.head_sha, work.candidateCommit);
      assert.equal(job.conclusion, "success", name);
      assert.ok(job.labels.includes("windows-2025"), name);
    }
  }
}

export const commercialRules = [
  "ART-1", "ART-2", "ART-3", "GPU-1", "GPU-2", "PERF-1", "PERF-2",
  "UI-1", "UI-2", "BIZ-1", "BIZ-2", "FALL-1", "FALL-2", "SHIP-1",
];

function usesRules(work, proof) {
  return Number(work.id.slice(1)) >= 6 || proof.ruleReview !== undefined || work.acceptanceVersion !== undefined;
}

function verifyEvidenceFile(work, path, repoRoot = root) {
  const prefix = `evidence/${work.id}/${work.candidateCommit}/`;
  assert.ok(typeof path === "string" && path.startsWith(prefix), "Evidence must belong to this work and candidate");
  const parts = path.split("/");
  assert.ok(parts.every((part) => part && part !== "." && part !== ".." && !/[\\:]/.test(part)));
  const file = resolve(repoRoot, path);
  assert.ok(existsSync(file) && lstatSync(file).isFile() && lstatSync(file).size > 0, `Missing or empty evidence: ${path}`);
  assert.equal(relative(realpathSync(repoRoot), realpathSync(file)).split("\\").join("/"), path,
    "Evidence must be a local regular file under the exact candidate directory");
  assert.notEqual(path, prefix + "acceptance.json", "Acceptance cannot serve as its own evidence");
}

function imageKind(bytes) {
  if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") return "jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (bytes.subarray(0, 4).toString("hex") === "1a45dfa3") return "webm";
  return null;
}

export function verifyCraftReview(work, proof, repoRoot = root) {
  const review = proof.craftReview;
  assert.equal(work.acceptanceVersion, craftVersion);
  assert.equal(review?.version, craftVersion);
  assert.equal(review.status, "PASS");
  assert.equal(review.commit, work.candidateCommit);
  assert.equal(review.commit, proof.commit);
  assert.equal(review.reviewer, proof.reviewer);
  assert.ok(review.reviewer && review.reviewer !== work.owner && review.reviewer !== proof.author);
  assert.deepEqual(review.criteria.map(c => c.id).sort(), [...craftCriteria].sort(),
    "All six craft criteria must appear exactly once");
  const references = new Set();
  const images = new Map();
  function inspectImage(path) {
    if (!images.has(path)) {
      const bytes = readFileSync(resolve(repoRoot, path));
      images.set(path, { kind: imageKind(bytes), hash: createHash("sha256").update(bytes).digest("hex") });
    }
    return images.get(path);
  }
  for (const criterion of review.criteria) {
    assert.equal(criterion.status, "PASS", criterion.id);
    assert.ok(typeof criterion.reason === "string" && criterion.reason.trim(), "Missing craft observation: " + criterion.id);
    assert.ok(Array.isArray(criterion.evidence) && criterion.evidence.length, "Missing craft evidence: " + criterion.id);
    for (const path of criterion.evidence) {
      verifyEvidenceFile(work, path, repoRoot);
      references.add(path);
    }
    assert.ok(criterion.evidence.some(path => /\.(png|jpe?g|webp|webm)$/i.test(path) && inspectImage(path).kind),
      "Craft review requires original visual evidence: " + criterion.id);
  }
  const prefix = `evidence/${work.id}/${work.candidateCommit}/`;
  function requireCapture(dir, file, hash, kind) {
    assert.ok(typeof file === "string" && /^[\w.-]+$/.test(file));
    const path = dir + file;
    assert.ok(references.has(path), "Cite the reviewed craft capture: " + path);
    const capture = inspectImage(path);
    assert.equal(capture.kind, kind, path);
    assert.equal(capture.hash, hash, "Original capture digest mismatch: " + path);
  }
  for (const viewport of ["desktop", "mobile"]) {
    const lanes = ["zh-Hant", "en"].map(lang => ({ lang, dir: prefix + [work.id, lang, viewport].join("-") + "/" }));
    const cited = lanes.filter(({ dir }) => references.has(dir + "craft-opening.webm"));
    assert.ok(cited.length, "Review the uncut cold-opening video on " + viewport);
    for (const { dir, lang } of cited) {
      const path = dir + "results.json";
      verifyEvidenceFile(work, path, repoRoot);
      const results = JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
      assert.deepEqual([results.work, results.commit, results.lang, results.viewport], [work.id, work.candidateCommit, lang, viewport]);
      assert.equal(results.checks["craft-storyboard"]?.status, "PASS");
      const craft = results.capture.craft;
      assert.equal(craft.version, craftVersion);
      assert.equal(craft.video, "craft-opening.webm");
      requireCapture(dir, craft.video, craft.videoSha256, "webm");
      // Review at least one corresponding native / 160 px pair per size. The
      // video covers the complete process, including intermediate contact and hold.
      const matched = craft.frames.filter(f => references.has(dir + f.native.file) && references.has(dir + f.thumb.file));
      assert.ok(matched.length, "Cite matching native and 160px frames on " + viewport);
      for (const { native, thumb } of matched) {
        assert.equal(thumb.width, 160);
        requireCapture(dir, native.file, native.sha256, "png");
        requireCapture(dir, thumb.file, thumb.sha256, "png");
      }
      if (work.id === "V008") {
        assert.equal(results.checks["hero-interaction"]?.status, "PASS");
        const interaction = results.capture.heroInteraction;
        assert.equal(interaction.input, viewport === "desktop" ? "keyboard" : "touch");
        assert.equal(interaction.video, "craft-interaction.webm");
        requireCapture(dir, interaction.video, interaction.videoSha256, "webm");
      }
    }
  }
}

export function verifyCommercialReview(work, proof, repoRoot = root) {
  assert.match(work.id, /^V\d{3}$/);
  assert.match(work.candidateCommit, sha);
  assert.equal(proof.commit, work.candidateCommit);
  assert.equal(proof.author, work.owner);
  assert.ok(proof.author && proof.reviewer && proof.reviewer !== proof.author);
  if (work.acceptanceVersion !== undefined || proof.craftReview !== undefined) verifyCraftReview(work, proof, repoRoot);
  if (!usesRules(work, proof)) {
    verifyDesignScores(proof.scores, proof.designReview);
    for (const criterion of Object.values(proof.designReview.categories).flat()) {
      for (const path of criterion.evidence) verifyEvidenceFile(work, path, repoRoot);
    }
    return;
  }
  const review = proof.ruleReview;
  assert.equal(review?.version, "commercial-rules-v1", "New works require the rule-by-rule review");
  assert.ok(typeof review.environment === "string" && review.environment.trim(), "Record the review environment");
  assert.deepEqual(review.rules.map(({ id }) => id).sort(), [...commercialRules].sort(),
    "Every rule must appear exactly once");
  for (const rule of review.rules) {
    assert.equal(rule.status, "PASS", rule.id);
    assert.ok(typeof rule.reason === "string" && rule.reason.trim(), `Missing observation for ${rule.id}`);
    assert.ok(Array.isArray(rule.evidence) && rule.evidence.length > 0, `Missing evidence for ${rule.id}`);
    for (const path of rule.evidence) verifyEvidenceFile(work, path, repoRoot);
    if (rule.id === "PERF-1") {
      const captures = rule.evidence.filter((path) => path.endsWith("/results.json"))
        .map((path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")));
      verifyFrameMeasurements(work, captures);
    }
  }
}

function verifyFrameMeasurements(work, captures) {
  const viewports = new Set();
  for (const capture of captures) {
    assert.equal(capture.work, work.id);
    assert.equal(capture.commit, work.candidateCommit);
    const data = capture.performance;
    assert.ok(["mobile", "desktop"].includes(capture.viewport));
    assert.deepEqual(data.cssSize, capture.viewport === "mobile" ? [390, 844] : [1440, 900]);
    assert.ok(data.adapter && Number.isFinite(data.dpr) && data.dpr > 0);
    assert.equal(data.canvasSize.length, 1);
    assert.ok(data.canvasSize[0].length === 2 && data.canvasSize[0].every((n) => Number.isInteger(n) && n > 0));
    assert.ok(data.method.includes("presentation-texture queue submissions"));
    assert.ok(Number.isFinite(data.start) && Number.isFinite(data.end) && data.end - data.start >= 10_000);
    assert.ok(Array.isArray(data.timestamps) && data.timestamps.length >= 2);
    const times = [data.start, ...data.timestamps, data.end];
    const gaps = times.slice(1).map((time, i) => {
      assert.ok(Number.isFinite(time) && time >= times[i], "Submission times must be ordered inside the window");
      return time - times[i];
    }).sort((a, b) => a - b);
    for (const [fraction, limit] of [[0.50, 34], [0.95, 50], [1, 150]]) {
      assert.ok(gaps[Math.ceil(gaps.length * fraction) - 1] <= limit,
        `PERF-1 ${capture.viewport}: raw submission interval exceeds ${limit} ms`);
    }
    viewports.add(capture.viewport);
  }
  assert.deepEqual([...viewports].sort(), ["desktop", "mobile"], "PERF-1 needs both raw viewport measurements");
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

// A carried page must match the actual Pages deployment, including runtime chunks
// reached by dynamic imports and assets resolved from public/ by application code.
export async function verifyCarriedWorks(works, head, dist = resolve(root, "dist"), selected = releaseWorkIds()) {
  if (works.length === 0) return [];
  const manifest = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json"), "utf8"));
  const readLive = async (file) => {
    const response = await fetch(origin + base + file, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000) });
    assert.equal(response.status, 200, `Previously deployed file unavailable: ${file}`);
    return response;
  };
  const previous = await (await readLive("release.json")).json();
  const carried = [];
  const files = new Set();
  // Product attestations can span releases. Only the currently served release
  // owns the public asset tree, including product variants resolved at runtime.
  assert.match(previous.commit, sha);
  git("merge-base", "--is-ancestor", previous.commit, head);
  const previousPublic = git("ls-tree", "-r", "-z", "--name-only", previous.commit, "--", "public/")
    .split("\0").filter(Boolean).map(path => {
      assert.ok(path.startsWith("public/"));
      return path.slice("public/".length);
    });
  const replacing = new Set(registry.works.filter(work => selected.includes(work.id)).map(work => work.slug));
  const deployments = new Map();
  for (const work of works) {
    assert.ok(isPublished(work) && work.blockers.length === 0, `Pending work cannot be carried: ${work.id}`);
    const deployment = work.deployedCommit;
    assert.match(deployment, sha);
    assert.match(work.candidateCommit, sha);
    assert.match(work.slug, /^[a-z]+(?:-[a-z]+)*$/);
    const prior = previous.works.find((entry) => entry.work === work.id);
    const proven = prior ? { ...prior, deployedCommit: previous.commit } :
      previous.carriedWorks?.find((entry) => entry.work === work.id);
    const receipt = { work: work.id, slug: work.slug, candidate: work.candidateCommit, deployedCommit: deployment };
    assert.deepEqual(proven, receipt, `The live release must attest the carried work: ${work.id}`);
    if (!deployments.has(deployment)) {
      git("merge-base", "--is-ancestor", deployment, head);
      deployments.set(deployment, JSON.parse(git("show", deployment + ":coordination/work-registry.json")));
    }
    const original = deployments.get(deployment).works.find((entry) => entry.id === work.id);
    assert.equal(original?.status, "reviewed");
    assert.equal(original.candidateCommit, work.candidateCommit);
    assert.equal(original.slug, work.slug);
    for (const prefix of ["", "en/"]) {
      const page = prefix + "works/" + work.slug + "/index.html";
      files.add(page);
      const html = readFileSync(resolve(dist, page), "utf8");
      for (const asset of carriedRuntimeAssets(html, manifest)) files.add(asset);
    }
    carried.push(receipt);
  }
  // The work registry owns media/<slug>/. Previously shipped global assets
  // and every carried work's own assets are compared, including dynamic URLs.
  // A reference from carried HTML, lazy JS/CSS or a shared text asset protects
  // the entire referenced work directory, including computed sibling filenames.
  const readDependencyText = path => /\.(?:css|m?js|svg|json|html)$/i.test(path)
    ? readFileSync(resolve(dist, path), "utf8") : "";
  const runtimeSources = [...files].map(path => ({ path, text: readDependencyText(path) }));
  for (const path of carriedPublicAssets(previousPublic, replacing, runtimeSources, readDependencyText)) files.add(path);
  for (const file of files) {
    const output = readFileSync(resolve(dist, file));
    const url = file.endsWith("/index.html") ? file.slice(0, -"index.html".length) : file;
    const deployed = Buffer.from(await (await readLive(url)).arrayBuffer());
    assert.ok(output.equals(deployed), `Published bytes changed; an independent review is required: ${file}`);
  }
  console.log(`PASS matched ${files.size} deployed files for ${carried.map((work) => work.work).join(", ")}`);
  return carried;
}

export function carriedPublicAssets(paths, replacing, runtimeSources, readDependencyText = () => "") {
  const known = new Set(paths);
  const pending = new Map([...replacing].map(slug => [slug, []]));
  const retained = [];
  for (const path of known) {
    const [directory, slug, ...file] = path.split("/");
    if (directory === "media" && file.length && pending.has(slug)) pending.get(slug).push(path);
    else retained.push(path);
  }
  // Global files still need exact byte comparisons. Their references matter
  // only when a carried page or one of its dependencies actually loads them.
  const queue = runtimeSources.map(source => typeof source === "string" ? { path: "assets/entry.js", text: source } : source);
  const visited = new Set(queue.map(source => source.path));
  function enqueue(path) {
    if (visited.has(path) || !known.has(path) || !/\.(css|m?js|html|svg|json)$/i.test(path)) return;
    visited.add(path);
    queue.push({ path, text: readDependencyText(path) });
  }
  function protectMedia(slug) {
    const files = pending.get(slug);
    if (!files) return;
    pending.delete(slug);
    retained.push(...files);
    for (const file of files) enqueue(file);
  }
  function follow(target) {
    if (target.startsWith("media/")) protectMedia(target.split("/")[1]);
    enqueue(target);
  }
  for (const { path, text } of queue) {
    const refs = new Set();
    for (const match of text.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]+?))\s*\)/gi)) refs.add(match[1] ?? match[2] ?? match[3]);
    for (const match of text.matchAll(/\bsrcset\s*=\s*["']([^"']*)["']/gi)) {
      for (const entry of match[1].split(",")) refs.add(entry.trim().split(/\s+/)[0]);
    }
    for (const match of text.matchAll(/"([^"\n]*)"|'([^'\n]*)'|\x60([^\x60\n]*)\x60|\b(?:src|href)\s*=\s*([^"'\s>]+)/gi)) {
      refs.add(match[1] ?? match[2] ?? match[3] ?? match[4]);
    }
    for (const ref of refs) {
      // A module can construct media filenames from an exact quoted slug.
      if (/\.m?js$/i.test(path)) {
        if (pending.has(ref)) protectMedia(ref);
        // A module may append a project-relative literal to its base URL.
        if (/^(?:media|fonts|licenses)\//.test(ref)) follow(ref.split(/[?#]/)[0]);
      }
      if (!ref || ref.startsWith("#") || /[<>\r\n]/.test(ref) || !URL.canParse(ref, origin + base + path)) continue;
      const url = new URL(ref, origin + base + path);
      if (url.origin !== origin || !url.pathname.startsWith(base)) continue;
      let target;
      try { target = decodeURIComponent(url.pathname.slice(base.length)); }
      catch { continue; }
      follow(target);
    }
  }
  return retained;
}

export function carriedRuntimeAssets(html, manifest) {
  const keys = new Map(Object.entries(manifest).map(([key, chunk]) => [chunk.file, key]));
  const assets = new Set();
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    assert.ok(chunk, `Unknown asset in built manifest: ${key}`);
    for (const file of [chunk.file, ...chunk.css ?? [], ...chunk.assets ?? []]) assets.add(file);
    for (const dependency of [...chunk.imports ?? [], ...chunk.dynamicImports ?? []]) visit(dependency);
  }
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (url.startsWith(base + "assets/")) visit(keys.get(url.slice(base.length)));
  }
  assert.ok(assets.size > 0, "A carried page needs a complete Vite entry");
  return assets;
}

export function verifyReleaseSelection(ids, outputWorks, carriedWorks = []) {
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
  const covered = [...ids, ...carriedWorks.map((work) => work.work)];
  assert.equal(new Set(covered).size, covered.length);
  assert.deepEqual(covered.sort(), outputWorks.map(({ id }) => id).sort(),
    "Every output needs candidate review or a byte-for-byte match to its reviewed deployment");
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

export function verifyReleaseReceipt(release, expectedIds, deployedWorks = registry.works) {
  assert.ok(expectedIds.length > 0, "Live verification needs the requested work IDs");
  const works = release.works ?? [release];
  assert.ok(Array.isArray(works) && works.length > 0);
  const ids = works.map((work) => work.work);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...expectedIds].sort());
  for (const work of works) {
    const expected = deployedWorks.find(({ id }) => id === work.work);
    assert.ok(expected);
    assert.equal(work.slug, expected.slug);
    assert.equal(work.candidate, expected.candidateCommit);
  }
  if (release.carriedWorks !== undefined) {
    const carried = deployedWorks.filter((work) => isPublished(work) && !ids.includes(work.id));
    const expected = carried.map((work) => ({
      work: work.id, slug: work.slug, candidate: work.candidateCommit, deployedCommit: work.deployedCommit,
    }));
    const byId = (a, b) => a.work.localeCompare(b.work);
    assert.deepEqual([...release.carriedWorks].sort(byId), expected.sort(byId));
  }
  return works;
}
