import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PNG } from "playwright-core/lib/utilsBundle";
import { craftCriteria, craftMilestone, craftVersion, verifyCraftReview, verifyCraftWorkflow } from "../scripts/release-proof.mjs";
import { stageThumbnail } from "./browser/m06-craft.mjs";

test("stage thumbnails preserve aspect and average the original pixels without rendering a second scene", () => {
  const source = new PNG({ width: 320, height: 96 });
  for (let x = 0; x < source.width; x++) {
    for (let y = 0; y < source.height; y++) {
      const i = (y * source.width + x) * 4;
      source.data.set([x % 2 ? 180 : 100, 40, 250, 255], i);
    }
  }
  const actual = PNG.sync.read(stageThumbnail(PNG.sync.write(source)).png);
  assert.deepEqual([actual.width, actual.height], [160, 48]);
  assert.deepEqual([...actual.data.subarray(0, 4)], [140, 40, 250, 255]);
  assert.deepEqual([...actual.data.subarray(-4)], [140, 40, 250, 255]);
});

test("fixed M06 craft review checks independent observations, both screen sizes, same-frame evidence and input video", t => {
  const repo = mkdtempSync(join(tmpdir(), "visual-craft-"));
  t.after(() => rmSync(repo, { recursive: true }));
  const work = { id: "V008", owner: "maker", candidateCommit: "b".repeat(40), acceptanceVersion: craftVersion };
  const prefix = `evidence/${work.id}/${work.candidateCommit}/`;
  const refs = [];
  for (const viewport of ["desktop", "mobile"]) {
    const dir = prefix + "V008-en-" + viewport + "/";
    mkdirSync(join(repo, dir), { recursive: true });
    const save = (name, data) => {
      writeFileSync(join(repo, dir, name), data);
      refs.push(dir + name);
      return createHash("sha256").update(data).digest("hex");
    };
    const native = PNG.sync.write(new PNG({ width: 320, height: 200 }));
    const thumb = stageThumbnail(native);
    const media = Buffer.from("1a45dfa300000001", "hex");
    const video = "craft-opening.webm";
    const gesture = "craft-interaction.webm";
    const frame = { native: { file: "craft-01-native.png", sha256: save("craft-01-native.png", native) },
      thumb: { file: "craft-01-160.png", sha256: save("craft-01-160.png", thumb.png), width: 160 } };
    const results = { work: work.id, commit: work.candidateCommit, viewport, lang: "en",
      checks: { "craft-storyboard": { status: "PASS" }, "hero-interaction": { status: "PASS" } },
      capture: { craft: { version: craftVersion, video, videoSha256: save(video, media), frames: [frame] },
        heroInteraction: { input: viewport === "mobile" ? "touch" : "keyboard", video: gesture, videoSha256: save(gesture, media) } } };
    writeFileSync(join(repo, dir, "results.json"), JSON.stringify(results));
  }
  const proof = { author: work.owner, reviewer: "director", commit: work.candidateCommit,
    craftReview: { version: craftVersion, status: "PASS", commit: work.candidateCommit, reviewer: "director",
      criteria: craftCriteria.map((id, i) => ({ id, reason: "Observed contact in the original frame.", status: "PASS",
        evidence: i ? [refs[0]] : [...refs] })) } };
  const verify = entry => verifyCraftReview(work, entry, repo);
  verify(proof);
  assert.throws(() => verifyCraftReview({ ...work, acceptanceVersion: undefined }, proof, repo));
  for (const mutate of [
    p => { delete p.craftReview; },
    p => { p.craftReview.criteria.pop(); },
    p => { p.craftReview.criteria[3].id = "finish"; },
    p => { p.craftReview.criteria[4].reason = " "; },
    p => { p.craftReview.criteria[5].status = "NOT_RUN"; },
    p => { p.craftReview.criteria[0].evidence = p.craftReview.criteria[0].evidence.filter(ref => !ref.includes("-mobile/")); },
    p => { p.craftReview.criteria[0].evidence = p.craftReview.criteria[0].evidence.filter(ref => !ref.endsWith("-160.png")); },
    p => { p.craftReview.criteria[0].evidence = p.craftReview.criteria[0].evidence.filter(ref => !ref.endsWith("interaction.webm")); },
    p => { p.craftReview.criteria[1].evidence = [refs[0].replace("craft-01-native.png", "results.json")]; },
    p => { p.craftReview.criteria[1].evidence = [refs[0].replace(work.candidateCommit, "f".repeat(40))]; },
    p => { p.craftReview.commit = "d".repeat(40); },
    p => { p.craftReview.reviewer = p.reviewer = p.author; },
  ]) {
    const changed = structuredClone(proof);
    mutate(changed);
    assert.throws(() => verify(changed));
  }
  writeFileSync(join(repo, refs[0]), Buffer.concat([PNG.sync.write(new PNG({ width: 2, height: 1 })), Buffer.from("altered")]));
  assert.throws(() => verify(proof), /digest mismatch/);
});

test("new batches can reuse the same craft standard only with their own pinned workflow and aggregate", () => {
  const original = { id: "V008", candidateCommit: "a".repeat(40), acceptanceVersion: craftVersion };
  const next = { ...original, id: "V012", acceptanceMilestone: "M07" };
  assert.equal(craftMilestone(original), "M06");
  assert.equal(craftMilestone(next), "M07");
  for (const invalid of [undefined, "M04", "M05", "M06", "m07", "Anything", "../M07"]) {
    assert.throws(() => craftMilestone({ ...next, acceptanceMilestone: invalid }));
  }
  assert.throws(() => craftMilestone({ ...next, acceptanceVersion: undefined }));
  for (const work of [original, next]) {
    const milestone = craftMilestone(work);
    const workflow = { id: 302, path: ".github/workflows/verify-" + milestone.toLowerCase() + ".yml",
      name: "Verify " + milestone + " candidate" };
    const aggregate = { workflow_name: workflow.name, name: "All " + milestone + " candidate checks", run_id: 12 };
    const run = { id: 12, workflow_id: workflow.id, head_sha: work.candidateCommit, path: workflow.path };
    verifyCraftWorkflow(aggregate, run, work, workflow);
    assert.throws(() => verifyCraftWorkflow(aggregate, run, work === original ? next : original, workflow));
    assert.throws(() => verifyCraftWorkflow({ ...aggregate, workflow_name: "Verify M05 candidate" }, run, work, workflow));
    assert.throws(() => verifyCraftWorkflow({ ...aggregate, name: "All M04 candidate checks" }, run, work, workflow));
    assert.throws(() => verifyCraftWorkflow(aggregate, { ...run, path: ".github/workflows/impostor.yml" }, work, workflow));
    assert.throws(() => verifyCraftWorkflow(aggregate, { ...run, head_sha: "b".repeat(40) }, work, workflow));
    assert.throws(() => verifyCraftWorkflow(aggregate, { ...run, workflow_id: 867 }, work, workflow));
  }
});
