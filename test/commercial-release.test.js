import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { carriedPublicAssets, carriedRuntimeAssets, commercialRules, verifyCandidateLanes, verifyCommercialReview, verifyReleaseSelection } from "../scripts/release-proof.mjs";
import { base } from "../scripts/site-map.mjs";

test("published rule IDs match the written acceptance contract", () => {
  const document = readFileSync(new URL("../docs/M04-ACCEPTANCE.md", import.meta.url), "utf8");
  const documented = [...document.matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map((match) => match[1]);
  assert.deepEqual(commercialRules, documented);
});

test("a new work requires independent observations and original evidence for every rule", (t) => {
  const repo = mkdtempSync(join(tmpdir(), "visual-release-test-"));
  t.after(() => rmSync(repo, { recursive: true }));
  const work = { id: "V006", owner: "author", candidateCommit: "a".repeat(40) };
  const prefix = `evidence/${work.id}/${work.candidateCommit}/`;
  const shots = ["desktop", "mobile"].map((viewport) => {
    const rel = prefix + viewport + "/results.json";
    const width = viewport === "desktop" ? [1440, 900] : [390, 844];
    const capture = { work: work.id, commit: work.candidateCommit, viewport, performance: {
      cssSize: width, adapter: { description: "test adapter" }, dpr: 1, canvasSize: [width],
      method: "Window-bounded presentation-texture queue submissions", start: 2000, end: 12000,
      timestamps: Array.from({ length: 500 }, (_, i) => 2010 + i * 20),
    } };
    mkdirSync(join(repo, prefix, viewport), { recursive: true });
    writeFileSync(join(repo, rel), JSON.stringify(capture));
    return rel;
  });
  const proof = { commit: work.candidateCommit, author: "author", reviewer: "director", ruleReview: {
    version: "commercial-rules-v1", environment: "isolated test", rules: commercialRules.map((id) => ({
      id, status: "PASS", reason: "Reviewed observation", evidence: id === "PERF-1" ? shots : [shots[0]],
    })),
  } };
  const verify = (value) => verifyCommercialReview(work, value, repo);
  assert.doesNotThrow(() => verify(proof));
  assert.throws(() => verify({ ...proof, ruleReview: undefined, scores: { artDirection: 10 } }));
  assert.throws(() => verify({ ...proof, reviewer: proof.author }));
  for (const mutate of [
    (rules) => rules.pop(),
    (rules) => { rules[0].id = rules[1].id; },
    (rules) => { rules[0].status = "NOT_RUN"; },
    (rules) => { rules[0].status = "FAIL"; },
    (rules) => { rules[0].evidence = []; },
    (rules) => { rules[0].reason = ""; },
    (rules) => { rules[0].evidence = [shots[0].replace("V006", "V001")]; },
    (rules) => { rules[0].evidence = [shots[0].replace(work.candidateCommit, "b".repeat(40))]; },
    (rules) => { rules[0].evidence = [prefix + "desktop/../mobile/results.json"]; },
    (rules) => { rules[0].evidence = [prefix + "no-such-file.png"]; },
    (rules) => { rules.find((r) => r.id === "PERF-1").evidence = [shots[0]]; },
  ]) {
    const modified = structuredClone(proof);
    mutate(modified.ruleReview.rules);
    assert.throws(() => verify(modified));
  }
  const file = join(repo, shots[0]);
  const capture = JSON.parse(readFileSync(file));
  capture.performance.timestamps.splice(1, 20);
  capture.performance.longestMs = 20;
  writeFileSync(file, JSON.stringify(capture));
  assert.throws(() => verify(proof), /raw submission interval/);
});

test("carried pages include nested lazy imports, assets and CSS; receipt covers every output once", () => {
  const html = '<script src="' + base + 'assets/app.js"></script>';
  const manifest = {
    app: { file: "assets/app.js", dynamicImports: ["shader"] },
    shader: { file: "assets/shader.js", imports: ["library"], css: ["assets/site.css"] },
    library: { file: "assets/lib.js", assets: ["assets/height.png"] },
  };
  assert.deepEqual([...carriedRuntimeAssets(html, manifest)].sort(),
    ["assets/app.js", "assets/height.png", "assets/lib.js", "assets/shader.js", "assets/site.css"]);
  assert.throws(() => carriedRuntimeAssets(html, {}));
  const outputs = [{ id: "V001" }, { id: "V006" }];
  assert.doesNotThrow(() => verifyReleaseSelection(["V006"], outputs, [{ work: "V001" }]));
  assert.throws(() => verifyReleaseSelection(["V006"], outputs, []));
  assert.throws(() => verifyReleaseSelection(["V006"], outputs, [{ work: "V006" }]));
});

test("a revised work can replace its private media while carried and shared assets stay pinned", () => {
  const paths = ["media/tide-table/cover.webp", "media/sorbet-hour/cover.webp", "media/sorbet-hour/berry.webp",
    "media/sorbet-hour-old.svg", "media/selvedge/plain.webp", "fonts/studio-tc.css", "licenses/NOTICES.txt"];
  const replacing = new Set(["sorbet-hour", "selvedge"]);
  assert.deepEqual(carriedPublicAssets(paths, replacing, ["media/tide-table/cover.webp"]),
    ["media/tide-table/cover.webp", "media/sorbet-hour-old.svg", "fonts/studio-tc.css", "licenses/NOTICES.txt"]);
  // A cross-work reference from a lazy chunk also protects all computed variants.
  assert.deepEqual(carriedPublicAssets(paths, replacing, ['const dir = "sorbet-hour";']).sort(),
    paths.filter(path => !path.includes("/selvedge/")).sort());
  // A shared stylesheet can import a namespaced image which references another work.
  const cross = { "fonts/studio-tc.css": "url(../media/selvedge/cloth.svg)",
    "media/selvedge/cloth.svg": '<image href="../sorbet-hour/berry.webp"/>' };
  const linkedPaths = [...paths, "media/selvedge/cloth.svg"];
  assert.deepEqual(carriedPublicAssets(linkedPaths, replacing, [], path => cross[path] ?? "").sort(), linkedPaths.sort());
});

test("an aggregate must cover this work, both locales and both viewports in the same successful attempt", () => {
  const work = { id: "V009", candidateCommit: "e".repeat(40) };
  const aggregate = { run_id: 47, run_attempt: 2 };
  const jobs = ["zh-Hant", "en"].flatMap(lang => ["desktop", "mobile"].map(view => ({
    ...aggregate, name: `evidence (V009, ${lang}, ${view})`, head_sha: work.candidateCommit,
    conclusion: "success", labels: ["windows-2025"],
  })));
  assert.doesNotThrow(() => verifyCandidateLanes(work, aggregate, jobs));
  assert.throws(() => verifyCandidateLanes({ ...work, id: "V011" }, aggregate, jobs));
  assert.throws(() => verifyCandidateLanes(work, aggregate, jobs.slice(1)));
  assert.throws(() => verifyCandidateLanes(work, aggregate, [...jobs, jobs[0]]));
  for (const change of [{ run_id: 48 }, { run_attempt: 1 }, { head_sha: "a".repeat(40) },
    { conclusion: "failure" }, { labels: ["ubuntu-latest"] }]) {
    assert.throws(() => verifyCandidateLanes(work, aggregate, [{ ...jobs[0], ...change }, ...jobs.slice(1)]));
  }
});
