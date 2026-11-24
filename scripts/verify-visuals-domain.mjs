import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Verify the public bytes against the same directory passed to the deploy command.
const folder = resolve(process.argv[2] ?? ".runs/visuals-domain/site");
const origin = "https://visuals.glossquote.com";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

async function files(directory, prefix = "") {
  const paths = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith(".") || ["_redirects", "_headers", "404.html"].includes(item.name)) continue;
    const name = prefix + item.name;
    if (item.isDirectory()) paths.push(...await files(join(directory, item.name), name + "/"));
    else if (item.isFile()) paths.push(name);
  }
  return paths;
}

async function get(path) {
  const response = await fetch(origin + path, { redirect: "manual", signal: AbortSignal.timeout(30000) });
  return { response, body: Buffer.from(await response.arrayBuffer()) };
}

const landing = await get("/");
assert.equal(landing.response.status, 302);
assert.equal(new URL(landing.response.headers.get("location"), origin).href, origin + "/zh-hant/");
const missing = await get("/__glossquote_missing_page__/");
assert.equal(missing.response.status, 404);
const oldWork = await get("/works/foldline/");
assert.equal(oldWork.response.status, 301);
assert.equal(new URL(oldWork.response.headers.get("location"), origin).href, origin + "/zh-hant/works/foldline/");
const names = await files(folder);
const html = names.filter(name => name.endsWith("/index.html"));
const receipt = JSON.parse(await readFile(join(folder, "release.json"), "utf8"));
assert.equal(html.length, (receipt.works.length + receipt.carriedWorks.length + 1) * 2);
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < names.length) {
    const name = names[next++];
    const path = "/" + name.replace(/\/index\.html$/, "/");
    const { response, body } = await get(path);
    assert.equal(response.status, 200, path);
    assert.equal(digest(body), digest(await readFile(join(folder, name))), path);
  }
}));
console.log(JSON.stringify({ origin, release: receipt.commit, pages: html.length, files: names.length,
  rootRedirect: "/zh-hant/", missingPageStatus: 404 }, null, 2));
