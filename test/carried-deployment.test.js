import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { verifyCarriedWorks } from "../scripts/release-proof.mjs";
import { base } from "../scripts/site-map.mjs";

test("a previously revised work carries only the public files in the current Pages deployment", async t => {
  const repo = mkdtempSync(join(tmpdir(), "visual-carried-tree-"));
  t.after(() => rmSync(repo, { recursive: true }));
  const put = (relative, body) => {
    const path = join(repo, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  };
  const git = (...args) => execFileSync("git", [
    "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgSign=false", "-c", "core.hooksPath=unused-hooks", ...args,
  ], { cwd: repo, encoding: "utf8" }).trim();
  git("init", "--quiet");
  const candidate = "a".repeat(40);
  const tide = { id: "V006", slug: "tide-table", candidateCommit: candidate };
  const weave = { id: "V007", slug: "selvedge", candidateCommit: "b".repeat(40) };
  put("coordination/work-registry.json", JSON.stringify({ works: [{ ...tide, status: "reviewed" }] }));
  put("public/media/selvedge/retired.webp", "retired");
  git("add", ".");
  git("commit", "--quiet", "-m", "Original product release");
  const original = git("rev-parse", "HEAD");
  git("rm", "--quiet", "public/media/selvedge/retired.webp");
  put("coordination/work-registry.json", JSON.stringify({ works: [{ ...tide, status: "published" }, { ...weave, status: "reviewed" }] }));
  put("public/fonts/current.woff2", "current bytes");
  git("add", ".");
  git("commit", "--quiet", "-m", "Current public tree");
  const current = git("rev-parse", "HEAD");

  const receipts = [
    { work: tide.id, slug: tide.slug, candidate, deployedCommit: original },
    { work: weave.id, slug: weave.slug, candidate: weave.candidateCommit, deployedCommit: current },
  ];
  const live = new Map([
    ["release.json", JSON.stringify({ commit: current,
      works: [{ work: weave.id, slug: weave.slug, candidate: weave.candidateCommit }], carriedWorks: [receipts[0]] })],
    ["assets/weave.js", "const variant = 'plain';"],
    ["fonts/current.woff2", "current bytes"],
  ]);
  put("dist/.vite/manifest.json", JSON.stringify({ weave: { file: "assets/weave.js" } }));
  for (const route of ["works/selvedge/", "en/works/selvedge/", "works/tide-table/", "en/works/tide-table/"]) {
    const html = `<script src="${base}assets/weave.js"></script>`;
    put("dist/" + route + "index.html", html);
    live.set(route, html);
  }
  for (const file of ["assets/weave.js","fonts/current.woff2"]) put("dist/" + file, live.get(file));
  t.mock.method(globalThis, "fetch", async url => {
    const file = new URL(url).pathname.slice(base.length);
    return live.has(file) ? new Response(live.get(file)) : new Response(null, { status: 404 });
  });
  const priorGitDir = process.env.GIT_DIR;
  process.env.GIT_DIR = join(repo, ".git");
  t.after(() => {
    if (priorGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = priorGitDir;
  });
  const published = [tide, weave].map((work, index) => ({
    ...work, status: "published", liveUrl: "https://example.invalid/", deployedCommit: receipts[index].deployedCommit, blockers: [],
  }));
  const verify = () => verifyCarriedWorks(published, current, join(repo, "dist"), ["V008"]);
  assert.deepEqual(await verify(), receipts);
  put("dist/fonts/current.woff2", "changed");
  await assert.rejects(verify, /Published bytes changed.*current\.woff2/);
});
