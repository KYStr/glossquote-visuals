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

  // Night sky gradient by route (0=Alpine cobalt, 1=Seto amber-indigo dusk, 2=Arctic teal).
  var skyTop = vec3f(0.032, 0.052, 0.13);
  var skyHoriz = vec3f(0.14, 0.21, 0.36);
  if (route == 1) {
    skyTop = vec3f(0.055, 0.075, 0.16);
    skyHoriz = vec3f(0.32, 0.23, 0.25);
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

  // Route-specific celestial feature: right Alpine moon, left Seto crescent, or Arctic aurora.
  var moonX = 0.26;
  if (route == 2) {
    let ribbon = sin(wx * 5.2 + travel * 0.9 + 1.4 * sin(wy * 7.0 - travel * 0.5));
    let auroraBand = exp(-pow(wy - 0.20 - 0.05 * ribbon, 2.0) * 52.0) * (0.55 + 0.45 * sin(wx * 11.0 + travel * 1.4));
    ext += auroraBand * mix(vec3f(0.18, 0.82, 0.56), vec3f(0.45, 0.32, 0.82), smoothstep(0.16, 0.30, wy)) * 0.72;
  } else if (route == 1) {
    moonX = -0.28;
    let moonPos = vec2f(moonX, 0.22);
    let md = length(vec2f(wx, wy) - moonPos);
    let cutD = length(vec2f(wx, wy) - (moonPos + vec2f(0.015, 0.008)));
    let crescent = (1.0 - smoothstep(0.028, 0.032, md)) * smoothstep(0.023, 0.027, cutD);
    let moonGlow = exp(-md * 9.0) * 0.26;
    ext += moonGlow * vec3f(0.96, 0.76, 0.52);
    ext = mix(ext, vec3f(1.0, 0.91, 0.74), crescent);
  } else {
    let moonPos = vec2f(moonX, 0.25);
    let md = length(vec2f(wx, wy) - moonPos);
    let moonDisc = 1.0 - smoothstep(0.031, 0.035, md);
    let moonGlow = exp(-md * 9.5) * 0.30;
    ext += moonGlow * vec3f(0.86, 0.88, 0.96);
    ext = mix(ext, vec3f(0.98, 0.98, 0.95), moonDisc);
  }

  // Route-specific silhouette: jagged Alps, low Seto archipelago + bridge, or rolling Arctic fjell.
  let farX = wx * 2.4 + travel * 0.35;
  var farH = 0.0;
  var farCol = vec3f(0.10, 0.13, 0.22);
  if (route == 0) {
    // Tall, sharp jagged Alpine peaks with moonlit snowfields.
    let pA = 1.0 - abs(sin(farX * 1.35 + 0.4));
    let pB = 1.0 - abs(sin(farX * 2.95 - 0.9));
    farH = 0.095 + 0.115 * pA * pA + 0.048 * pB + 0.016 * sin(farX * 9.0);
    let snow = smoothstep(farH - 0.068, farH - 0.006, wy);
    farCol = mix(vec3f(0.09, 0.13, 0.23), vec3f(0.72, 0.78, 0.88), snow * 0.78);
  } else if (route == 1) {
    // Low, gentle rounded Seto Inland Sea islands separated by sea straits.
    let islA = max(0.0, sin(farX * 1.15 + 0.5)) * 0.052;
    let islB = max(0.0, cos(farX * 2.35 - 0.7)) * 0.024;
    farH = 0.006 + islA + islB;
    farCol = vec3f(0.10, 0.12, 0.20);
  } else {
    // Broad rolling sub-arctic snow plateau reflecting the aurora.
    farH = 0.072 + 0.036 * sin(farX * 1.2 + 0.3) + 0.018 * cos(farX * 2.6 - 0.5);
    let snow = smoothstep(farH - 0.042, farH - 0.005, wy);
    farCol = mix(vec3f(0.06, 0.12, 0.17), vec3f(0.46, 0.72, 0.70), snow * 0.62);
  }
  let farMask = 1.0 - smoothstep(-feather, feather, wy - farH);
  ext = mix(ext, farCol, farMask * step(0.0, wy));

  // Route-specific mid-layer: Seto illuminated suspension bridge vs. Alpine/Arctic foothills.
  if (route == 1) {
    let bx = fract((wx + travel * 0.16) * 0.68 + 0.5) - 0.5;
    // Twin bridge pylons at bx = -0.22 and bx = +0.22.
    let towerA = (1.0 - smoothstep(0.006, 0.011, abs(bx + 0.22))) * step(0.0, wy) * (1.0 - smoothstep(0.145, 0.152, wy));
    let towerB = (1.0 - smoothstep(0.006, 0.011, abs(bx - 0.22))) * step(0.0, wy) * (1.0 - smoothstep(0.145, 0.152, wy));
    let crossBeam = (1.0 - smoothstep(0.004, 0.007, abs(wy - 0.105))) * (step(abs(bx + 0.22), 0.016) + step(abs(bx - 0.22), 0.016));
    // Sweeping catenary suspension cables between towers.
    let spanT = clamp(bx / 0.22, -1.0, 1.0);
    let mainCableY = 0.056 + 0.088 * spanT * spanT;
    let sideCableY = 0.056 + 0.088 * pow(max(0.0, 1.0 - abs(abs(bx) - 0.22) / 0.28), 2.0);
    let cableY = select(sideCableY, mainCableY, abs(bx) <= 0.22);
    let cable = 1.0 - smoothstep(0.0025, 0.0055, abs(wy - cableY));
    // Bridge deck & warm sodium-amber roadway lamps.
    let deck = 1.0 - smoothstep(0.004, 0.008, abs(wy - 0.044));
    let bridgeStruct = clamp(towerA + towerB + crossBeam + cable * 0.7 + deck, 0.0, 1.0);
    ext = mix(ext, vec3f(0.12, 0.14, 0.20), bridgeStruct * 0.88);
    let lampLocal = fract((wx + travel * 0.16) * 34.0) - 0.5;
    let bridgeLamps = exp(-pow(lampLocal * 5.0, 2.0)) * exp(-pow((wy - 0.048) * 90.0, 2.0));
    let towerBeacon = (exp(-length(vec2f(bx + 0.22, wy - 0.152)) * 55.0) + exp(-length(vec2f(bx - 0.22, wy - 0.152)) * 55.0));
    ext += bridgeLamps * vec3f(1.0, 0.78, 0.40) * 1.15 + towerBeacon * vec3f(1.0, 0.42, 0.28) * 0.9;
  } else {
    let nearX = wx * 3.6 + travel * 0.95;
    let nearH = select(0.036, 0.048, route == 0) + 0.032 * sin(nearX * 1.4 - 0.5) + 0.018 * cos(nearX * 4.3 + 1.2);
    let nearMask = 1.0 - smoothstep(-feather, feather, wy - nearH);
    ext = mix(ext, vec3f(0.045, 0.058, 0.095), nearMask * step(0.0, wy));
  }

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
  let moonTrack = exp(-pow((wx - moonX) * 6.5, 2.0)) * (0.28 + 0.72 * ripple) * smoothstep(-0.28, -0.01, wy);
  let waterLightCol = select(select(vec3f(0.86, 0.88, 0.94), vec3f(0.98, 0.78, 0.50), route == 1), vec3f(0.24, 0.76, 0.58), route == 2);
  waterCol += moonTrack * waterLightCol * 0.54;
  if (route == 1) {
    let bridgeRef = exp(-pow((wy + 0.05) * 14.0, 2.0)) * (0.45 + 0.55 * ripple) * 0.26;
    waterCol += bridgeRef * vec3f(0.98, 0.72, 0.34);
  }
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
