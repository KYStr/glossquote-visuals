  // The datum is shared by rock strata, inundation, and the foam contact line.
  let x = uv.x;
  let y = uv.y;
  let shelf = x + 0.20 * (y - 0.5) + 0.045 * sin(y * 14.0) + 0.027 * cos(y * 28.0 + x * 13.0);
  let shore = -0.64 + 1.53 * smoothstep(0.16, 0.91, shelf);
  let run = y - (0.48 + 0.095 * sin(6.5 * x + 0.1) - 0.025 * sin(18.0 * x));
  let crossSection = run / (0.046 + 0.047 * (1.0 - x));
  let channel = exp(-crossSection * crossSection) *
    (0.47 * (1.0 - smoothstep(0.72, 0.98, x)));
  let poolA = (uv - vec2f(0.62, 0.69)) / vec2f(0.083, 0.093);
  let poolB = (uv - vec2f(0.68, 0.38)) / vec2f(0.088, 0.070);
  let poolC = (uv - vec2f(0.66, 0.235)) / vec2f(0.063, 0.069);
  let cut = 0.42 * exp(-dot(poolA, poolA)) + 0.27 * exp(-dot(poolB, poolB)) + 0.53 * exp(-dot(poolC, poolC));
  let rockA = (uv - vec2f(0.47, 0.28)) / vec2f(0.10, 0.12);
  let rockB = (uv - vec2f(0.71, 0.72)) / vec2f(0.12, 0.12);
  let crags = 0.46 * exp(-dot(rockA, rockA)) + 0.33 * exp(-dot(rockB, rockB));
  let fractures = sin(x * 62.0 + y * 43.0 + 1.6 * sin(y * 21.0 - x * 12.0));
  let shale = sin(x * 131.0 - y * 94.0 + 2.1 * sin(x * 40.0 + y * 23.0));
  let stone = sin((x + y) * 247.0 + 2.0 * fractures + 0.6 * shale);
  let relief = 0.031 * fractures + 0.012 * shale + 0.004 * stone;
  let elevation = shore + crags - channel - cut + relief;
  let level = mix(mix(-0.055, 0.59, 0.5 - 0.5 * cos(time * 0.62831853)), tide, manual);
  let depth = level - elevation;
  let dx = dpdx(elevation);
  let dy = dpdy(elevation);
  let pixel = max(0.0018, (abs(dx) + abs(dy)) * 0.64);
  let wet = smoothstep(-pixel, pixel, depth);

  let contourDistance = abs(fract(elevation / 0.064 + 0.5) - 0.5) * 0.064;
  let contour = 1.0 - smoothstep(pixel * 0.58, pixel * 1.65, contourDistance);
  let grainKey = fract(floor(uv * vec2f(925.0, 650.0)) * vec2f(0.1031, 0.11369));
  let grain = fract((grainKey.x + grainKey.y) * (grainKey.x + 13.13) * (grainKey.y + 19.19));
  let slope = clamp((dx - dy * 0.7) * min(viewport.x, 10000.0), -3.5, 3.5);
  let strata = 0.029 * fractures + 0.011 * shale + 0.039 * (grain - 0.5) + 0.020 * slope;

  // Only the anti-aliased shoreline needs both materials. Interior pixels skip
  // the other surface, and foam detail is evaluated at the contact line.
  var exposed = vec3f(0.0);
  if (wet < 1.0) {
    let dryStone = mix(vec3f(0.50, 0.43, 0.34), vec3f(0.94, 0.88, 0.74),
      smoothstep(-0.13, 0.91, elevation));
    let stain = vec3f(0.55, 0.40, 0.28);
    let rock = mix(dryStone, stain, 0.30 * exp(-max(-depth, 0.0) * 26.0));
    exposed = rock + vec3f(strata - contour * 0.097);
  }

  var water = vec3f(0.0);
  var foam = 0.0;
  if (wet > 0.0) {
    let swell = sin(49.0 * x - 21.0 * y + 2.1 * sin(8.0 * y + x * 4.0) - time * 1.7);
    let ribbons = sin(121.0 * x + 46.0 * y + 2.5 * swell + time * 0.8);
    let crest = max(0.0, 0.46 + 0.54 * swell);
    let crestCubed = crest * crest * crest;
    let filaments = 0.5 + 0.5 * ribbons;
    let filamentsSquared = filaments * filaments;
    let ripples = crestCubed * crestCubed * (0.36 + 0.64 * filamentsSquared * filamentsSquared);
    let ocean = mix(vec3f(0.039, 0.085, 0.19), vec3f(0.018, 0.043, 0.115), smoothstep(0.02, 0.72, depth));
    let shallows = vec3f(0.28, 0.44, 0.41) + vec3f(strata * 0.56 - contour * 0.062);
    let submerged = max(depth, 0.0);
    let attenuation = exp(-submerged * 4.0);
    let correction = submerged * 0.1;
    // Reuse the wave attenuation: exp(-8.1*d) = exp(-4*d)^2 * exp(-0.1*d).
    // The last factor's quadratic expansion changes the final color by < 1/255.
    let seabed = attenuation * attenuation * (1.0 - correction * (1.0 - correction * 0.5));
    water = mix(ocean, shallows, seabed) +
      vec3f(0.12, 0.29, 0.31) * ripples * (0.28 + 0.52 * attenuation);
    if (abs(depth) < 0.028 + pixel) {
      let broken = smoothstep(-0.46, 0.78, swell * 0.58 + ribbons * 0.33 + grain * 0.39);
      foam = wet * (1.0 - smoothstep(pixel, 0.028 + pixel, abs(depth))) * (0.38 + 0.61 * broken);
    }
  }

  var color = mix(mix(exposed, water, wet), vec3f(0.88, 0.94, 0.80), foam);
  // Route bands are disjoint. Most rock pixels never need a trail evaluation.
  if (wet < 1.0) {
    var trailY = 0.0;
    var endPoints = vec2f(0.0);
    if (x > 0.415 && x < 0.595 && y > 0.216 && y < 0.304) {
      trailY = 0.26 + 0.039 * sin(x * 9.0);
      endPoints = vec2f(0.415, 0.595);
    } else if (x > 0.535 && x < 0.635 && y > 0.794 && y < 0.866) {
      trailY = 0.83 + 0.031 * sin(x * 11.0);
      endPoints = vec2f(0.535, 0.635);
    } else if (x > 0.816 && x < 0.980 && y > 0.096 && y < 0.204) {
      trailY = 0.15 + 0.049 * sin(x * 13.0);
      endPoints = vec2f(0.816, 0.980);
    }
    if (endPoints.y > 0.0) {
      let fadeIn = smoothstep(endPoints.x, endPoints.x + 0.01, x);
      let fadeOut = 1.0 - smoothstep(endPoints.y - 0.01, endPoints.y, x);
      let dashed = smoothstep(0.26, 0.41, fract(x * 101.0));
      let line = 1.0 - smoothstep(0.001, 0.0048, abs(y - trailY));
      let mark = line * fadeIn * fadeOut * dashed * (1.0 - wet);
      color = mix(color, vec3f(0.64, 0.21, 0.069), mark);
    }
  }
  let gridDistance = abs(fract(uv * vec2f(10.0, 8.0) + 0.5) - vec2f(0.5));
  let grid = 1.0 - smoothstep(0.002, 0.010, min(gridDistance.x, gridDistance.y));
  color = mix(color, vec3f(0.68, 0.76, 0.71), grid * 0.096);
  // Shaders composites in linear light. This fit of the curved IEC sRGB segment
  // has <0.2 code-value error after conversion back to 8-bit sRGB.
  let srgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let curve = 0.00109637 + srgb * (0.02867760 + srgb * (0.54650238 +
    srgb * (0.59495913 + srgb * (-0.22566287 + srgb * 0.05445988))));
  let linear = select(srgb / 12.92, curve, srgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
