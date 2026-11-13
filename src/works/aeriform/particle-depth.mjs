import { createHash } from "node:crypto";

// This file receives the original Vite input. The shared CSP plugin subsequently
// disables the unrelated TypeGPU eval probe in the same module.
const hash = "59d2b96b1b37fb708335edc73047eb94ac1f33a1ba5e5b83888f48c98cf46854";

const number = (value) => [5, String(value)];
const property = (object, key) => [7, object, key];
const binary = (a, operator, b) => [1, a, operator, b];
const scaled = (object, key, amount) => binary(property(object, key), "*", number(amount));
const sum = (...terms) => terms.reduce((a, b) => binary(a, "+", b));
const clamp = (term, low, high) => [6, "std.clamp", [term, number(low), number(high)]];

function replaceExactly(source, before, after) {
  const start = source.indexOf(before);
  if (start < 0 || start !== source.lastIndexOf(before)) {
    throw new Error("AERIFORM particle kernel no longer matches Shaders 4.0.7");
  }
  return source.slice(0, start) + after + source.slice(start + before.length);
}

export function addParticleDepthLighting(source) {
  if (createHash("sha256").update(source).digest("hex") !== hash) {
    throw new Error("AERIFORM particle kernel hash changed. Review the pinned Shaders source before building.");
  }

  const kernel = source.match(/function splatVolume\(layout, cfg\) \{[\s\S]+?\n\}(?=\nfunction splatRelief)/)?.[0];
  const astSource = kernel?.match(/ast: (\{[\s\S]+?\}),\n\t\texternals:/)?.[1];
  if (!astSource) throw new Error("AERIFORM volume splat TypeGPU metadata was not found");
  const ast = JSON.parse(astSource);
  const locals = ast.body[1];
  const energy = locals.find((node) => node[0] === 13 && node[1] === "bright");
  const tone = locals.find((node) => node[0] === 13 && node[1] === "speedNorm");
  if (!energy || !tone) throw new Error("AERIFORM volume splat no longer exposes its energy and tone locals");

  // The same particle position controls perspective, intensity and lighting.
  // Far points have less weight where they overlap brighter points near camera.
  const depthEnergy = clamp(sum(number(0.57), scaled("pos", "z", 1.76), scaled("pos", "y", 0.54)), 0.09, 1.28);
  const motionEnergy = binary(property("vel", "w"), "*", property("prm", "speedColorK"));
  energy[2] = binary(energy[2], "*", depthEnergy);
  tone[2] = clamp(sum(number(0.34), scaled("pos", "z", 1.43), scaled("pos", "y", 0.66),
    scaled("pos", "x", -0.18), binary(motionEnergy, "*", number(0.42))), 0, 1);

  // The bundled kernel includes both the CPU function and the precompiled GPU
  // syntax tree. Preserve matching math in both paths and leave JIT disabled.
  let patched = replaceExactly(kernel, astSource, JSON.stringify(ast));
  patched = replaceExactly(patched,
    "const bright = __tsover_mul(__tsover_mul(__tsover_add(.7, __tsover_mul(.6, pos.w)), persp), persp);",
    "const bright = (.7 + .6 * pos.w) * persp * persp * clamp$1(.57 + pos.z * 1.76 + pos.y * .54, .09, 1.28);");
  patched = replaceExactly(patched,
    "const speedNorm = clamp$1(__tsover_mul(vel.w, prm.speedColorK), 0, 1);",
    "const speedNorm = clamp$1(.34 + pos.z * 1.43 + pos.y * .66 - pos.x * .18 + vel.w * prm.speedColorK * .42, 0, 1);");
  return replaceExactly(source, kernel, patched);
}
