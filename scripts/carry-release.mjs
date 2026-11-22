import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { carriedRuntimeAssets } from "./release-proof.mjs";
import { base, origin, root } from "./site-map.mjs";

const bundleSources = [
  ["M07", "86e6da3d596c64c5cc3886a20807ffd4ba3a906c"],
  ["M06", "d28a1030bdd348c2733a644027ca35d782d00c9d"],
];
const assetName = /^assets\/[A-Za-z0-9_][\w.-]*-[\w-]{8}\.[A-Za-z0-9]+$/;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function fromPages(file) {
  const route = file.endsWith("/index.html") ? file.slice(0, -"index.html".length) : file;
  const url = new URL(route, origin + base);
  assert.ok(url.origin === origin && url.pathname === base + route);
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `Previous Pages file unavailable: ${file}`);
  return Buffer.from(await response.arrayBuffer());
}

// Source edits to a carried work must be released as a reviewed change, even
// when its replacement output will come from the previously published build.
export function verifyCarrySources(deployment, works, repository = root) {
  assert.match(deployment, /^[a-f0-9]{40}$/);
  const paths = [".node-version", "package.json", "package-lock.json", "vite.config.mjs",
    "scripts/site-map.mjs", "scripts/shaders-csp.mjs", "src/shared"];
  for (const { slug } of works) {
    assert.match(slug, /^[a-z]+(?:-[a-z]+)*$/);
    paths.push(`works/${slug}`, `en/works/${slug}`, `src/works/${slug}`, `public/media/${slug}`);
  }
  const git = (...args) => execFileSync("git", args, { cwd: repository, encoding: "utf8" });
  const changed = git("diff", "--name-only", deployment, "--", ...paths).trim();
  assert.equal(changed, "", `Carried source changed since deployment; review the affected work: ${changed}`);
  const previousCatalog = JSON.parse(git("show", deployment + ":src/works/catalog.json"));
  const catalog = JSON.parse(readFileSync(resolve(repository, "src/works/catalog.json")));
  for (const { slug } of works) assert.deepEqual(catalog[slug], previousCatalog[slug], `Changed carried catalog entry: ${slug}`);
}

// The Vite keys of dynamic imports can stay the same while their hashed files
// change. Keep each graph's imports in its own key space.
function mergedManifest(current, previous, deployment) {
  const result = { ...current };
  const prefix = `carried/${deployment}/`;
  for (const [key, entry] of Object.entries(previous)) {
    assert.ok(assetName.test(entry.file) && !Object.hasOwn(result, prefix + key));
    const copy = { ...entry };
    for (const field of ["imports", "dynamicImports"]) {
      if (!entry[field]) continue;
      copy[field] = entry[field].map(ref => {
        assert.ok(Object.hasOwn(previous, ref), `Missing pinned manifest reference: ${ref}`);
        return prefix + ref;
      });
    }
    result[prefix + key] = copy;
  }
  return result;
}

function distPath(dist, file) {
  const absolute = resolve(dist, file);
  // All accepted relative names are controlled by exact page membership or
  // assetName. Refuse links or junctions that could redirect an allowed name.
  assert.equal(realpathSync(dirname(absolute)), dirname(absolute));
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (entry) assert.ok(entry.isFile() && entry.nlink === 1, `Unexpected output type: ${file}`);
  return absolute;
}

function htmlWithoutChunkHashes(html) {
  return html.replace(/((?:src|href)="\/glossquote-visuals\/assets\/[\w.-]+)-[\w-]{8}(\.[\w]+")/g, "$1-[hash]$2");
}

