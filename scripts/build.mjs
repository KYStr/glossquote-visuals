import { build } from "vite";
import { checkDist } from "./check-dist.mjs";

const [mode = "candidate", ...extra] = process.argv.slice(2);
if (!["candidate", "release"].includes(mode) || extra.length) {
  throw new Error("Usage: npm run build -- [candidate|release]");
}
await build({ mode });
checkDist(mode);
