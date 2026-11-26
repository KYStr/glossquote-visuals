  // Luxury sleeper train carriage window looking out onto passing night landscapes.
  // Coordinates centered on the window glass, aspect-corrected.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second smooth rail motion cycle; preset selects route (0=Alpine, 1=Seto, 2=Arctic).
  var route = 0;
  var travel = time * 0.22;
  if (preset >= 0.0) {
    route = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    let cyc = fract(time / 12.0) * 3.0;
    route = i32(floor(cyc));
  }

  // Rounded-rectangle SDF for the carriage window opening.
  let winHalf = vec2f(0.54, 0.34);
  let cornerR = 0.075;
  let q = abs(p - vec2f(0.0, -0.01)) - (winHalf - vec2f(cornerR));
  let winDist = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - cornerR;

  let insideWin = 1.0 - smoothstep(-feather, feather, winDist);
  let brassFrame = (1.0 - smoothstep(-feather, feather, winDist - 0.028)) * (1.0 - insideWin);
  let innerBevel = exp(-abs(winDist) * 120.0) * 0.65;

  // Interior mahogany wood paneling around the window.
  let woodGrain = 0.5 + 0.5 * sin(p.y * 90.0 + 2.4 * sin(p.x * 12.0)) * cos(p.x * 8.0);
  let cabinGlow = exp(-length(p - vec2f(-0.48, -0.28)) * 2.2) * 0.32;
  var wall = vec3f(0.11, 0.065, 0.052) * (0.85 + 0.16 * woodGrain) + vec3f(0.28, 0.17, 0.08) * cabinGlow;
  // Subtle horizontal brass sill trim beneath the window.
  let sill = 1.0 - smoothstep(0.008, 0.014, abs(p.y - 0.395));
  wall = mix(wall, vec3f(0.68, 0.52, 0.27) * (0.75 + 0.35 * cos(p.x * 3.0)), sill * 0.85);

  // Exterior scene coordinates (y up from horizon at y = 0.07).
  let wy = 0.07 - p.y; // > 0 is sky, < 0 is water/valley
  let wx = p.x;

  // Night sky gradient by route.
  var skyTop = vec3f(0.035, 0.055, 0.12);
  var skyHoriz = vec3f(0.14, 0.20, 0.33);
  if (route == 1) {
    skyTop = vec3f(0.04, 0.075, 0.13);
    skyHoriz = vec3f(0.20, 0.25, 0.31);
  } else if (route == 2) {
    skyTop = vec3f(0.025, 0.055, 0.09);
    skyHoriz = vec3f(0.07, 0.19, 0.22);
  }
  var ext = mix(skyHoriz, skyTop, smoothstep(-0.02, 0.38, wy));

  // Crisp starfield in upper sky.
  let starGrid = floor(vec2f(wx + travel * 0.04, wy) * 58.0);
  let starSeed = fract(sin(dot(starGrid, vec2f(127.1, 311.7))) * 43758.5453);
  let starLocal = fract(vec2f(wx + travel * 0.04, wy) * 58.0) - vec2f(0.5);
  let star = smoothstep(0.955, 0.996, starSeed)
    * (1.0 - smoothstep(0.06, 0.22, length(starLocal))) * smoothstep(0.05, 0.24, wy);
  ext += star * vec3f(0.95, 0.93, 0.85);

  // Route-specific celestial feature: moon or aurora curtains.
  if (route == 2) {
    let ribbon = sin(wx * 5.2 + travel * 0.9 + 1.4 * sin(wy * 7.0 - travel * 0.5));
    let auroraBand = exp(-pow(wy - 0.20 - 0.05 * ribbon, 2.0) * 52.0) * (0.55 + 0.45 * sin(wx * 11.0 + travel * 1.4));
    ext += auroraBand * mix(vec3f(0.18, 0.82, 0.56), vec3f(0.45, 0.32, 0.82), smoothstep(0.16, 0.30, wy)) * 0.72;
  } else {
    let moonPos = vec2f(0.24, 0.24);
    let md = length(vec2f(wx, wy) - moonPos);
    let moonDisc = 1.0 - smoothstep(0.030, 0.034, md);
    let moonGlow = exp(-md * 9.5) * 0.28;
    ext += moonGlow * vec3f(0.88, 0.84, 0.72);
    ext = mix(ext, vec3f(0.98, 0.95, 0.86), moonDisc);
  }

  // Far mountain ridge (parallax layer 1).
  let farX = wx * 2.4 + travel * 0.35;
  let farH = 0.095 + 0.075 * sin(farX * 1.7 + 0.8) + 0.045 * cos(farX * 3.9 - 0.4) + 0.02 * sin(farX * 8.5);
  let farMask = 1.0 - smoothstep(-feather, feather, wy - farH);
  var farCol = vec3f(0.10, 0.13, 0.22);
  if (route == 0) {
    // Moonlight snow cap along upper ridge.
    let snow = smoothstep(farH - 0.045, farH - 0.005, wy);
    farCol = mix(vec3f(0.10, 0.14, 0.23), vec3f(0.62, 0.68, 0.78), snow * 0.68);
  } else if (route == 1) {
    farCol = vec3f(0.11, 0.15, 0.21);
  } else {
    let snow = smoothstep(farH - 0.055, farH - 0.005, wy);
    farCol = mix(vec3f(0.07, 0.13, 0.18), vec3f(0.48, 0.68, 0.70), snow * 0.58);
  }
  ext = mix(ext, farCol, farMask * step(0.0, wy));

  // Near foothills (parallax layer 2) + warm distant village lights along the shoreline.
  let nearX = wx * 3.6 + travel * 0.95;
  let nearH = 0.038 + 0.034 * sin(nearX * 1.4 - 0.5) + 0.018 * cos(nearX * 4.3 + 1.2);
  let nearMask = 1.0 - smoothstep(-feather, feather, wy - nearH);
  ext = mix(ext, vec3f(0.045, 0.058, 0.095), nearMask * step(0.0, wy));

  // Warm village / harbor lights tucked just above the waterline.
  let litCell = floor((wx + travel * 0.264) * 28.0);
  let litSeed = fract(sin(litCell * 91.7) * 43758.5453);
  let litLocal = fract((wx + travel * 0.264) * 28.0) - 0.5;
  let villageGlow = smoothstep(0.62, 0.95, litSeed)
    * exp(-pow(litLocal * 5.2, 2.0)) * exp(-pow((wy - 0.012) * 58.0, 2.0));
  ext += villageGlow * vec3f(1.0, 0.76, 0.38) * 0.95;

  // Dark lake / sea below horizon (wy < 0) with moonlit & village light ripples.
  let waterMask = 1.0 - smoothstep(-feather, feather, wy);
  let ripple = sin(-wy * 110.0 + wx * 12.0 + travel * 3.2) * 0.5 + 0.5;
  var waterCol = mix(skyHoriz * 0.42, vec3f(0.025, 0.04, 0.075), smoothstep(0.0, -0.26, wy));
  // Reflected moonlight / aurora shimmer column on water.
  let moonTrack = exp(-pow((wx - 0.24) * 6.5, 2.0)) * (0.28 + 0.72 * ripple) * smoothstep(-0.28, -0.01, wy);
  let waterLightCol = select(vec3f(0.88, 0.82, 0.65), vec3f(0.24, 0.76, 0.58), route == 2);
  waterCol += moonTrack * waterLightCol * 0.52;
  // Reflected village lights streaking vertically down the water.
  let villageReflect = smoothstep(0.62, 0.95, litSeed)
    * exp(-pow(litLocal * 4.5, 2.0)) * exp(wy * 9.5) * (0.45 + 0.55 * ripple);
  waterCol += villageReflect * vec3f(0.95, 0.68, 0.30) * 0.55;
  ext = mix(ext, waterCol, waterMask);

  // Rhythmic passing trackside catenary pole silhouette (fast foreground parallax).
  let poleX = fract(wx * 0.85 + travel * 1.35) - 0.5;
  let pole = (1.0 - smoothstep(0.008, 0.014, abs(poleX))) * 0.72;
  ext *= 1.0 - pole;

  // Subtle warm brass reading-lamp reflection diagonally on the carriage glass.
  let glassSheen = exp(-pow((p.x + p.y * 0.75 + 0.22) * 3.8, 2.0)) * 0.075;
  ext += vec3f(0.98, 0.82, 0.52) * glassSheen;

  // Brushed brass rounded window frame shading.
  let frameLight = 0.55 + 0.45 * max(dot(normalize(p + vec2f(0.001)), normalize(vec2f(-0.6, -0.7))), 0.0);
  let brassCol = vec3f(0.72, 0.56, 0.29) * frameLight + vec3f(0.28, 0.22, 0.12) * innerBevel;

  var color = wall;
  color = mix(color, brassCol, brassFrame);
  color = mix(color, ext, insideWin);
  color += vec3f(0.85, 0.70, 0.40) * innerBevel * 0.35;

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