export async function assemblePinnedBundles(dist, index, load = fromPages) {
  dist = realpathSync(dist);
  const current = JSON.parse(readFileSync(distPath(dist, ".vite/manifest.json")));
  const merged = mergedManifest(current, index.manifest, index.deployment);
  const pages = new Set(), assets = new Set();
  for (const work of index.works) {
    assert.match(work.slug, /^[a-z]+(?:-[a-z]+)*$/);
    const expected = [`en/works/${work.slug}/index.html`, `works/${work.slug}/index.html`];
    assert.deepEqual([...work.pages].sort(), expected);
    for (const f of work.pages) { assert.ok(!pages.has(f)); pages.add(f); }
    for (const f of work.assets) { assert.match(f, assetName); assets.add(f); }
  }
  assert.deepEqual(new Set(Object.keys(index.files)), new Set([...pages, ...assets]));
  for (const e of Object.values(index.manifest)) {
    for (const asset of [e.file, ...e.css ?? [], ...e.assets ?? []]) assert.ok(assets.has(asset), `Unpinned manifest asset: ${asset}`);
  }

  // Validate every input and dependency before the first mutation. Immutable
  // filenames shared with a new entry may only contain identical bytes.
  const writes = new Map(), html = new Map();
  for (const file of [...pages, ...assets]) {
    const proof = index.files[file];
    assert.match(proof.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(proof.bytes) && proof.bytes > 0);
    const path = distPath(dist, file);
    const existing = existsSync(path) ? readFileSync(path) : null;
    const page = pages.has(file);
    if (page) assert.ok(existing, `Missing newly built route: ${file}`);
    const contents = !page && existing ? existing : await load(file);
    assert.ok(contents.length === proof.bytes && sha256(contents) === proof.sha256,
      `Mismatched pinned bytes or conflicting current asset: ${file}`);
    if (page) {
      const prior = contents.toString("utf8");
      assert.equal(htmlWithoutChunkHashes(existing.toString("utf8")), htmlWithoutChunkHashes(prior),
        `Fresh route has changes beyond immutable chunk hashes: ${file}`);
      html.set(file, prior);
    }
    if (!existing || !existing.equals(contents)) writes.set(path, contents);
  }
  for (const work of index.works) {
    const reached = new Set();
    for (const file of work.pages) {
      const expected = carriedRuntimeAssets(html.get(file), index.manifest);
      assert.deepEqual(carriedRuntimeAssets(html.get(file), merged), expected, `Incomplete merged carried graph: ${file}`);
      for (const asset of expected) reached.add(asset);
    }
    assert.deepEqual(reached, new Set(work.assets), `Incomplete pinned runtime graph: ${work.slug}`);
  }
  // Duplicate manifest records for an identical filename must not change how
  // any freshly built entry resolves its imports in the combined manifest.
  for (const chunk of Object.values(current)) {
    const reference = `<script src="${base}${chunk.file}"></script>`;
    assert.deepEqual(carriedRuntimeAssets(reference, merged), carriedRuntimeAssets(reference, current),
      `A current Vite dependency graph would change: ${chunk.file}`);
  }
  for (const [path, contents] of writes) writeFileSync(path, contents);
  writeFileSync(distPath(dist, ".vite/manifest.json"), JSON.stringify(merged, null, 2) + "\n");
  console.log(`Restored ${pages.size} carried routes with ${assets.size} pinned runtime assets`);
}

export async function composeCarriedRelease(works, dist = resolve(root, "dist")) {
  if (!works.length) return;
  // Both the carried IDs and their individual deployed revisions must match.
  // A solo release can use an index whose routes were originally shipped in
  // several different deployments.
  const index = bundleSources.flatMap(([milestone, deployment]) => {
    const path = resolve(root, "evidence", milestone, deployment, "carried-bundles.json");
    if (!existsSync(path)) return [];
    const pin = JSON.parse(readFileSync(path));
    assert.equal(pin.version, "carried-bundles-v1");
    assert.equal(pin.deployment, deployment);
    return [pin];
  }).find(pin => pin.works.length === works.length && works.every(work => pin.works.some(entry =>
    entry.work === work.id && entry.slug === work.slug && entry.candidate === work.candidateCommit &&
    entry.deployedCommit === work.deployedCommit)));
  if (!index) return;
  const live = JSON.parse(await fromPages("release.json"));
  assert.match(live.commit, /^[a-f0-9]{40}$/);
  for (const work of works) {
    const selected = live.works.find(x => x.work === work.id);
    const attested = selected ? { ...selected, deployedCommit: live.commit } : live.carriedWorks.find(x => x.work === work.id);
    const receipt = { work: work.id, slug: work.slug, candidate: work.candidateCommit, deployedCommit: work.deployedCommit };
    assert.deepEqual(attested, receipt, `Wrong live carried identity: ${work.id}`);
  }
  execFileSync("git", ["merge-base", "--is-ancestor", index.deployment, live.commit], { cwd: root });
  verifyCarrySources(index.deployment, works);
  await assemblePinnedBundles(dist, index);
}
