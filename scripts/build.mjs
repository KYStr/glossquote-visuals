import { build } from "vite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkDist } from "./check-dist.mjs";
import { composeCarriedRelease } from "./carry-release.mjs";
import { releaseProof } from "./release-proof.mjs";
import { releaseWorkIds, root, worksFor } from "./site-map.mjs";

const [mode = "candidate", ...extra] = process.argv.slice(2);
if (!["candidate", "release"].includes(mode) || extra.length) {
  throw new Error("Usage: npm run build -- [candidate|release]");
}
await build({ mode });
const selected = mode === "release" ? releaseWorkIds() : [];
if (selected.length) await composeCarriedRelease(worksFor(mode).filter(work => !selected.includes(work.id)));
checkDist(mode);
const release = selected.length ? await releaseProof() : null;
if (release) writeFileSync(resolve(root, "dist", "release.json"), JSON.stringify(release, null, 2) + "\n");
