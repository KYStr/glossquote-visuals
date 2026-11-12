import { build } from "vite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkDist } from "./check-dist.mjs";
import { releaseProof } from "./release-proof.mjs";
import { root } from "./site-map.mjs";

const [mode = "candidate", ...extra] = process.argv.slice(2);
if (!["candidate", "release"].includes(mode) || extra.length) {
  throw new Error("Usage: npm run build -- [candidate|release]");
}
const release = mode === "release" && process.env.GQ_RELEASE_WORK ? await releaseProof() : null;
await build({ mode });
checkDist(mode);
if (release) writeFileSync(resolve(root, "dist", "release.json"), JSON.stringify(release, null, 2) + "\n");
