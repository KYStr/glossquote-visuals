import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const base = "/glossquote-visuals/";
export const origin = "https://kystr.github.io";
export const repository = "https://github.com/KYStr/glossquote-visuals";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const languages = { "zh-Hant": "", en: "en/" };
const readJson = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
export const registry = readJson("coordination/work-registry.json");
export const catalog = readJson("src/works/catalog.json");

const publishedStates = new Set(["published", "external-reviewed"]);
const candidateStates = new Set(["building", "candidate", "reviewed", "blocked"]);
export function isPublished(work) {
  return publishedStates.has(work.status) && Boolean(work.liveUrl && work.deployedCommit);
}

export function isReleaseWork(work, mode) {
  return mode === "release" && work.status === "reviewed" && work.id === process.env.GQ_RELEASE_WORK;
}

export function worksFor(mode) {
  return registry.works.filter((work) => catalog[work.slug] &&
    (isPublished(work) || isReleaseWork(work, mode) || (mode !== "release" && candidateStates.has(work.status))));
}

export function routesFor(mode) {
  const slugs = ["", ...worksFor(mode).map(({ slug }) => slug)];
  return slugs.flatMap((slug) => Object.entries(languages).map(([lang, directory]) => ({
    lang, slug,
    route: `${directory}${slug ? `works/${slug}/` : ""}`,
  })));
}
