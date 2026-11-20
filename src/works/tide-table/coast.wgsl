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
  let pixel = max(0.0018, fwidth(elevation) * 0.64);
  let wet = smoothstep(-pixel, pixel, depth);

  let contourDistance = abs(fract(elevation / 0.064 + 0.5) - 0.5) * 0.064;
  let contour = 1.0 - smoothstep(pixel * 0.58, pixel * 1.65, contourDistance);
  let grainKey = fract(floor(uv * vec2f(925.0, 650.0)) * vec2f(0.1031, 0.11369));
  let grain = fract((grainKey.x + grainKey.y) * (grainKey.x + 13.13) * (grainKey.y + 19.19));
  let slope = clamp((dpdx(elevation) - dpdy(elevation) * 0.7) / max(1.0 / viewport.x, 0.0001), -3.5, 3.5);
  let dryStone = mix(vec3f(0.50, 0.43, 0.34), vec3f(0.94, 0.88, 0.74),
    smoothstep(-0.13, 0.91, elevation));
  let stain = vec3f(0.55, 0.40, 0.28);
  let strata = 0.029 * fractures + 0.011 * shale + 0.039 * (grain - 0.5) + 0.020 * slope;
  let rock = mix(dryStone, stain, 0.30 * exp(-max(-depth, 0.0) * 26.0));
  let exposed = rock + vec3f(strata - contour * 0.097);
  let swell = sin(49.0 * x - 21.0 * y + 2.1 * sin(8.0 * y + x * 4.0) - time * 1.7);
  let ribbons = sin(121.0 * x + 46.0 * y + 2.5 * swell + time * 0.8);
  let ripples = pow(max(0.0, 0.46 + 0.54 * swell), 6.0) * (0.36 + 0.64 * pow(0.5 + 0.5 * ribbons, 4.0));
  let ocean = mix(vec3f(0.039, 0.085, 0.19), vec3f(0.018, 0.043, 0.115), smoothstep(0.02, 0.72, depth));
  let shallows = vec3f(0.28, 0.44, 0.41) + vec3f(strata * 0.56 - contour * 0.062);
  let water = mix(ocean, shallows, exp(-max(depth, 0.0) * 8.1)) +
    vec3f(0.12, 0.29, 0.31) * ripples * (0.28 + 0.52 * exp(-max(depth, 0.0) * 4.0));
  // Foam lives only on the submerged side of the very same height threshold.
  let broken = smoothstep(-0.46, 0.78, swell * 0.58 + ribbons * 0.33 + grain * 0.39);
  let foam = wet * (1.0 - smoothstep(pixel, 0.028 + pixel, abs(depth))) * (0.38 + 0.61 * broken);
  var color = mix(mix(exposed, water, wet), vec3f(0.88, 0.94, 0.80), foam);
  // Survey trails are cut at the waterline, never drawn over submerged ground.
  let trailY = vec3f(0.26, 0.83, 0.15) + vec3f(0.039, 0.031, 0.049) * sin(uv.x * vec3f(9.0, 11.0, 13.0));
  let distanceToTrail = abs(vec3f(y) - trailY);
  let trailWindow = vec3f(
    smoothstep(0.415, 0.425, x) * (1.0 - smoothstep(0.585, 0.595, x)),
    smoothstep(0.535, 0.545, x) * (1.0 - smoothstep(0.625, 0.635, x)),
    smoothstep(0.816, 0.826, x) * (1.0 - smoothstep(0.970, 0.980, x))
  );
  let dashed = smoothstep(0.26, 0.41, fract(x * 101.0));
  let trails = (vec3f(1.0) - smoothstep(vec3f(0.001), vec3f(0.0048), distanceToTrail)) * trailWindow * dashed;
  let mark = max(trails.x, max(trails.y, trails.z)) * (1.0 - wet);
  color = mix(color, vec3f(0.64, 0.21, 0.069), mark);
  let gridDistance = abs(fract(uv * vec2f(10.0, 8.0) + 0.5) - vec2f(0.5));
  let grid = 1.0 - smoothstep(0.002, 0.010, min(gridDistance.x, gridDistance.y));
  color = mix(color, vec3f(0.68, 0.76, 0.71), grid * 0.096);
  // Palette values are authored in sRGB. Shaders composites in linear light.
  let srgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(srgb / 12.92, pow((srgb + 0.055) / 1.055, vec3f(2.4)), srgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
