  // O(1) Analytic Perspective Mediterranean & Okinawa Ocean Horizon Cinema.
  // Zero raymarching loops -> silky 60fps even on 5-year-old integrated-GPU office laptops.
  // 0 = Cyclades Golden Hour, 1 = Miyako Noon Turquoise, 2 = Amalfi Rose Dusk.
  let ndc = (uv - vec2f(0.5, 0.5)) * vec2f(aspect, -1.0);
  var sea = 0;
  if (preset >= 0.0) {
    sea = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    sea = i32(floor(fract(time / 18.0) * 3.0));
  }

  // Horizon sits slightly below vertical center for grand atmospheric sky + glittering sea foreground.
  let horizonY = -0.04;
  let wy = ndc.y - horizonY;
  let wx = ndc.x;

  // Palette & Sun geometry per sea horizon.
  var sunPos = vec2f(-0.22, 0.145);
  var skyZenith = vec3f(0.06, 0.14, 0.30);
  var skyMid = vec3f(0.28, 0.36, 0.48);
  var skyHoriz = vec3f(1.02, 0.62, 0.34);
  var sunCol = vec3f(2.1, 1.25, 0.62);
  var deepWater = vec3f(0.015, 0.08, 0.18);
  var scatterWater = vec3f(0.05, 0.32, 0.42);
  var hazeCol = vec3f(0.76, 0.55, 0.42);

  if (sea == 1) {
    // Miyako Noon Turquoise: radiant Okinawa sky & luminous aquamarine shallow sea.
    sunPos = vec2f(0.26, 0.28);
    skyZenith = vec3f(0.07, 0.30, 0.64);
    skyMid = vec3f(0.26, 0.56, 0.82);
    skyHoriz = vec3f(0.76, 0.90, 0.94);
    sunCol = vec3f(1.9, 1.82, 1.58);
    deepWater = vec3f(0.015, 0.19, 0.32);
    scatterWater = vec3f(0.06, 0.66, 0.68);
    hazeCol = vec3f(0.68, 0.85, 0.90);
  } else if (sea == 2) {
    // Amalfi Rose Dusk: warm violet-cobalt twilight fading into rose-gold horizon.
    sunPos = vec2f(0.08, 0.095);
    skyZenith = vec3f(0.07, 0.09, 0.22);
    skyMid = vec3f(0.34, 0.23, 0.38);
    skyHoriz = vec3f(1.04, 0.50, 0.42);
    sunCol = vec3f(2.05, 0.95, 0.64);
    deepWater = vec3f(0.025, 0.055, 0.14);
    scatterWater = vec3f(0.18, 0.18, 0.28);
    hazeCol = vec3f(0.72, 0.44, 0.44);
  }

  // Atmospheric sky gradient + Rayleigh/Mie sun glow.
  let skyT = clamp(max(wy, 0.0) / 0.56, 0.0, 1.0);
  var sky = mix(skyHoriz, skyMid, smoothstep(0.0, 0.38, skyT));
  sky = mix(sky, skyZenith, smoothstep(0.26, 1.0, skyT));

  let sDist = length(vec2f(wx, max(wy, -0.05)) - sunPos);
  let sunHalo = exp(-sDist * 4.2) * 0.45 + exp(-sDist * 16.0) * 0.85;
  let sunDisc = 1.0 - smoothstep(0.024, 0.030, sDist);
  sky += sunCol * sunHalo + vec3f(1.2, 1.15, 1.0) * sunDisc * 1.6;

  // Perspective high-altitude trade-wind clouds with bright sunlit undersides (O(1)).
  if (wy > 0.004) {
    let cz = 1.0 / (wy + 0.11);
    let cu = vec2f(wx * cz * 0.42 + time * 0.018, cz * 0.36 - time * 0.010);
    let n1 = sin(cu.x * 1.8 + 0.9 * cos(cu.y * 1.5)) * cos(cu.y * 2.1 - cu.x * 0.8);
    let n2 = sin(cu.x * 4.1 - cu.y * 3.7 + 0.8 * sin(cu.x * 1.9)) * 0.45;
    let n3 = cos(cu.x * 8.5 + cu.y * 7.2) * 0.20;
    let cloudDensity = smoothstep(0.15, 0.95, n1 + n2 + n3)
      * smoothstep(0.008, 0.14, wy) * (1.0 - smoothstep(0.32, 0.54, wy));
    let rimLight = exp(-sDist * 2.8);
    let cloudCol = mix(skyMid * 0.92 + vec3f(0.18), sunCol * 0.88, clamp(0.35 + 0.65 * rimLight, 0.0, 1.0));
    sky = mix(sky, cloudCol, cloudDensity * 0.56);
  }

  var color = sky;

  // Multi-layer distant limestone islands & coastal headlands (aerial perspective, O(1)).
  if (wy >= -0.002) {
    let drift = sin(time * 0.08) * 0.015;
    // Far hazy volcanic caldera ridge across horizon.
    let fX = (wx + drift * 0.4) * 2.6 + select(0.0, select(1.4, 2.8, sea == 2), sea >= 1);
    let farH = max(0.0, 0.042 * sin(fX * 1.3 + 0.4) + 0.028 * cos(fX * 3.1 - 0.8) + 0.012 * sin(fX * 6.8) - 0.008);
    let farMask = (1.0 - smoothstep(-0.002, 0.002, wy - farH)) * step(0.001, farH);
    let farCol = mix(hazeCol * 0.72, skyHoriz * 0.68, 0.45);
    color = mix(color, farCol, farMask * 0.78);

    // Mid-distance sunlit limestone headland on right-hand side.
    let mX = (wx - 0.36 + drift * 0.8);
    let headlandEnv = exp(-mX * mX * 4.8);
    let midH = headlandEnv * (0.145 + 0.032 * sin(mX * 14.0 + 1.1) + 0.016 * cos(mX * 29.0) + 0.008 * sin(mX * 58.0));
    let midMask = (1.0 - smoothstep(-0.0018, 0.0018, wy - midH)) * step(0.002, midH);
    let strata = 0.5 + 0.5 * sin(wy * 165.0 + 1.6 * sin(mX * 18.0));
    let litFace = smoothstep(-0.18, 0.14, mX - sunPos.x * 0.35);
    let cliffShadow = mix(deepWater * 1.35 + vec3f(0.06, 0.06, 0.09), hazeCol * 0.52, 0.42);
    let cliffSun = mix(vec3f(0.74, 0.64, 0.52), skyHoriz * 0.85, 0.35) * (0.88 + 0.14 * strata);
    let midCol = mix(cliffShadow, cliffSun, (1.0 - litFace) * 0.65);
    color = mix(color, mix(midCol, hazeCol, 0.24), midMask);

    // Near dramatic dark-silhouette promontory framing the far left edge.
    let nX = (wx + 0.62 + drift);
    let nearEnv = exp(-nX * nX * 6.5);
    let nearH = nearEnv * (0.11 + 0.025 * sin(nX * 18.0) + 0.011 * cos(nX * 37.0));
    let nearMask = (1.0 - smoothstep(-0.0015, 0.0015, wy - nearH)) * step(0.002, nearH);
    let nearCol = deepWater * 0.9 + vec3f(0.04, 0.04, 0.055);
    color = mix(color, nearCol, nearMask);
  }

  // Analytic 3D Perspective Ocean Plane below horizon (wy < 0) — O(1), razor sharp!
  if (wy < 0.0) {
    let depthZ = 1.0 / max(-wy, 0.0035);
    let worldX = wx * depthZ * 0.85;
    let worldZ = depthZ * 0.95;

    // Domain-warped horizontal ocean swells (non-orthogonal irrational angles -> zero grid/waffle!).
    let atten = 1.0 / (1.0 + depthZ * 0.048);
    let warpX = worldX * 0.55 + 0.65 * sin(worldZ * 0.95 - time * 0.55);
    let warpZ = worldZ * 1.45 + 0.45 * cos(worldX * 0.48 + time * 0.42);
    let w1 = sin(warpZ * 1.9 + warpX * 0.42 - time * 1.15);
    let w2 = sin(warpZ * 3.7 - warpX * 0.85 - time * 1.48 + 1.3 * w1);
    let w3 = sin(warpZ * 7.8 + warpX * 1.65 - time * 1.92 + 0.7 * w2);
    let w4 = cos(warpZ * 15.2 - warpX * 3.1 + time * 2.4);
    let w5 = sin(warpZ * 29.5 + warpX * 5.8 - time * 2.8);

    let nx = (w1 * 0.018 + w2 * 0.022 + w3 * 0.019 + w4 * 0.013 + w5 * 0.008) * atten;
    let nz = (w1 * 0.046 + w2 * 0.042 + w3 * 0.032 + w4 * 0.020 + w5 * 0.012) * atten;
    let wN = normalize(vec3f(nx, 1.0, nz));

    // View vector & Fresnel sky reflection.
    let V = normalize(vec3f(wx * 0.85, wy, -1.0));
    let R = reflect(V, wN);
    let fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(-V, wN), 0.0), 4.2);

    // Reflected sky color + shimmering molten sun-glitter path on micro-waves!
    let rSkyT = clamp(max(R.y, 0.0) / 0.56, 0.0, 1.0);
    var reflCol = mix(skyHoriz * 0.92, skyMid * 0.88, smoothstep(0.0, 0.42, rSkyT));
    reflCol = mix(reflCol, skyZenith * 0.85, smoothstep(0.32, 1.0, rSkyT));

    let sunVec = normalize(vec3f(sunPos.x * 0.85, sunPos.y, -1.0));
    let specDot = max(dot(R, sunVec), 0.0);
    // Broad warm path + crisp sparkling bokeh glints on wave facets.
    let glitter = pow(specDot, 24.0) * 0.72 + pow(specDot, 220.0) * 2.8 + pow(specDot, 900.0) * 5.2;
    reflCol += sunCol * glitter;

    // Subsurface turquoise-emerald glow inside translucent wave crests.
    let crestGlow = smoothstep(0.15, 0.95, 0.5 + 0.5 * w1) * (1.0 - smoothstep(0.0, 0.35, -wy * 0.8 + 0.05));
    let waterBody = mix(deepWater, scatterWater, 0.32 + 0.52 * crestGlow + 0.18 * smoothstep(-0.48, -0.04, wy));

    // Subtle dark reflection of the right-hand limestone headland on the water below it.
    let mX = (wx - 0.36 + sin(time * 0.08) * 0.012);
    let cliffReflMask = exp(-mX * mX * 4.8) * smoothstep(-0.18, -0.005, wy + nx * 0.3);
    reflCol = mix(reflCol, deepWater * 1.1 + vec3f(0.04, 0.04, 0.06), cliffReflMask * 0.55);

    var seaCol = mix(waterBody, reflCol, fresnel);
    // Atmospheric horizon mist seamlessly blending ocean into sky.
    let horizMist = exp(-(-wy) * 26.0);
    color = mix(seaCol, skyHoriz * 0.92, horizMist * 0.72);
  }

  // Subtle medium-format photographic film grain (eliminates 8-bit sky banding).
  let grain = fract(sin(dot(uv * viewport, vec2f(12.9898, 78.233)) + fract(time) * 17.0) * 43758.5453) - 0.5;
  color += vec3f(grain * 0.014);

  // ACES Filmic tone mapping -> linear light output for the compositor.
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e2 = 0.14;
  let mapped = clamp((color * (a * color + b)) / (color * (c * color + d) + e2), vec3f(0.0), vec3f(1.0));
  return vec4f(mapped, 1.0);
