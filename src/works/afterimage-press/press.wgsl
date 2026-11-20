  // Both stencils use the same paper coordinates. Registration is the only
  // transform, so slugs, screen dots and knockout marks travel with the ink.
  let phase = fract(time);
  let offset = 1.0 - smoothstep(0.0, 0.375, phase)
    + smoothstep(0.545, 1.0, phase);
  let b = uv - vec2f(0.44 - 0.166 * offset, 0.54 + 0.025 * offset);
  let o = uv - vec2f(0.54 + 0.166 * offset, 0.47 - 0.024 * offset);
  let edge = max(fwidth(uv.x) * 1.15, 0.0008);

  // Cobalt: a slanted cabinet, turned-out cone and two smaller drivers.
  let face = b.x - b.y * 0.17;
  let cabinet = max(max(-face - 0.29, face - 0.235), abs(b.y) - 0.46);
  let driver = length((b - vec2f(-0.057, 0.055)) * vec2f(1.94, 1.0));
  let cone = max(driver - 0.313, 0.268 - driver);
  let coneRing = max(driver - 0.239, 0.217 - driver);
  let core = driver - 0.117;
  let vent = abs(b.y + 0.336 + 0.27 * b.x) - 0.012;
  let vents = max(min(vent, abs(b.y + 0.389 + 0.27 * b.x) - 0.012), abs(face + 0.086) - 0.126);
  let studs = min(length((b - vec2f(0.16, -0.28)) * vec2f(1.94, 1.0)),
                  length((b - vec2f(-0.20, 0.34)) * vec2f(1.94, 1.0))) - 0.031;
  let blueDist = min(max(cabinet, -min(driver - 0.338, min(vents, studs))), min(min(cone, coneRing), core));

  // Orange: a folded horn, bounded by a slanted lip and a scalloped throat.
  let ox = o.x + 0.19 * o.y;
  let fan = 0.145 + 0.88 * (ox + 0.12) + 0.52 * (ox + 0.12) * (ox + 0.12);
  let horn = max(max(-0.255 - ox, ox - 0.266), abs(o.y + 0.056 - 0.20 * ox) - fan);
  let mouth = length((o - vec2f(0.256, -0.006)) * vec2f(4.55, 1.0));
  let flare = max(mouth - 0.498, 0.428 - mouth);
  let lip = max(mouth - 0.392, 0.385 - mouth);
  let rib = max(abs(o.y + 0.056 - 0.20 * ox) - fan * 0.60, -0.13 - ox);
  let spine = abs(o.y + 0.056 - 0.20 * ox) - 0.014;
  let tail = length((o - vec2f(-0.258, -0.098)) * vec2f(1.94, 1.0));
  let orangeDist = min(min(max(horn, -min(mouth - 0.431, max(rib, -spine))), flare),
                        min(lip, max(tail - 0.087, 0.045 - tail)));

  // Use a coarse screen and derivative-sized transitions. Suppress modulation
  // when a dot cell approaches the backing texture's pixel size.
  let screen = b * vec2f(107.0, 55.0);
  let screen2 = o * vec2f(107.0, 55.0);
  let spot = length(fract(screen + vec2f(screen.y * 0.5, 0.0)) - 0.5);
  let spot2 = length(fract(screen2 + vec2f(-screen2.y * 0.5, 0.0)) - 0.5);
  let cell = max(fwidth(screen.x), fwidth(screen.y));
  let aa = cell * 0.6 + 0.025;
  let strength = (1.0 - smoothstep(0.24, 0.49, cell)) * 0.48;
  let screenBlue = 1.0 - smoothstep(0.17 - aa, 0.17 + aa, spot);
  let screenOrange = 1.0 - smoothstep(0.17 - aa, 0.17 + aa, spot2);
  var blue = (1.0 - smoothstep(-edge, edge, blueDist))
    * (1.0 - strength * screenBlue * smoothstep(0.11, 0.33, b.y));
  var orange = (1.0 - smoothstep(-edge, edge, orangeDist))
    * (1.0 - strength * screenOrange * smoothstep(0.08, 0.33, o.y));
  if (plate >= 0.5 && plate < 1.5) { orange = 0.0; }
  if (plate >= 1.5) { blue = 0.0; }

  // Four-area ink coverage in the working sRGB space. The shared region
  // absorbs both ink colors, including partial coverage at each dot edge.
  let paper = vec3f(0.965, 0.937, 0.866);
  let cobalt = vec3f(0.078, 0.226, 0.838);
  let vermilion = vec3f(1.0, 0.319, 0.115);
  let overprint = vec3f(0.193, 0.105, 0.269);
  let inks = mix(mix(paper, cobalt, blue), mix(vermilion, overprint, blue), orange);
  return vec4f(inks, 1.0);
