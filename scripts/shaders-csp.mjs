import { createHash } from "node:crypto";

const hash = "59d2b96b1b37fb708335edc73047eb94ac1f33a1ba5e5b83888f48c98cf46854";
const coreHash = "f545d01f22a1ba20b5ecb72d82f2498515772f749bfeef97f4b79db9baee817c";
const standaloneHash = "30e17d9afacba6e865fa495da4c897a408eff1fca7701454527eea1de3bf3f87";

function replaceOnce(source, before, after) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
    throw new Error("The pinned Shaders lifecycle changed. Recheck the upstream source before building.");
  }
  return source.replace(before, after);
}

export function preservePausedFrame(source, kind) {
  const expected = kind === "core" ? coreHash : standaloneHash;
  if (createHash("sha256").update(source).digest("hex") !== expected) {
    throw new Error("The pinned Shaders lifecycle hash changed. Recheck the upstream source before building.");
  }
  if (kind === "core") {
    // The normal frame-lock API resets the animation clock for deterministic
    // offline rendering. Interactive pause must retain that clock instead.
    return replaceOnce(source,
      "\t\tsetFrameLocked: (locked) => {\n\t\t\tconst wasLocked = frameLocked;",
      "\t\tsetFrameLocked: (locked, preserveTimeline = false) => {\n\t\t\tconst wasLocked = frameLocked;\n\t\t\tif (preserveTimeline && !locked) lastRenderTime = 0;")
      .replace("\t\t\tglobalElapsedTime = 0;\n\t\t\tfor (const node of nodes.values()) {",
        "\t\t\tif (preserveTimeline) return;\n\t\t\tglobalElapsedTime = 0;\n\t\t\tfor (const node of nodes.values()) {");
  }
  return replaceOnce(source,
    "\tfunction pause() {\n\t\tif (current) current.renderer.stopAnimation();\n\t}\n\tfunction resume() {\n\t\tif (current) current.renderer.startAnimation();\n\t}",
    "\tfunction pause() {\n\t\tif (current) current.renderer.setFrameLocked(true, true);\n\t}\n\tfunction resume() {\n\t\tif (current) {\n\t\t\tcurrent.renderer.setFrameLocked(false, true);\n\t\t\tcurrent.renderer.startAnimation();\n\t\t}\n\t}");
}
const probe = [
  "const EVAL_ALLOWED_IN_ENV = (() => {",
  "\ttry {",
  '\t\tnew Function("return true");',
  "\t\treturn true;",
  "\t} catch {",
  "\t\treturn false;",
  "\t}",
  "})();",
].join("\n");

export function shaderContentPolicy() {
  return {
    name: "shaders-4.0.7-no-jit",
    apply: "build",
    enforce: "pre",
    transform(source, id) {
      const path = id.replaceAll("\\", "/");
      if (path.endsWith("/node_modules/shaders/dist/core/index.js")) {
        return { code: preservePausedFrame(source, "core"), map: null };
      }
      if (path.endsWith("/node_modules/shaders/dist/js/createShader.js")) {
        return { code: preservePausedFrame(source, "standalone"), map: null };
      }
      if (!path.endsWith("/node_modules/shaders/dist/core/std-DL2iZlL6.js")) return;
      const offset = source.indexOf(probe);
      if (createHash("sha256").update(source).digest("hex") !== hash || offset === -1 || offset !== source.lastIndexOf(probe)) {
        this.error("The pinned Shaders JIT capability probe changed. Recheck the upstream bundle before building.");
      }
      // Select the same non-JIT TypeGPU writer that an eval-blocking CSP selects,
      // without calling the feature probe that would trigger a violation.
      return { code: source.replace(probe, "const EVAL_ALLOWED_IN_ENV = false;"), map: null };
    },
  };
}
