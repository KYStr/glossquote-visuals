import assert from "node:assert/strict";
import { test } from "node:test";
import { bundledChunkPaths, rewriteUrls } from "../scripts/build-visuals-domain.mjs";

test("move Chinese pages, keep English and place shared assets at the origin root", () => {
  const input = '<a href="/glossquote-visuals/#main"><a href="/glossquote-visuals/works/selvedge/?a=b#top">' +
    '<a href="https://kystr.github.io/glossquote-visuals/en/"><img src="/glossquote-visuals/media/cover.webp">';
  assert.equal(rewriteUrls(input, ".html"),
    '<a href="/zh-hant/#main"><a href="/zh-hant/works/selvedge/?a=b#top">' +
    '<a href="https://visuals.glossquote.com/en/"><img src="/media/cover.webp">');
});

test("preserve source and external links that contain the project path", () => {
  const links = '<a href="https://github.com/KYStr/glossquote-visuals/tree/abc">' +
    '<a href="https://example.org/glossquote-visuals/works/selvedge/">' +
    '<a href="https://example.org/?next=/glossquote-visuals/works/selvedge/">';
  assert.equal(rewriteUrls(links, ".html"), links);
});

test("preserve generated resource lookup for shaders, lazy modules and fonts", () => {
  assert.equal(rewriteUrls('return`/glossquote-visuals/`+e', ".js"), 'return`/`+e');
  assert.equal(rewriteUrls('url(/glossquote-visuals/fonts/test.woff2)', ".css"), 'url(/fonts/test.woff2)');
  assert.equal(rewriteUrls("Allow: /glossquote-visuals/\n", ".txt"), "Allow: /\n");
});

test("find the Foldline lazy GPU module in a template literal alongside Vite preload arrays", () => {
  const source = 'import(`./gpu-iSAOVOSr.js`);const files=["assets/page-Dgss8QRL.css"]';
  assert.deepEqual(bundledChunkPaths(source), ["./gpu-iSAOVOSr.js", "assets/page-Dgss8QRL.css"]);
});
