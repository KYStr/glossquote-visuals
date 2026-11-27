  // O(1) Analytic Perspective Japanese Architectural Onsen & Mountain Mist Cinema.
  // Zero raymarching loops -> silky 60fps on 5-year-old integrated-GPU office laptops.
  // 0 = Winter Snow Onsen, 1 = Autumn Maple Mist, 2 = Summer Cedar Rain.
  let ndc = (uv - vec2f(0.5, 0.5)) * vec2f(aspect, -1.0);
  var season = 0;
  if (preset >= 0.0) {
    season = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    season = i32(floor(fract(time / 18.0) * 3.0));
  }

  let poolHorizon = -0.06;
  let wy = ndc.y - poolHorizon;
  let wx = ndc.x;

  // Seasonal atmospheric palettes (Winter Indigo / Autumn Crimson-Gold / Summer Jade Mist).
  var skyTop = vec3f(0.055, 0.085, 0.16);
  var skyMist = vec3f(0.32, 0.38, 0.48);
  var mtnFar = vec3f(0.18, 0.23, 0.32);
  var mtnMid = vec3f(0.10, 0.14, 0.21);
  var mtnNear = vec3f(0.055, 0.075, 0.11);
  var foliageAccent = vec3f(0.68, 0.75, 0.84); // Snow dusting
  var lanternCol = vec3f(2.2, 1.18, 0.42);
  var steamCol = vec3f(0.76, 0.80, 0.86);

  if (season == 1) {
    // Autumn Maple Mist: warm amber-cream dawn mist over crimson-russet valleys.
    skyTop = vec3f(0.16, 0.14, 0.22);
    skyMist = vec3f(0.72, 0.56, 0.44);
    mtnFar = vec3f(0.36, 0.25, 0.24);
    mtnMid = vec3f(0.26, 0.12, 0.11);
    mtnNear = vec3f(0.12, 0.065, 0.06);
    foliageAccent = vec3f(0.76, 0.24, 0.11); // Crimson maple canopy
    lanternCol = vec3f(2.1, 1.15, 0.45);
    steamCol = vec3f(0.88, 0.80, 0.72);
  } else if (season == 2) {
    // Summer Cedar Rain: tranquil deep emerald cedar ridges wrapped in cool silver-jade mist.
    skyTop = vec3f(0.055, 0.12, 0.13);
    skyMist = vec3f(0.38, 0.48, 0.45);
    mtnFar = vec3f(0.16, 0.25, 0.24);
    mtnMid = vec3f(0.085, 0.16, 0.14);
    mtnNear = vec3f(0.04, 0.085, 0.075);
    foliageAccent = vec3f(0.16, 0.34, 0.24); // Rain-washed cedar & bamboo
    lanternCol = vec3f(2.05, 1.22, 0.52);
    steamCol = vec3f(0.74, 0.82, 0.78);
  }

  let skyT = clamp(max(wy, 0.0) / 0.58, 0.0, 1.0);
  var color = mix(skyMist, skyTop, smoothstep(0.0, 0.92, skyT));

  // Soft moon / dawn sun glow diffused through high valley mist.
  let glowPos = vec2f(-0.28, 0.28);
  let gDist = length(vec2f(wx, max(wy, 0.0)) - glowPos);
  color += mix(skyMist, vec3f(1.0, 0.92, 0.82), 0.55) * exp(-gDist * 3.4) * 0.42;

  // 3-Layer Ink-Wash Cedar Mountain Ridges with luminous valley mist bands between ridges.
  if (wy >= -0.002) {
    let shift = sin(time * 0.05) * 0.012;
    // Far ridge
    let x1 = (wx + shift * 0.3) * 2.2 + 0.6;
    let h1 = 0.22 + 0.095 * sin(x1 * 1.4) + 0.048 * cos(x1 * 3.1 - 0.5) + 0.020 * sin(x1 * 6.7);
    let m1 = 1.0 - smoothstep(-0.002, 0.002, wy - h1);
    let mist1 = exp(-max(wy, 0.0) * 6.5);
    color = mix(color, mix(mtnFar, skyMist, mist1 * 0.65), m1);

    // Mid ridge with subtle seasonal canopy / snow crest.
    let x2 = (wx - 0.18 + shift * 0.6) * 2.7;
    let h2 = 0.145 + 0.072 * cos(x2 * 1.6 + 0.9) + 0.032 * sin(x2 * 4.2) + 0.014 * cos(x2 * 9.5);
    let m2 = 1.0 - smoothstep(-0.0018, 0.0018, wy - h2);
    let crest2 = smoothstep(h2 - 0.038, h2 - 0.004, wy) * (0.55 + 0.45 * sin(x2 * 22.0));
    let midCol = mix(mtnMid, foliageAccent, crest2 * 0.48);
    let mist2 = exp(-max(wy, 0.0) * 9.5);
    color = mix(color, mix(midCol, skyMist, mist2 * 0.52), m2);

    // Near wooded valley slope framing right & left edges.
    let x3 = (wx + 0.12 + shift) * 3.1;
    let h3 = 0.068 + 0.052 * pow(abs(wx), 1.4) + 0.022 * sin(x3 * 2.4) + 0.011 * cos(x3 * 7.8) + 0.005 * sin(x3 * 19.0);
    let m3 = 1.0 - smoothstep(-0.0015, 0.0015, wy - h3);
    let nearCol = mix(mtnNear, foliageAccent * 0.55, smoothstep(h3 - 0.022, h3, wy) * 0.35);
    color = mix(color, nearCol, m3);
  }

  // Warm Japanese Andon paper lantern perched on the dark basalt pool edge (right-mid).
  let lampPos = vec2f(0.42, 0.028);
  let lp = vec2f(wx, wy) - lampPos;
  let lampBox = max(abs(lp.x) - 0.015, abs(lp.y) - 0.024);
  let lampMask = 1.0 - smoothstep(-0.002, 0.002, lampBox);
  let lampHalo = exp(-length(lp) * 7.5) * 0.52 + exp(-length(lp) * 24.0) * 0.85;
  color += lanternCol * lampHalo * smoothstep(-0.04, 0.01, wy);
  color = mix(color, vec3f(1.5, 1.25, 0.82), lampMask);

  // Analytic Black-Basalt Infinity Onsen Water Plane below poolHorizon (wy < 0).
  if (wy < 0.0) {
    let depthZ = 1.0 / max(-wy, 0.004);
    let worldX = wx * depthZ * 0.72;
    let worldZ = depthZ * 0.85;
    let atten = 1.0 / (1.0 + depthZ * 0.06);

    // Gentle concentric & drifting thermal ripples on mirror-calm black stone pool.
    let w1 = sin(worldZ * 2.4 + worldX * 0.45 - time * 0.65);
    let w2 = cos(worldZ * 5.2 - worldX * 0.92 + time * 0.85 + 0.9 * w1);
    let w3 = sin(worldZ * 11.5 + worldX * 2.1 - time * 1.15);
    let nx = (w1 * 0.010 + w2 * 0.012 + w3 * 0.008) * atten;
    let nz = (w1 * 0.022 + w2 * 0.020 + w3 * 0.014) * atten;
    let wN = normalize(vec3f(nx, 1.0, nz));

    let V = normalize(vec3f(wx * 0.75, wy, -1.0));
    let fresnel = 0.08 + 0.92 * pow(1.0 - max(dot(-V, wN), 0.0), 3.6);

    // Reflected misty sky & dark mountain silhouette in the black-basalt water.
    let reflY = clamp(-wy + nz * 0.35, 0.0, 0.55);
    let reflSky = mix(skyMist * 0.68, skyTop * 0.75, smoothstep(0.0, 0.45, reflY));
    let basaltPool = vec3f(0.022, 0.026, 0.032);
    var poolCol = mix(basaltPool, reflSky, fresnel * 0.72);

    // Warm golden paper-lantern reflection column shimmering vertically down the dark water!
    let lampReflX = (wx - lampPos.x) + nx * 0.85;
    let lampTrack = exp(-pow(lampReflX * 14.0, 2.0)) * exp(-(-wy) * 3.8)
      * (0.48 + 0.52 * smoothstep(-0.3, 0.85, w2 + w3 * 0.6));
    let lampSparkle = exp(-pow(lampReflX * 36.0, 2.0)) * exp(-(-wy) * 6.5) * pow(0.5 + 0.5 * w3, 4.0);
    poolCol += lanternCol * (lampTrack * 0.58 + lampSparkle * 1.35);

    // Subtle honed basalt infinity coping stone edge right at wy = 0.
    let coping = exp(-abs(wy) * 180.0) * 0.35;
    poolCol += vec3f(0.18, 0.19, 0.21) * coping;

    color = poolCol;
  }

  // Rising Volumetric Thermal Steam Plumes (湯煙) curling lazily upward from the hot spring.
  let stU = vec2f(wx * 2.2 + 0.35 * sin(wy * 4.5 - time * 0.32), wy * 2.8 - time * 0.28);
  let s1 = sin(stU.x * 2.1 + 1.1 * cos(stU.y * 1.8 + time * 0.15)) * cos(stU.y * 2.4 - stU.x * 1.2);
  let s2 = sin(stU.x * 4.6 - stU.y * 3.9 + time * 0.22) * 0.48;
  let steamBand = smoothstep(-0.38, 0.02, wy) * (1.0 - smoothstep(0.06, 0.36, wy));
  let steamDensity = smoothstep(0.18, 1.05, s1 + s2) * steamBand;
  // Steam catches warm amber lantern light near the lamp and cool mist elsewhere.
  let steamWarmth = exp(-length(vec2f(wx - lampPos.x, wy)) * 2.8);
  let litSteam = mix(steamCol, lanternCol * 0.65, clamp(steamWarmth * 0.75, 0.0, 0.85));
  color = mix(color, litSteam, steamDensity * 0.44);

  // Subtle dark Hinoki timber architectural eave shadow along the very top edge.
  let eave = smoothstep(0.41, 0.48, ndc.y);
  color = mix(color, vec3f(0.03, 0.025, 0.022), eave * 0.85);

  // Fine medium-format film grain.
  let grain = fract(sin(dot(uv * viewport, vec2f(12.9898, 78.233)) + fract(time) * 19.0) * 43758.5453) - 0.5;
  color += vec3f(grain * 0.013);

  // ACES Filmic tone mapping -> linear light output.
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e2 = 0.14;
  let mapped = clamp((color * (a * color + b)) / (color * (c * color + d) + e2), vec3f(0.0), vec3f(1.0));
  return vec4f(mapped, 1.0);
