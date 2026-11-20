  // Both stencils use the same paper coordinates. Registration is the only
  // transform, so slugs, screen dots and knockout marks travel with the ink.
  let phase = fract(time);
  // A quick press stroke (1.2 s), a registered hold, then a slow release.
  let remaining = 1.0 - clamp(phase / 0.15, 0.0, 1.0);
  let returnStroke = smoothstep(0.43, 1.0, phase);
  let settle = 0.026 * sin(phase * 37.699) * smoothstep(0.12, 0.18, phase)
    * (1.0 - smoothstep(0.37, 0.43, phase));
  let offset = remaining * remaining + returnStroke + settle;
  let b = uv - vec2f(0.493 - 0.173 * offset, 0.503 + 0.064 * offset);
  let o = uv - vec2f(0.510 + 0.173 * offset, 0.500 - 0.027 * offset);
  let edge = max(fwidth(uv.x) * 1.15, 0.0008);

  // Cobalt: a slanted cabinet, turned-out cone and two smaller drivers.
  let face = b.x - b.y * 0.14;
  let cabinet = max(max(-face - 0.238, face - 0.238), abs(b.y) - 0.413);
  let driver = length((b - vec2f(-0.057, 0.035)) * vec2f(1.94, 1.0));
  let cone = max(driver - 0.264, 0.222 - driver);
  let coneRing = max(driver - 0.2, 0.181 - driver);
  let core = driver - 0.109;
  let vent = abs(b.y + 0.318 + 0.27 * b.x) - 0.012;
  let vents = max(min(vent, abs(b.y + 0.365 + 0.27 * b.x) - 0.012), abs(face + 0.086) - 0.126);
  let studs = min(length((b - vec2f(0.165, -0.3)) * vec2f(1.94, 1.0)),
                  length((b - vec2f(-0.156, 0.33)) * vec2f(1.94, 1.0))) - 0.031;
  let blueDist = min(max(cabinet, -min(driver - 0.284, min(vents, studs))), min(min(cone, coneRing), core));

  // Orange: a folded horn, bounded by a slanted lip and a scalloped throat.
  let ox = o.x + 0.1 * o.y;
  let bell = 0.16 + 0.66 * (ox + 0.22) + 0.29 * (ox + 0.22) * (ox + 0.22);
  let fold = abs(o.y + 0.038 - 0.15 * ox);
  let horn = max(max(-0.238 - ox, ox - 0.205), fold - bell);
  let mouth = length((o - vec2f(0.200, -0.008)) * vec2f(4.25, 1.0));
  let flare = max(mouth - 0.44, 0.35 - mouth);
  let lip = max(mouth - 0.312, 0.295 - mouth);
  let channel = max(max(fold - bell * 0.13, -0.148 - ox), ox - 0.075);
  let throat = length((o - vec2f(-0.232, -0.072)) * vec2f(2.04, 1.0));
  let orangeDist = min(min(max(horn, -min(mouth - 0.35, channel)), flare),
                        min(lip, max(throat - 0.138, 0.059 - throat)));

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

  // Match the baked sRGB proof at both solid and partial ink coverage.
  // Custom WGSL returns linear RGB; Shaders encodes it for presentation.
  let paper = vec3f(246.0, 239.0, 221.0) / 255.0;
  let cobalt = vec3f(20.0, 58.0, 214.0) / 255.0;
  let vermilion = vec3f(255.0, 81.0, 29.0) / 255.0;
  let overprint = vec3f(49.0, 27.0, 69.0) / 255.0;
  let inks = mix(mix(paper, cobalt, blue), mix(vermilion, overprint, blue), orange);
  let linear = pow((inks + vec3f(0.055)) / 1.055, vec3f(2.4));
  return vec4f(linear, 1.0);
