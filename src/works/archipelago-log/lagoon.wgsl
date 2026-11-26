  // Luxury editorial hydrographic sea-chart & aerial archipelago sailing catamaran.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second smooth sailing & sun-glint ripple cycle.
  let cyc = fract(time * 0.1);
  var sea = 0;
  if (preset >= 0.0) {
    sea = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    sea = i32(floor(fract(time / 12.0) * 3.0));
  }

  // Natural multi-octave shoreline organic irregularity (no synthetic grid artifacts).
  let coastWobble = 0.018 * sin(p.x * 13.0 + p.y * 8.5)
    + 0.009 * cos(p.y * 21.0 - p.x * 15.0 + 0.7)
    + 0.004 * sin(p.x * 37.0 + p.y * 29.0);
  var landSigned = 1.0;
  if (sea == 0) {
    // Miyako Reef: curved crescent coral cay on upper-left + outer reef shoal on upper-right.
    let c1 = p - vec2f(-0.24, -0.04);
    let arcDist = length(c1 * vec2f(0.88, 1.18)) - 0.25;
    let bite = length(p - vec2f(-0.06, 0.06)) - 0.21;
    let mainIsland = max(arcDist, -bite);
    let shoal = length((p - vec2f(0.38, -0.22)) * vec2f(0.82, 1.25)) - 0.14;
    landSigned = min(mainIsland, shoal) + coastWobble;
  } else if (sea == 1) {
    // Aegean Cyclades: right-side volcanic caldera horseshoe cliff + two rocky northern islets.
    let calOuter = length((p - vec2f(0.28, 0.08)) * vec2f(0.95, 1.05)) - 0.27;
    let calBay = length(p - vec2f(0.11, 0.05)) - 0.19;
    let caldera = max(calOuter, -calBay);
    let isletA = length((p - vec2f(-0.42, -0.24)) * vec2f(1.05, 1.25)) - 0.11;
    let isletB = length((p - vec2f(-0.14, -0.32)) * vec2f(1.20, 1.10)) - 0.08;
    landSigned = min(caldera, min(isletA, isletB)) + coastWobble * 0.85;
  } else {
    // Palau Milky Lagoon: ring of 5 emerald mushroom Rock Islands around a central lagoon.
    let r1 = length((p - vec2f(-0.38, 0.20)) * vec2f(1.05, 1.15)) - 0.125;
    let r2 = length((p - vec2f(-0.16, -0.24)) * vec2f(1.10, 1.20)) - 0.115;
    let r3 = length((p - vec2f(0.16, -0.25)) * vec2f(1.15, 1.05)) - 0.12;
    let r4 = length((p - vec2f(0.42, 0.04)) * vec2f(1.00, 1.25)) - 0.12;
    let r5 = length((p - vec2f(0.12, 0.28)) * vec2f(1.05, 1.25)) - 0.11;
    landSigned = min(min(min(r1, r2), min(r3, r4)), r5) + coastWobble * 0.7;
  }
  let depth = max(landSigned, 0.0);

  // Refined Aman / hydrographic mineral palette (restrained, deep, sunlit — no neon glow).
  var deepCol = vec3f(0.038, 0.135, 0.225);
  var midCol = vec3f(0.075, 0.335, 0.405);
  var shallowCol = vec3f(0.285, 0.615, 0.625);
  var sandCol = vec3f(0.925, 0.892, 0.825);
  var floraCol = vec3f(0.205, 0.345, 0.235);

  if (sea == 1) {
    // Aegean Cyclades: deep Mediterranean ink-sapphire, cobalt cove, sun-bleached limestone.
    deepCol = vec3f(0.035, 0.095, 0.215);
    midCol = vec3f(0.085, 0.245, 0.435);
    shallowCol = vec3f(0.285, 0.545, 0.655);
    sandCol = vec3f(0.915, 0.885, 0.825);
    floraCol = vec3f(0.435, 0.445, 0.345);
  } else if (sea == 2) {
    // Palau Milky Lagoon: soft mineral celadon-aquamarine shallows & dense emerald rock islands.
    deepCol = vec3f(0.045, 0.185, 0.255);
    midCol = vec3f(0.165, 0.465, 0.485);
    shallowCol = vec3f(0.455, 0.725, 0.705);
    sandCol = vec3f(0.920, 0.905, 0.855);
    floraCol = vec3f(0.135, 0.305, 0.185);
  }

  // Smooth terraced bathymetric water gradient with subtle shelf drop-off.
  var water = mix(shallowCol, midCol, smoothstep(0.0, 0.14, depth));
  water = mix(water, deepCol, smoothstep(0.12, 0.44, depth));

  // Delicate hydrographic bathymetry isobaths (depth contour rings) on shallow reef shelves.
  let isobath = (1.0 - smoothstep(0.0, 0.045, abs(fract(depth * 18.0) - 0.5))) * (1.0 - smoothstep(0.06, 0.26, depth)) * smoothstep(0.012, 0.025, depth);
  water = mix(water, shallowCol * 1.18, isobath * 0.22);

  // Subtle sunlit water caustics & wind-driven sea-surface glint.
  let cA = sin(p.x * 24.0 + p.y * 16.0 + time * 1.2 + 1.1 * sin(p.y * 11.0 - time * 0.8));
  let cB = sin(p.x * 17.0 - p.y * 25.0 - time * 0.95 + 1.0 * cos(p.x * 13.0 + time * 0.7));
  let caustic = pow(clamp(0.5 + 0.5 * cA * cB, 0.0, 1.0), 5.0) * (1.0 - smoothstep(0.04, 0.28, depth));
  water += vec3f(0.18, 0.26, 0.26) * caustic * 0.42;

  // Fine rhythmic coastal surf edge lapping onto the sandbar.
  let surfPhase = fract(depth * 22.0 - time * 0.38);
  let surfLine = exp(-pow((surfPhase - 0.5) * 10.0, 2.0)) * (1.0 - smoothstep(0.0, 0.055, depth)) * smoothstep(0.0, 0.006, depth);
  let shoreFoam = exp(-depth * 85.0) * 0.58;
  water = mix(water, vec3f(0.95, 0.96, 0.95), clamp(surfLine * 0.42 + shoreFoam, 0.0, 0.76));

  // Hairline engraved nautical chart graticule & perimeter neatline.
  let chartGrid = max(
    1.0 - smoothstep(0.0, 0.0018, abs(fract(p.x * 3.0 + 0.5) - 0.5)),
    1.0 - smoothstep(0.0, 0.0018, abs(fract(p.y * 3.0 + 0.5) - 0.5))
  );
  water += chartGrid * vec3f(0.08, 0.14, 0.16) * 0.32;

  // Destination-specific curved sailing route passing through open water.
  var routeY = 0.24 - 0.18 * sin((p.x + 0.45) * 2.1);
  if (sea == 1) {
    routeY = -0.06 + 0.22 * sin((p.x - 0.14) * 2.2) + 0.12 * p.x;
  } else if (sea == 2) {
    routeY = 0.02 + 0.12 * sin((p.x + 0.14) * 3.8);
  }
  let routeDist = abs(p.y - routeY);
  let routeDash = smoothstep(0.35, 0.55, sin(p.x * 46.0));
  let routeLine = (1.0 - smoothstep(0.0018, 0.0040, routeDist)) * routeDash * smoothstep(0.02, 0.06, depth);
  water = mix(water, vec3f(0.95, 0.92, 0.84), routeLine * 0.55);

  // Island topography: warm wet sand -> sunlit coral/limestone beach -> organic mottled canopy (non-grid).
  let landMask = 1.0 - smoothstep(-feather, feather, landSigned);
  let inland = max(-landSigned, 0.0);
  let wetSand = mix(sandCol * 0.82, sandCol, smoothstep(0.0, 0.024, inland));
  let n1 = sin(p.x * 29.0 + p.y * 17.0) * cos(p.y * 23.0 - p.x * 13.0);
  let n2 = sin(p.x * 53.0 - p.y * 41.0 + 1.4) * cos(p.x * 31.0 + p.y * 47.0);
  let organicFoliage = 0.5 + 0.35 * n1 + 0.15 * n2;
  let floraMask = smoothstep(0.026, 0.060, inland + 0.010 * n1);
  // Subtle directional sun relief on the island canopy from upper-left.
  let islandShade = 0.84 + 0.26 * organicFoliage + 0.12 * smoothstep(-0.2, 0.2, -(p.x + p.y));
  var land = mix(wetSand, floraCol * islandShade, floraMask);
  if (sea == 1) {
    // Sunlit whitewashed Cycladic cliff-top houses clustered along the caldera rim.
    let villageRim = smoothstep(0.018, 0.042, inland) * (1.0 - smoothstep(0.052, 0.082, inland)) * step(0.06, p.x);
    land = mix(land, vec3f(0.95, 0.94, 0.90), villageRim * 0.72);
  }

  var color = mix(water, land, landMask);

  // Overhead white sailing catamaran gliding along the destination's dotted channel + V-wake.
  var boatX = mix(-0.48, 0.48, cyc);
  var boatY = 0.24 - 0.18 * sin((boatX + 0.45) * 2.1);
  var slope = -0.18 * 2.1 * cos((boatX + 0.45) * 2.1);
  var dir = 1.0;
  if (sea == 1) {
    boatX = mix(0.42, -0.46, cyc);
    boatY = -0.06 + 0.22 * sin((boatX - 0.14) * 2.2) + 0.12 * boatX;
    slope = -(0.22 * 2.2 * cos((boatX - 0.14) * 2.2) + 0.12);
    dir = -1.0;
  } else if (sea == 2) {
    boatX = mix(-0.50, 0.50, cyc);
    boatY = 0.02 + 0.12 * sin((boatX + 0.14) * 3.8);
    slope = 0.12 * 3.8 * cos((boatX + 0.14) * 3.8);
  }
  let heading = atan2(slope, dir);
  let ch = cos(heading);
  let sh = sin(heading);
  let rel = p - vec2f(boatX, boatY);
  let bx = rel.x * ch + rel.y * sh;
  let by = -rel.x * sh + rel.y * ch;

  // Translucent V-shaped foam wake trailing behind the catamaran.
  let behind = smoothstep(0.0, -0.02, bx) * smoothstep(-0.32, -0.02, bx);
  let wakeSpread = -bx * 0.22 + 0.013;
  let wakeEdge = exp(-pow((abs(by) - wakeSpread) * 72.0, 2.0)) * behind * exp(bx * 6.5);
  color = mix(color, vec3f(0.94, 0.96, 0.96), wakeEdge * 0.46 * (1.0 - landMask));

  // Faint shadow under the catamaran on the shallow seabed.
  let shadowHull = 1.0 - smoothstep(0.020, 0.030, length(vec2f((bx + 0.012) * 0.65, (by + 0.015) * 1.4)));
  color *= 1.0 - shadowHull * 0.20 * (1.0 - landMask);

  // Twin sleek catamaran hulls + central deck + sunlit terracotta-trimmed mainsail.
  let hullL = length(vec2f(bx * 0.48, (by - 0.012) * 3.8)) - 0.022;
  let hullR = length(vec2f(bx * 0.48, (by + 0.012) * 3.8)) - 0.022;
  let deck = max(abs(bx + 0.005) - 0.022, abs(by) - 0.014);
  let boatMask = 1.0 - smoothstep(-feather, feather, min(min(hullL, hullR), deck));
  color = mix(color, vec3f(0.98, 0.97, 0.94), boatMask);
  let sailStripe = 1.0 - smoothstep(-feather, feather, length(vec2f((bx + 0.006) * 0.9, by * 2.2)) - 0.011);
  color = mix(color, vec3f(0.76, 0.34, 0.20), sailStripe * 0.85);

  // Subtle editorial vignette framing the hydrographic chart.
  let vig = 1.0 - 0.14 * dot(p * vec2f(0.85, 1.05), p * vec2f(0.85, 1.05));
  color *= clamp(vig, 0.78, 1.02);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
