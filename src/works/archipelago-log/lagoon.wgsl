  // Overhead aerial coral lagoon & sailing catamaran along a nautical chart course.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second smooth sailing & tidal caustics cycle.
  let cyc = fract(time * 0.1);
  var sea = 0;
  if (preset >= 0.0) {
    sea = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    sea = i32(floor(fract(time / 12.0) * 3.0));
  }

  // Bathymetry height field & sailing route per archipelago (0=Miyako, 1=Cyclades, 2=Palau).
  let coastWobble = 0.020 * sin(p.x * 14.0 + p.y * 9.0) + 0.010 * cos(p.y * 23.0 - p.x * 16.0);
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
  let depth = max(landSigned, 0.0); // 0 at shoreline, larger in deep sea

  // Palette by archipelago (0=Miyako, 1=Cyclades, 2=Palau).
  var deepCol = vec3f(0.032, 0.19, 0.34);
  var midCol = vec3f(0.06, 0.49, 0.57);
  var shallowCol = vec3f(0.36, 0.80, 0.78);
  var sandCol = vec3f(0.96, 0.93, 0.86);
  var floraCol = vec3f(0.24, 0.43, 0.27);

  if (sea == 1) {
    // Aegean Cyclades: deep sapphire, cobalt cove, warm sun-bleached limestone.
    deepCol = vec3f(0.04, 0.13, 0.30);
    midCol = vec3f(0.09, 0.34, 0.58);
    shallowCol = vec3f(0.38, 0.71, 0.80);
    sandCol = vec3f(0.94, 0.91, 0.85);
    floraCol = vec3f(0.55, 0.56, 0.44);
  } else if (sea == 2) {
    // Palau Milky Lagoon: pale milky aquamarine & dense emerald rock islands.
    deepCol = vec3f(0.05, 0.27, 0.35);
    midCol = vec3f(0.22, 0.64, 0.64);
    shallowCol = vec3f(0.60, 0.88, 0.85);
    sandCol = vec3f(0.95, 0.94, 0.89);
    floraCol = vec3f(0.14, 0.36, 0.20);
  }

  // Sunlit bathymetric water gradient.
  var water = mix(shallowCol, midCol, smoothstep(0.0, 0.16, depth));
  water = mix(water, deepCol, smoothstep(0.14, 0.48, depth));

  // Animated water caustics shimmering across the shallow reef floor.
  let cA = sin(p.x * 26.0 + p.y * 18.0 + time * 1.4 + 1.2 * sin(p.y * 12.0 - time * 0.9));
  let cB = sin(p.x * 19.0 - p.y * 27.0 - time * 1.1 + 1.1 * cos(p.x * 14.0 + time * 0.8));
  let caustic = pow(clamp(0.5 + 0.5 * cA * cB, 0.0, 1.0), 4.0) * (1.0 - smoothstep(0.04, 0.34, depth));
  water += vec3f(0.26, 0.34, 0.32) * caustic * 0.65;

  // Rhythmic foaming surf rings lapping gently onto the sandbar.
  let surfPhase = fract(depth * 24.0 - time * 0.42);
  let surfLine = exp(-pow((surfPhase - 0.5) * 9.0, 2.0)) * (1.0 - smoothstep(0.0, 0.065, depth)) * smoothstep(0.0, 0.006, depth);
  let shoreFoam = exp(-depth * 75.0) * 0.72;
  water = mix(water, vec3f(0.97, 0.98, 0.99), clamp(surfLine * 0.55 + shoreFoam, 0.0, 0.88));

  // Subtle nautical chart graticule & dotted sailing course arc.
  let chartGrid = max(
    1.0 - smoothstep(0.0, 0.0028, abs(fract(p.x * 3.0 + 0.5) - 0.5)),
    1.0 - smoothstep(0.0, 0.0028, abs(fract(p.y * 3.0 + 0.5) - 0.5))
  );
  water += chartGrid * vec3f(0.10, 0.16, 0.18) * 0.38;

  // Destination-specific curved sailing route passing through open turquoise water.
  var routeY = 0.24 - 0.18 * sin((p.x + 0.45) * 2.1);
  if (sea == 1) {
    // Cyclades: northern curving approach around the caldera into the western bay.
    routeY = -0.06 + 0.22 * sin((p.x - 0.14) * 2.2) + 0.12 * p.x;
  } else if (sea == 2) {
    // Palau: central S-slalom weaving between the five Rock Islands.
    routeY = 0.02 + 0.12 * sin((p.x + 0.14) * 3.8);
  }
  let routeDist = abs(p.y - routeY);
  let routeDash = smoothstep(0.35, 0.55, sin(p.x * 46.0));
  let routeLine = (1.0 - smoothstep(0.002, 0.0045, routeDist)) * routeDash * smoothstep(0.02, 0.06, depth);
  water = mix(water, vec3f(0.98, 0.96, 0.90), routeLine * 0.58);

  // Island land: warm wet sand -> dry coral sand -> lush coastal vegetation crest.
  let landMask = 1.0 - smoothstep(-feather, feather, landSigned);
  let inland = max(-landSigned, 0.0);
  let wetSand = mix(sandCol * 0.84, sandCol, smoothstep(0.0, 0.022, inland));
  let floraMask = smoothstep(0.032, 0.068, inland + 0.012 * sin(p.x * 34.0) * cos(p.y * 34.0));
  let canopy = 0.84 + 0.18 * sin(p.x * 65.0) * cos(p.y * 65.0);
  var land = mix(wetSand, floraCol * canopy, floraMask);
  if (sea == 1) {
    // Sunlit whitewashed Cycladic cliff-top houses clustered along the caldera rim.
    let villageRim = smoothstep(0.020, 0.045, inland) * (1.0 - smoothstep(0.055, 0.088, inland)) * step(0.05, p.x);
    land = mix(land, vec3f(0.97, 0.97, 0.95), villageRim * 0.72);
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
  // Local boat coordinates: bx forward, by sideways.
  let bx = rel.x * ch + rel.y * sh;
  let by = -rel.x * sh + rel.y * ch;

  // Translucent V-shaped foam wake trailing behind the catamaran.
  let behind = smoothstep(0.0, -0.02, bx) * smoothstep(-0.34, -0.02, bx);
  let wakeSpread = -bx * 0.24 + 0.014;
  let wakeEdge = exp(-pow((abs(by) - wakeSpread) * 70.0, 2.0)) * behind * exp(bx * 6.0);
  color = mix(color, vec3f(0.95, 0.98, 0.99), wakeEdge * 0.52 * (1.0 - landMask));

  // Faint shadow under the catamaran on the shallow seabed.
  let shadowHull = 1.0 - smoothstep(0.022, 0.032, length(vec2f((bx + 0.012) * 0.65, (by + 0.016) * 1.4)));
  color *= 1.0 - shadowHull * 0.22 * (1.0 - landMask);

  // Twin sleek catamaran hulls + central deck + sunlit triangular jib/mainsail.
  let hullL = length(vec2f(bx * 0.48, (by - 0.012) * 3.8)) - 0.022;
  let hullR = length(vec2f(bx * 0.48, (by + 0.012) * 3.8)) - 0.022;
  let deck = max(abs(bx + 0.005) - 0.022, abs(by) - 0.014);
  let boatMask = 1.0 - smoothstep(-feather, feather, min(min(hullL, hullR), deck));
  color = mix(color, vec3f(0.99, 0.98, 0.96), boatMask);
  // Terracotta accent stripe on the mainsail.
  let sailStripe = (1.0 - smoothstep(-feather, feather, length(vec2f((bx + 0.006) * 0.9, by * 2.2)) - 0.012));
  color = mix(color, vec3f(0.84, 0.39, 0.25), sailStripe * 0.85);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
