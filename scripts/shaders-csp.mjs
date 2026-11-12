import { createHash } from "node:crypto";

const hash = "59d2b96b1b37fb708335edc73047eb94ac1f33a1ba5e5b83888f48c98cf46854";
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
      if (!id.replaceAll("\\", "/").endsWith("/node_modules/shaders/dist/core/std-DL2iZlL6.js")) return;
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
