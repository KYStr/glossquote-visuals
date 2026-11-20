  // p is measured in image heights. Keep this projection for the offline poster.
  let position = patchOrigin + uv * patchSize;
  let p = (position - vec2f(0.50, 0.43)) * vec2f(1.50, 1.0);
  let turn = mat2x2f(0.986, 0.167, -0.167, 0.986);
  let q = turn * p;
  let dimensions = vec2f(0.650, 0.335);
  let arc = q - vec2f(0.0, -0.302);
  var opacity = 1.0;
  if (livePatch) {
    // Feather the stationary overlap and reject distant pixels before evaluating
    // crystallization and lighting. The original still fills the cleared pixels.
    let fromOpening = dot(arc, vec2f(0.724836, -0.688921));
    let radialMargin = abs(length(arc) - 0.478);
    let margin = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    opacity = smoothstep(-0.028, 0.010, fromOpening)
      * (1.0 - smoothstep(0.185, 0.240, radialMargin)) * smoothstep(0.0, 0.056, margin);
    if (opacity <= 0.0) { return vec4f(0.0); }
  }
  let radius = length(q / vec2f(0.621, 0.308))
    + 0.017 * sin(q.x * 63.0 + q.y * 81.0) + 0.010 * sin(q.y * 147.0 - q.x * 31.0);
  let ice = 1.0 - smoothstep(0.981, 1.006, radius);
  if (livePatch && ice <= 0.0) { return vec4f(0.0); }

  // Static object-space grain shared by the paper and cut ice.
  let gritCell = floor(q * 530.0);
  let h = fract(vec3f(gritCell.xyx) * vec3f(0.1031, 0.1030, 0.0973));
  let j = h + dot(h, h.yzx + 33.33);
  let grit = fract((j.x + j.y) * j.z);
  var top = vec3f(0.0);
  if (ice < 1.0) {
    let cupRadius = length(q / dimensions);
    let footRadius = length((q - vec2f(0.0, 0.175)) / (dimensions * vec2f(0.88, 0.83)));
    let cupDepth = clamp((q.y - 0.055) * 3.3, 0.0, 1.0);
    let wallRadius = length((q - vec2f(0.0, 0.175 * cupDepth)) / (dimensions * (1.0 - 0.13 * cupDepth)));
    let silhouette = min(min(cupRadius, footRadius), wallRadius);
    let backdrop = vec3f(1.0, 0.73, 0.365);
    let corner = clamp(0.65 + 0.29 * p.x + 0.41 * p.y, 0.0, 1.0);
    let paper = mix(backdrop, vec3f(0.79, 0.39, 0.20), corner * 0.26);
    let castShadow = 1.0 - smoothstep(0.85, 1.21, length((q - vec2f(0.045, 0.153)) / dimensions));
    let background = mix(paper, vec3f(0.21, 0.081, 0.023), castShadow * 0.56);
    if (silhouette > 1.008) {
      return vec4f(background * (0.984 + 0.029 * grit), 1.0);
    }
    let ripple = q.x * 97.0 + 1.5 * sin(q.y * 33.0) + 0.8 * sin(q.y * 115.0);
    let streak = 0.5 + 0.5 * sin(ripple);
    let strata = length(q / vec2f(0.653, 0.331));
    let band = smoothstep(1.17, 1.19, strata);
    let layerShade = 0.93 - 0.35 * smoothstep(-0.35, 0.64, q.x);
    let cupPaper = mix(vec3f(0.97, 0.89, 0.69), vec3f(0.38, 0.039, 0.083), band);
    let sideOcclusion = 0.60 + 0.40 * smoothstep(0.992, 1.08, cupRadius);
    let side = cupPaper * sideOcclusion * layerShade * (0.97 + 0.044 * grit + 0.03 * streak);
    let lower = mix(background, side, 1.0 - smoothstep(0.995, 1.006, silhouette));
    let rim = mix(vec3f(0.73, 0.60, 0.40), vec3f(1.0, 0.95, 0.80), exp(-abs(cupRadius - 0.973) * 105.0));
    top = mix(lower, rim * (1.0 - 0.16 * smoothstep(-0.3, 0.65, q.x)), 1.0 - smoothstep(0.99, 1.003, cupRadius));
    if (ice <= 0.0) { return vec4f(top, 1.0); }
  }

  let palettes = array<vec3f, 3>(
    vec3f(0.91, 0.30, 0.017), vec3f(0.53, 0.031, 0.075), vec3f(0.51, 0.59, 0.220)
  );
  let kind = u32(clamp(flavor, 0.0, 2.0));
  let base = palettes[kind];
  let coarseness = array<f32, 3>(57.0, 43.0, 85.0)[kind];
  let cell = floor(q * coarseness);
  let j2 = fract(cell * vec2f(0.1031, 0.11369));
  let marble = fract((j2.x + j2.y) * (13.13 + j2.x) * (19.19 + j2.y));

  // The spoon bowl sweeps a finite arc. Nearest position gives the same metric
  // for the bowl, its rounded caps, the pushed bank and the contact shadow.
  let start = -1.16;
  // The cut is already visible at phase zero. Advance it smoothly without
  // lingering at the opening while Shaders initializes on a slower adapter.
  let leg = 1.0 - abs(2.0 * fract(time) - 1.0);
  let easing = leg * leg * (3.0 - 2.0 * leg);
  let reach = easing * (1.4 - 0.4 * easing);
  let finish = mix(0.76, 1.09, reach);
  let a = clamp(atan2(arc.x, arc.y), start, finish);
  let radial = vec2f(sin(a), cos(a));
  let delta = arc - 0.478 * radial;
  let distance = length(delta);
  let outward = dot(delta, radial);
  var normal2 = radial;
  if (distance > 0.0001) { normal2 = delta / distance; }
  let pressure = smoothstep(start - 0.15, 0.79, a);
  let roughness = sin(a * 115.0 + sin(a * 63.0)) + 0.3 * sin(a * 248.0);
  let width = 0.061 + 0.061 * pressure + 0.006 * roughness * pressure;
  let groove = 1.0 - smoothstep(0.013, width, distance);
  let d = distance - width;
  let pushed = smoothstep(-0.014, 0.056, outward);
  let bark = 0.64 + 0.21 * sin(a * 81.0 + 0.6 * cos(a * 149.0)) + 0.15 * sin(a * 237.0);
  let bankWidth = 0.014 + 0.019 * pressure;
  let curl = (d - 0.003 - 0.005 * roughness * pressure) / bankWidth;
  let crest = exp(-curl * curl) * pushed * bark * pressure;
  let inside = clamp((distance - 0.013) / (width - 0.013), 0.0, 1.0);
  let slope = (0.020 + 0.051 * pressure) * 6.0 * inside * (1.0 - inside) / (width - 0.013)
    - 0.085 * crest * 2.0 * curl / bankWidth;
  let torn = sin(a * 310.0 + 8.0 * sin(distance * 113.0)) * pushed * pressure * exp(-abs(d) * 38.0);
  let mounds = vec2f(
    sin(q.x * 31.0 + 2.5 * cos(q.y * 18.0)) + 0.4 * sin(q.x * 108.0 + q.y * 39.0),
    cos(q.y * 38.0 + 2.1 * sin(q.x * 26.0)) + 0.4 * cos(q.y * 89.0 - q.x * 67.0)
  );
  let edge = smoothstep(0.90, 1.0, radius);
  let lipNormal = q / (dimensions * dimensions);
  let normal = normalize(vec3f(normal2 * (-slope + 0.24 * torn) + 0.15 * edge * lipNormal + mounds * (0.27 - 0.24 * groove), 1.0));
  let light = normalize(vec3f(-0.58, -0.75, 0.85));
  let halfVector = normalize(light + vec3f(0.0, 0.0, 1.0));
  let diffuse = max(0.0, dot(light, normal));
  let crystal = pow(max(0.0, dot(halfVector, normal)), 28.0);
  let contact = (1.0 - smoothstep(0.004, 0.047, abs(d + 0.033))) * pushed;
  let frostPatches = smoothstep(0.36, 0.84, 0.5 + 0.29 * sin(q.x * 28.0 - q.y * 57.0) + 0.21 * sin(q.x * 87.0 + q.y * 34.0));
  let frost = smoothstep(0.54, 0.995, grit) * (0.13 + 0.72 * frostPatches + 0.24 * marble);
  let scores = sin(distance * 541.0 + 1.1 * sin(a * 83.0)) * groove;
  let exposed = smoothstep(0.20, 0.70, groove);
  let body = mix(base * 1.18 + vec3f(0.032), base * vec3f(1.12, 0.78, 0.64), exposed);
  var sorbet = body * (0.40 + 0.80 * diffuse - contact * 0.34)
    * (0.82 + 0.19 * grit + 0.13 * marble + scores * 0.079);
  sorbet += vec3f(1.0, 0.91, 0.80) * (frost * (0.37 - 0.29 * exposed) + crystal * 0.091 + crest * (0.15 + 0.12 * grit) + max(torn, 0.0) * 0.075);

  // Different inclusions per fruit, anchored in the surface. Local normals add
  // to the carved normal, so exposed particles inherit the spoon's slope.
  let sizes = array<f32, 3>(26.0, 43.0, 73.0);
  let axes = array<vec2f, 3>(vec2f(0.43, 0.12), vec2f(0.29, 0.15), vec2f(0.23, 0.27));
  let hues = array<vec3f, 3>(vec3f(0.93, 0.35, 0.031), vec3f(0.085, 0.015, 0.017), vec3f(0.83, 0.88, 0.51));
  let g = q * sizes[kind];
  let tile = floor(g);
  let seed = fract(tile * vec2f(0.1031, 0.11369));
  let ran = fract((seed.x + seed.y) * (13.13 + seed.x) * (19.19 + seed.y));
  let randomOffset = vec2f(fract(ran * 13.83), fract(ran * 43.47));
  let shift = (fract(g) - 0.5 - (randomOffset - 0.5) * 0.33);
  let twist = select(5.6 * ran, a + 0.63 * ran, kind == 0u);
  let skew = mat2x2f(cos(twist), sin(twist), -sin(twist), cos(twist));
  let chip = skew * shift / (axes[kind] * (0.69 + ran * 0.40));
  let chipR = length(chip);
  let show = smoothstep(0.38 - 0.31 * exposed, 0.54 - 0.33 * exposed, ran);
  if (chipR < 1.048 && show > 0.0) {
    let facets = chipR + 0.048 * cos(6.0 * atan2(chip.x, chip.y));
    let inclusion = (1.0 - smoothstep(0.78, 1.00, facets)) * show;
    let tangent = transpose(skew) * chip;
    let grainNormal = normalize(normal + vec3f(0.33 * tangent, 0.0));
    let glint = pow(max(0.0, dot(grainNormal, halfVector)), 26.0);
    let transmission = max(0.0, dot(grainNormal, light));
    let bi = hues[kind] * (0.53 + 0.61 * transmission)
      + vec3f(1.0, 0.80, 0.56) * (glint * 0.24 + exposed * 0.065);
    sorbet = mix(sorbet, bi, inclusion * (0.45 + 0.55 * exposed));
  }
  let rimShade = 1.0 - 0.44 * smoothstep(0.955, 1.017, radius) * smoothstep(-0.02, 0.15, q.y);
  return vec4f(mix(top, sorbet * rimShade, ice), opacity);
