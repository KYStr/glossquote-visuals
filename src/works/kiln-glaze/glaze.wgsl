  // Ceramic stoneware bowl resting on a textured kiln shelf.
  // Coordinates are centered on the bowl axis in bowl-radius units.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0) / 0.36;
  let r = length(p);
  let a = atan2(p.y, p.x);

  // 10-second kiln firing and glaze flow cycle when preset < 0.
  let cyc = fract(time * 0.1) * 10.0;
  var activeGlaze = 0;
  var melt = 1.0;
  var kilnGlow = 0.0;

  if (preset < 0.0) {
    // Smooth flow from rim inward during first 3.5s, vitrify & hold, then reset.
    let phaseA = smoothstep(0.0, 3.4, cyc);
    let phaseReset = 1.0 - smoothstep(8.7, 9.9, cyc);
    melt = phaseA * phaseReset;
    kilnGlow = sin(smoothstep(0.0, 3.8, cyc) * 3.14159265) * 0.42;
    activeGlaze = 0;
  } else {
    activeGlaze = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
    melt = 0.88 + 0.12 * (0.5 + 0.5 * sin(time * 0.6283185));
    kilnGlow = 0.06 * (0.5 + 0.5 * cos(time * 0.6283185));
  }

  // Kiln shelf background: fine-grained refractory cordierite stone.
  let shelfTone = 0.95 - 0.11 * length(p - vec2f(-0.26, -0.30))
    + 0.018 * sin(p.x * 7.5 + 1.3 * cos(p.y * 6.0)) * cos(p.y * 8.2);
  let grogFine = fract(sin(dot(floor(p * 240.0), vec2f(127.1, 311.7))) * 43758.5453);
  let grogMicro = fract(sin(dot(floor(p * 520.0), vec2f(269.5, 183.3))) * 43758.5453);
  var color = vec3f(0.905, 0.875, 0.825) * shelfTone
    - vec3f(0.060, 0.052, 0.045) * smoothstep(0.93, 0.995, grogFine)
    - vec3f(0.024, 0.021, 0.018) * smoothstep(0.75, 0.98, grogMicro);

  // Soft cast shadow from the stoneware bowl onto the kiln shelf (light from upper-left).
  let shadowPos = p - vec2f(0.11, 0.13);
  let shadowDist = length(shadowPos * vec2f(0.95, 1.04));
  let castShadow = exp(-max(shadowDist - 0.96, 0.0) * 6.5) * smoothstep(1.38, 0.88, shadowDist);
  color *= 1.0 - 0.34 * castShadow;

  // Hand-thrown organic rim irregularity.
  let rimWobble = 0.014 * sin(a * 3.0 + 0.6) + 0.008 * cos(a * 5.0 - 1.1) + 0.005 * sin(a * 8.0 + 2.1);
  let outerR = 1.0 + rimWobble;
  let innerRimR = 0.905 + rimWobble * 0.85;
  let wellR = 0.42 + rimWobble * 0.35;
  let feather = 1.6 / max(180.0, viewport.y);

  let bowlMask = 1.0 - smoothstep(-feather, feather, r - outerR);
  let insideMask = 1.0 - smoothstep(-feather * 1.5, feather * 1.5, r - innerRimR);

  // Concave bowl interior surface normal for physically grounded studio lighting.
  let rn = clamp(r / max(innerRimR, 0.001), 0.0, 1.0);
  let slopeMag = 0.72 * pow(rn, 1.35);
  let dir2 = p / max(r, 0.0001);
  let normalIn = normalize(vec3f(-dir2.x * slopeMag, -dir2.y * slopeMag, 1.0));
  let normalRim = normalize(vec3f(dir2.x * 0.55, dir2.y * 0.55, 0.84));
  let N = normalize(mix(normalRim, normalIn, insideMask));

  let L = normalize(vec3f(-0.56, -0.62, 0.78));
  let V = vec3f(0.0, 0.0, 1.0);
  let H = normalize(L + V);
  let ndotl = max(dot(N, L), 0.0);
  let ndoth = max(dot(N, H), 0.0);

  // Raw iron-rich stoneware clay body (exposed at the rim & beneath thin glaze).
  let wheelRings = 0.5 + 0.5 * sin(r * 58.0 + 1.8 * sin(a * 2.0));
  let claySpeck = smoothstep(0.84, 0.98, fract(sin(dot(floor(p * 68.0), vec2f(41.2, 289.1))) * 43758.5));
  var clay = vec3f(0.42, 0.34, 0.27) * (0.76 + 0.32 * ndotl + 0.04 * wheelRings)
    - vec3f(0.11, 0.09, 0.07) * claySpeck;
  // Subtle toasted iron edge along the unglazed lip.
  let lipBand = exp(-abs(r - 0.955 - rimWobble * 0.9) * 28.0);
  clay = mix(clay, vec3f(0.56, 0.42, 0.30) * (0.78 + 0.30 * ndotl), lipBand * 0.65);

  // Viscous glaze rivulets flowing from the lip inward toward the pool.
  let dripWave = 0.14 * sin(a * 7.0 + 0.4) + 0.09 * cos(a * 11.0 - 1.2) + 0.06 * sin(a * 17.0 + 0.9);
  let flowReach = mix(0.95, 0.0, melt);
  let glazeFront = clamp(flowReach + dripWave * (1.0 - 0.55 * melt), -0.15, 0.96);
  let glazeCoverage = insideMask * smoothstep(glazeFront - 0.07, glazeFront + 0.05, r)
    + insideMask * smoothstep(0.55, 0.95, melt) * (1.0 - smoothstep(wellR - 0.08, wellR + 0.12, r));
  let glazeAlpha = clamp(glazeCoverage, 0.0, 1.0);

  // Glaze thickness increases in rivulet lobes and inside the central pool.
  let poolDepth = 1.0 - smoothstep(0.0, wellR * 1.15, r);
  let thickness = clamp(0.32 + 0.58 * poolDepth + 0.24 * (0.5 + 0.5 * sin(a * 7.0 + r * 6.0)), 0.0, 1.0);

  // Crackle network (celadon crazing) using multi-angle organic fracture ridges.
  let w1 = p.x * 11.2 + p.y * 6.4 + 1.35 * sin(p.y * 4.8 + p.x * 2.1);
  let w2 = p.x * 5.9 - p.y * 12.6 + 1.45 * cos(p.x * 4.3 - p.y * 2.7);
  let w3 = (p.x - p.y) * 8.4 + 1.1 * sin((p.x + p.y) * 5.2);
  let crackle = (1.0 - smoothstep(0.0, 0.036, min(abs(sin(w1)), min(abs(sin(w2)), abs(sin(w3)))))) * smoothstep(0.35, 0.85, melt);

  // Oil-spot iron crystals (tenmoku) and wood-ash gold streaks.
  let cell = floor(p * 18.0);
  let fcell = fract(p * 18.0) - vec2f(0.5, 0.5);
  let spotSeed = fract(sin(dot(cell, vec2f(91.7, 213.3))) * 43758.5453);
  let spotR = length(fcell + (vec2f(fract(spotSeed * 17.3), fract(spotSeed * 31.7)) - vec2f(0.5)) * 0.42);
  let oilSpot = smoothstep(0.55, 0.92, spotSeed) * (1.0 - smoothstep(0.10, 0.26, spotR)) * smoothstep(0.25, 0.85, melt);

  let ashStreak = pow(0.5 + 0.5 * sin(a * 13.0 + r * 9.0 + 1.4 * sin(a * 5.0)), 3.0) * smoothstep(0.2, 0.9, melt);

  // Select glaze palette & optical response by activeGlaze.
  var glazeBase = vec3f(0.46, 0.62, 0.56);
  var glazeDeep = vec3f(0.18, 0.34, 0.31);
  var specColor = vec3f(0.95, 0.98, 0.96);
  var specPower = 48.0;

  if (activeGlaze == 0) {
    // Celadon Crackle: jade translucent pool with dark hairline crazing.
    glazeBase = mix(vec3f(0.54, 0.66, 0.59), vec3f(0.19, 0.37, 0.34), thickness);
    glazeBase = mix(glazeBase, vec3f(0.15, 0.20, 0.18), crackle * 0.42);
    specColor = vec3f(0.96, 0.99, 0.97);
    specPower = 54.0;
  } else if (activeGlaze == 1) {
    // Iron Oil-Spot Tenmoku: obsidian mirror glaze with rust-silver oil-spot crystals.
    glazeBase = mix(vec3f(0.23, 0.12, 0.08), vec3f(0.05, 0.045, 0.055), thickness);
    glazeBase += oilSpot * vec3f(0.42, 0.27, 0.16);
    specColor = vec3f(0.95, 0.88, 0.78);
    specPower = 72.0;
  } else {
    // Wood-Ash Melt: olive-ochre natural ash cascading over warm stoneware.
    glazeBase = mix(vec3f(0.62, 0.55, 0.38), vec3f(0.27, 0.33, 0.21), thickness);
    glazeBase += ashStreak * vec3f(0.16, 0.14, 0.06);
    specColor = vec3f(0.98, 0.95, 0.86);
    specPower = 40.0;
  }

  let gloss = pow(ndoth, specPower) * (0.28 + 0.34 * melt) + pow(ndoth, 12.0) * 0.14;
  let fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.24;
  let glazeLit = glazeBase * (0.64 + 0.46 * ndotl) + specColor * (gloss + fresnel);

  // Subtle incandescent kiln ember warmth near the rim during peak melt.
  let ember = kilnGlow * exp(-abs(r - innerRimR) * 14.0) * vec3f(0.95, 0.38, 0.12);

  let bowlColor = mix(clay, glazeLit, glazeAlpha) + ember;
  color = mix(color, bowlColor, bowlMask);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
