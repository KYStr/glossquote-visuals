// Package the accepted Pages artifact for its second public origin.
import assert from "node:assert/strict";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const origin = "https://visuals.glossquote.com";
const oldBase = /(^|[\s"'\x60(>])((?:https?:)?\/\/kystr\.github\.io)?\/glossquote-visuals\//gi;
const textTypes = new Set([".html", ".css", ".js", ".mjs", ".svg", ".xml", ".txt"]);
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function rewriteUrls(input, extension) {
  return input.replace(oldBase, (match, boundary, absolute, offset) => {
    const remainder = input.slice(offset + match.length);
    let path = "/";
    if (remainder.startsWith("works/") || /^index\.html(?=[?#\s"'<>]|$)/i.test(remainder)) {
      path = "/zh-hant/";
    } else if ([".html", ".xml"].includes(extension) && /^(?:[?#\s"'<>]|$)/.test(remainder)) {
      path = "/zh-hant/";
    }
    // The bare base in Vite's preload helper is concatenated with an asset
    // filename. It must remain the asset root, not the Chinese gallery route.
    return boundary + (absolute ? origin : "") + path;
  });
}

function copyArtifact(source, destination, directory = "") {
  for (const entry of readdirSync(join(source, directory), { withFileTypes: true })) {
    const name = directory ? directory + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      copyArtifact(source, destination, name);
      continue;
    }
    assert.ok(entry.isFile(), `Unexpected non-file in Pages artifact: ${name}`);
    const target = name === "index.html" || name.startsWith("works/") ? "zh-hant/" + name : name;
    const from = join(source, name);
    const to = join(destination, target);
    assert.ok(!existsSync(to), `Duplicate output file: ${target}`);
    mkdirSync(dirname(to), { recursive: true });
    const extension = extname(name).toLowerCase();
    if (textTypes.has(extension)) {
      const bytes = readFileSync(from);
      const input = utf8.decode(bytes);
      const updated = rewriteUrls(input, extension);
      writeFileSync(to, input === updated ? bytes : updated);
    } else {
      copyFileSync(from, to);
    }
  }
}

function writeRedirects(root) {
  const path = join(root, "_redirects");
  const previous = existsSync(path) ? utf8.decode(readFileSync(path)) : "";
  const required = new Map([["/", "/zh-hant/ 302"], ["/works/*", "/zh-hant/works/:splat 301"]]);
  const retained = [];
  for (const line of previous.split(/\r?\n/)) {
    const [from, ...rest] = line.trim().split(/\s+/);
    if (required.has(from)) {
      assert.equal(rest.join(" "), required.get(from), `Conflicting custom-domain redirect: ${line}`);
    } else if (line.trim()) {
      retained.push(line);
    }
  }
  const rules = Array.from(required, ([from, target]) => from + " " + target);
  writeFileSync(path, [...rules, ...retained].join("\n") + "\n");
}

function checkAsset(root, value, parent, verified) {
  const url = new URL(value, origin + parent);
  if (url.origin !== origin) return;
  const name = decodeURIComponent(url.pathname) + (url.pathname.endsWith("/") ? "index.html" : "");
  assert.ok(statSync(join(root, name), { throwIfNoEntry: false })?.isFile(), `Missing ${url.pathname} on ${parent}`);
  verified.add(name);
}

export function bundledChunkPaths(content) {
  // Minified Vite does not use a consistent quoting style. Include template
  // literals for import() as well as string arrays used by its preload helper.
  const chunkRef = /["'\x60(]((?:(?:\/)?assets\/|\.\/)?[\w.-]+-[\w-]{8}\.(?:m?js|css|woff2?|webp|svg))(?=["'\x60)])/g;
  return Array.from(content.matchAll(chunkRef), match => match[1]);
}

function checkRuntimeFiles(root, verified) {
  const shipped = readdirSync(join(root, "assets"));
  const code = shipped.filter(file => /\.m?js$|\.css$/i.test(file));
  for (const name of code) {
    const path = "/assets/" + name;
    const content = readFileSync(join(root, path), "utf8");
    for (const chunk of bundledChunkPaths(content)) {
      checkAsset(root, chunk.startsWith("assets/") ? "/" + chunk : chunk, path, verified);
    }
    for (const [, asset] of content.matchAll(/["'\x60](\/(?:media|fonts|licenses)\/[^"'\x60\s${}]+\.[a-z0-9]+)["'\x60]/gi)) {
      checkAsset(root, asset, path, verified);
    }
  }
  const publicStyles = readdirSync(root, { recursive: true }).filter(file => file.endsWith(".css"));
  for (const file of publicStyles) {
    const path = "/" + file.split(sep).join("/");
    const css = readFileSync(join(root, file), "utf8");
    for (const [, , url] of css.matchAll(/url\(\s*(["']?)([^)'"]+)\1\s*\)/gi)) {
      if (!url.startsWith("data:")) checkAsset(root, url.trim(), path, verified);
    }
  }
  return shipped.length;
}

function verifyOutput(root, receipt) {
  const works = [...receipt.works, ...receipt.carriedWorks].map(({ slug }) => slug);
  assert.ok(works.length && works.every(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)), "Invalid published slugs");
  assert.equal(new Set(works).size, works.length, "Duplicate work in release receipt");
  const routes = new Set();
  const assets = new Set();
  for (const [locale, lang] of [["zh-hant", "zh-Hant"], ["en", "en"]]) {
    for (const work of ["", ...works]) {
      const suffix = work ? "works/" + work + "/" : "";
      const route = "/" + locale + "/" + suffix;
      routes.add(origin + route);
      const html = utf8.decode(readFileSync(join(root, route, "index.html")));
      assert.ok(html.includes(`<html lang="${lang}"`), `Wrong document language: ${route}`);
      assert.ok(html.includes('name="robots" content="index, follow"'), `Expected released page: ${route}`);
      assert.ok(html.includes(`rel="canonical" href="${origin}${route}"`), `Wrong canonical: ${route}`);
      assert.ok(html.includes(`property="og:url" content="${origin}${route}"`), `Wrong sharing URL: ${route}`);
      for (const [code, prefix] of [["zh-Hant", "zh-hant"], ["en", "en"], ["x-default", "zh-hant"]]) {
        assert.ok(html.includes(`hreflang="${code}" href="${origin}/${prefix}/${suffix}"`), `Wrong ${code} alternate: ${route}`);
      }
      const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
      assert.ok(image?.startsWith(origin + "/"), `Missing sharing image: ${route}`);
      const urls = [image, ...Array.from(html.matchAll(/\b(?:href|src)="([^"]+)"/g), match => match[1])];
      for (const [, srcset] of html.matchAll(/\bsrcset="([^"]+)"/g)) {
        for (const entry of srcset.split(",")) urls.push(entry.trim().split(/\s+/)[0]);
      }
      for (const value of urls) checkAsset(root, value, route, assets);
      if (!work) {
        for (const slug of works) assert.ok(html.includes(`href="/${locale}/works/${slug}/"`), `Missing gallery link: ${slug}`);
      }
    }
  }
  const actualPages = readdirSync(root, { recursive: true })
    .map(file => file.split(sep).join("/"))
    .filter(file => file.endsWith(".html"));
  const expectedPages = new Set(["404.html", ...Array.from(routes, url => new URL(url).pathname.slice(1) + "index.html")]);
  assert.deepEqual(new Set(actualPages), expectedPages, "Published routes disagree with the release receipt");
  const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
  assert.deepEqual(new Set(Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), m => m[1])), routes);
  assert.ok(readFileSync(join(root, "robots.txt"), "utf8").includes("Sitemap: " + origin + "/sitemap.xml"));
  const notFound = readFileSync(join(root, "404.html"), "utf8");
  assert.ok(notFound.includes('href="/zh-hant/"') && notFound.includes('href="/en/"'), "Missing bilingual 404 navigation");
  const runtimeFiles = checkRuntimeFiles(root, assets);
  return { works: works.length, pages: routes.size, runtimeFiles, linkedFiles: assets.size, sourceCommit: receipt.commit };
}

export function buildVisualsDomain(input, output) {
  const source = realpathSync(input);
  const requested = resolve(output);
  assert.ok(!existsSync(requested), "Choose a new output directory");
  mkdirSync(dirname(requested), { recursive: true });
  const destination = join(realpathSync(dirname(requested)), basename(requested));
  const outside = relative(source, destination);
  assert.ok(isAbsolute(outside) || outside === ".." || outside.startsWith(".." + sep),
    "Output directory must be outside the input artifact");
  assert.ok(lstatSync(source).isDirectory(), "Expected an extracted Pages artifact");
  const receipt = JSON.parse(readFileSync(join(source, "release.json"), "utf8"));
  assert.match(receipt.commit, /^[a-f0-9]{40}$/);
  const stage = mkdtempSync(join(dirname(destination), basename(destination) + ".staging-"));
  try {
    copyArtifact(source, stage);
    writeRedirects(stage);
    const result = verifyOutput(stage, receipt);
    renameSync(stage, destination);
    return result;
  } finally {
    // mkdtemp created this exact sibling for this invocation.
    if (existsSync(stage)) rmSync(stage, { recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 4, "Usage: node scripts/build-visuals-domain.mjs <extracted-pages> <new-output-directory>");
  console.log(JSON.stringify(buildVisualsDomain(process.argv[2], process.argv[3])));
}
