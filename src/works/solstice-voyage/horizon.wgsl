  // Full-bleed 3D raymarched cinematic landscapes with binary-search surface refinement.
  // 0 = Sahara Dusk, 1 = Fjord Midnight Sun, 2 = Alps Alpenglow.
  let ndc = (uv - vec2f(0.5, 0.5)) * vec2f(aspect, -1.0);
  var scene = 0;
  if (preset >= 0.0) {
    scene = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    scene = i32(floor(fract(time / 18.0) * 3.0));
  }

  let driftX = sin(time * 0.14) * 0.42;
  let driftZ = time * 0.18;
  let camPos = select(
    select(vec3f(driftX, 1.55, -driftZ * 0.65), vec3f(driftX * 0.35, 1.05, -driftZ * 0.40), scene == 1),
    vec3f(driftX * 0.5, 2.35, -driftZ * 0.30),
    scene == 2
  );

  let pitch = select(select(-0.10, -0.05, scene == 1), -0.11, scene == 2);
  let cp = cos(pitch);
  let sp = sin(pitch);
  let rawDir = normalize(vec3f(ndc.x * 1.16, ndc.y * 1.16, -1.08));
  let rd = normalize(vec3f(rawDir.x, rawDir.y * cp - rawDir.z * sp, rawDir.y * sp + rawDir.z * cp));

  // Rich high-contrast cinematic sun & sky palette per scene.
  var sunDir = normalize(vec3f(-0.46, 0.145, -0.875));
  var skyZenith = vec3f(0.035, 0.065, 0.18);
  var skyMid = vec3f(0.28, 0.18, 0.24);
  var skyHoriz = vec3f(0.98, 0.46, 0.18);
  var sunCol = vec3f(1.85, 0.95, 0.42);
  var fogCol = vec3f(0.48, 0.24, 0.18);

  if (scene == 1) {
    sunDir = normalize(vec3f(0.04, 0.11, -0.99));
    skyZenith = vec3f(0.025, 0.055, 0.13);
    skyMid = vec3f(0.11, 0.19, 0.30);
    skyHoriz = vec3f(0.92, 0.54, 0.30);
    sunCol = vec3f(1.90, 1.05, 0.52);
    fogCol = vec3f(0.22, 0.25, 0.34);
  } else if (scene == 2) {
    sunDir = normalize(vec3f(0.56, 0.16, -0.81));
    skyZenith = vec3f(0.03, 0.055, 0.16);
    skyMid = vec3f(0.19, 0.14, 0.28);
    skyHoriz = vec3f(0.94, 0.44, 0.40);
    sunCol = vec3f(1.80, 0.82, 0.62);
    fogCol = vec3f(0.38, 0.24, 0.32);
  }

  let yClamped = clamp(max(rd.y, 0.0), 0.0, 1.0);
  var sky = mix(skyHoriz, skyMid, smoothstep(0.0, 0.22, yClamped));
  sky = mix(sky, skyZenith, smoothstep(0.16, 0.65, yClamped));
  let sunDot = max(dot(rd, sunDir), 0.0);
  sky += sunCol * pow(sunDot, 10.0) * 0.32;
  sky += sunCol * pow(sunDot, 140.0) * 1.10;
  sky += vec3f(1.0, 0.96, 0.86) * smoothstep(0.9988, 0.9997, sunDot) * 2.2;

  // High-altitude sunlit cirrus wisps.
  if (rd.y > 0.015) {
    let cu = rd.xz / (rd.y + 0.20) * 0.52 + vec2f(time * 0.010, -time * 0.006);
    let cw = sin(cu.x * 2.2 + 1.2 * cos(cu.y * 1.8)) * cos(cu.y * 2.5 - cu.x * 1.0)
      + 0.42 * sin(cu.x * 4.8 - cu.y * 4.3);
    let cm = smoothstep(0.32, 0.96, cw) * smoothstep(0.015, 0.20, rd.y) * (1.0 - smoothstep(0.34, 0.72, rd.y));
    let ccol = mix(skyHoriz * 0.85, sunCol * 0.88, pow(sunDot, 2.0));
    sky = mix(sky, ccol, cm * 0.38);
  }

  var color = sky;

  // 3D Terrain Raymarching with conservative stepping + 5-step binary bisection (zero banding!).
  var t = 0.8;
  var prevT = 0.8;
  var hit = false;
  var maxDist = 42.0;

  for (var i = 0; i < 64; i++) {
    let q = camPos + rd * t;
    var h = 0.0;
    if (scene == 0) {
      // Smooth sculpted Sahara dunes with sharp wind crests & gentle micro-ripples.
      let w = q.x * 0.36 + 0.85 * sin(q.z * 0.22);
      let d1 = 1.0 - abs(sin(w + 0.30 * cos(q.z * 0.31)));
      let d2 = 1.0 - abs(sin(q.z * 0.28 - 0.50 * sin(q.x * 0.26 + 0.6)));
      let rip = 0.007 * sin(q.x * 16.0 + q.z * 9.0 + 1.2 * sin(q.z * 2.4));
      h = 1.22 * pow(d1, 1.35) + 0.58 * pow(d2, 1.55) + rip - 0.52;
    } else if (scene == 1) {
      // Dramatic steep Nordic fjord mountains flanking a mirror-calm central water channel.
      let ch = smoothstep(1.6, 5.2, abs(q.x + 0.9 * sin(q.z * 0.14)));
      let r1 = 1.0 - abs(sin(q.x * 0.42 + 0.55 * cos(q.z * 0.27)));
      let r2 = 0.5 + 0.5 * cos(q.z * 0.34 - 0.45 * sin(q.x * 0.52));
      let crag = 0.16 * (0.5 + 0.5 * sin(q.x * 1.4 + q.z * 1.1));
      h = ch * (3.15 * pow(r1, 1.4) * (0.45 + 0.65 * r2) + crag) - 0.14;
    } else {
      // Swiss Alpine massif rising cleanly above a undulating cloud sea at y = 1.05.
      let ch = smoothstep(0.8, 5.4, abs(q.x - 0.45 * sin(q.z * 0.18))) * 0.72 + 0.28;
      let r1 = 1.0 - abs(sin(q.x * 0.34 + 0.48 * sin(q.z * 0.23)));
      let r2 = 0.5 + 0.5 * cos(q.z * 0.29 + 0.42 * cos(q.x * 0.38));
      let spire = pow(1.0 - abs(sin(q.x * 0.62 - q.z * 0.48)), 2.4) * 0.92;
      h = ch * (2.65 * pow(r1, 1.3) * (0.42 + 0.68 * r2) + spire) - 0.12;
    }

    let diff = q.y - h;
    if (diff < 0.0) {
      hit = true;
      break;
    }
    prevT = t;
    t += clamp(diff * 0.34, 0.08, 0.85);
    if (t > maxDist) {
      break;
    }
  }

  // Exact 5-step binary bisection between prevT (above) and t (below) -> razor-smooth silhouettes!
  if (hit) {
    var lo = prevT;
    var hi = t;
    for (var b = 0; b < 5; b++) {
      let mid = 0.5 * (lo + hi);
      let q = camPos + rd * mid;
      var h = 0.0;
      if (scene == 0) {
        let w = q.x * 0.36 + 0.85 * sin(q.z * 0.22);
        let d1 = 1.0 - abs(sin(w + 0.30 * cos(q.z * 0.31)));
        let d2 = 1.0 - abs(sin(q.z * 0.28 - 0.50 * sin(q.x * 0.26 + 0.6)));
        let rip = 0.007 * sin(q.x * 16.0 + q.z * 9.0 + 1.2 * sin(q.z * 2.4));
        h = 1.22 * pow(d1, 1.35) + 0.58 * pow(d2, 1.55) + rip - 0.52;
      } else if (scene == 1) {
        let ch = smoothstep(1.6, 5.2, abs(q.x + 0.9 * sin(q.z * 0.14)));
        let r1 = 1.0 - abs(sin(q.x * 0.42 + 0.55 * cos(q.z * 0.27)));
        let r2 = 0.5 + 0.5 * cos(q.z * 0.34 - 0.45 * sin(q.x * 0.52));
        let crag = 0.16 * (0.5 + 0.5 * sin(q.x * 1.4 + q.z * 1.1));
        h = ch * (3.15 * pow(r1, 1.4) * (0.45 + 0.65 * r2) + crag) - 0.14;
      } else {
        let ch = smoothstep(0.8, 5.4, abs(q.x - 0.45 * sin(q.z * 0.18))) * 0.72 + 0.28;
        let r1 = 1.0 - abs(sin(q.x * 0.34 + 0.48 * sin(q.z * 0.23)));
        let r2 = 0.5 + 0.5 * cos(q.z * 0.29 + 0.42 * cos(q.x * 0.38));
        let spire = pow(1.0 - abs(sin(q.x * 0.62 - q.z * 0.48)), 2.4) * 0.92;
        h = ch * (2.65 * pow(r1, 1.3) * (0.42 + 0.68 * r2) + spire) - 0.12;
      }
      if (q.y < h) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    t = 0.5 * (lo + hi);
  }

  let hitPos = camPos + rd * t;

  // Analytic fjord water (scene 1) or sculpted sea of clouds (scene 2).
  var hitWater = false;
  var waterT = maxDist + 1.0;
  let planeY = select(0.0, 1.02, scene == 2);
  if (scene >= 1 && rd.y < -0.001) {
    let wt = (planeY - camPos.y) / rd.y;
    if (wt > 0.2 && wt < maxDist && (!hit || wt < t)) {
      hitWater = true;
      waterT = wt;
    }
  }

  if (hitWater && scene == 1) {
    let wp = camPos + rd * waterT;
    let r1 = sin(wp.x * 5.8 + wp.z * 3.6 + time * 1.2) * 0.015;
    let r2 = cos(wp.x * 11.5 - wp.z * 8.2 - time * 1.6) * 0.010;
    let r3 = sin(wp.x * 23.0 + wp.z * 19.0 + time * 2.1) * 0.005;
    let wN = normalize(vec3f(r1 + r2 * 0.7 + r3, 1.0, r2 - r1 * 0.6));
    let refl = reflect(rd, wN);
    let fresnel = 0.06 + 0.94 * pow(1.0 - max(dot(-rd, wN), 0.0), 4.0);

    let rY = clamp(max(refl.y, 0.0), 0.0, 1.0);
    var reflCol = mix(skyHoriz * 0.85, skyZenith * 0.9, smoothstep(0.0, 0.35, rY));
    let rSun = max(dot(refl, sunDir), 0.0);
    reflCol += sunCol * pow(rSun, 22.0) * 0.85 + sunCol * pow(rSun, 220.0) * 3.2;

    let deepSea = vec3f(0.015, 0.045, 0.085);
    let surf = mix(deepSea, reflCol, fresnel);
    let fogAmt = 1.0 - exp(-waterT * 0.036);
    color = mix(surf, fogCol, fogAmt * 0.72);
  } else if (hitWater && scene == 2) {
    // Richly sculpted sunlit sea of clouds with warm coral tops & cool twilight troughs.
    let cpw = camPos + rd * waterT;
    let b1 = sin(cpw.x * 0.72 + time * 0.12 + 1.1 * cos(cpw.z * 0.58 - time * 0.08)) * cos(cpw.z * 0.82 - cpw.x * 0.38);
    let b2 = sin(cpw.x * 1.9 - cpw.z * 1.6 + time * 0.18) * 0.45;
    let crest = smoothstep(-0.6, 0.85, b1 + b2);
    let troughCol = vec3f(0.16, 0.16, 0.28);
    let peakCol = vec3f(0.95, 0.60, 0.54);
    let cloudCol = mix(troughCol, peakCol, crest);
    let fogAmt = 1.0 - exp(-waterT * 0.032);
    color = mix(cloudCol, fogCol, fogAmt * 0.65);
  } else if (hit) {
    let e = 0.025;
    let qx = hitPos + vec3f(e, 0.0, 0.0);
    let qz = hitPos + vec3f(0.0, 0.0, e);
    var hC = hitPos.y;
    var hX = 0.0;
    var hZ = 0.0;

    if (scene == 0) {
      let wx = qx.x * 0.36 + 0.85 * sin(qx.z * 0.22);
      hX = 1.22 * pow(1.0 - abs(sin(wx + 0.30 * cos(qx.z * 0.31))), 1.35)
        + 0.58 * pow(1.0 - abs(sin(qx.z * 0.28 - 0.50 * sin(qx.x * 0.26 + 0.6))), 1.55)
        + 0.007 * sin(qx.x * 16.0 + qx.z * 9.0 + 1.2 * sin(qx.z * 2.4)) - 0.52;
      let wz = qz.x * 0.36 + 0.85 * sin(qz.z * 0.22);
      hZ = 1.22 * pow(1.0 - abs(sin(wz + 0.30 * cos(qz.z * 0.31))), 1.35)
        + 0.58 * pow(1.0 - abs(sin(qz.z * 0.28 - 0.50 * sin(qz.x * 0.26 + 0.6))), 1.55)
        + 0.007 * sin(qz.x * 16.0 + qz.z * 9.0 + 1.2 * sin(qz.z * 2.4)) - 0.52;
    } else if (scene == 1) {
      let cx = smoothstep(1.6, 5.2, abs(qx.x + 0.9 * sin(qx.z * 0.14)));
      hX = cx * (3.15 * pow(1.0 - abs(sin(qx.x * 0.42 + 0.55 * cos(qx.z * 0.27))), 1.4)
        * (0.45 + 0.65 * (0.5 + 0.5 * cos(qx.z * 0.34 - 0.45 * sin(qx.x * 0.52)))) + 0.16 * (0.5 + 0.5 * sin(qx.x * 1.4 + qx.z * 1.1))) - 0.14;
      let cz = smoothstep(1.6, 5.2, abs(qz.x + 0.9 * sin(qz.z * 0.14)));
      hZ = cz * (3.15 * pow(1.0 - abs(sin(qz.x * 0.42 + 0.55 * cos(qz.z * 0.27))), 1.4)
        * (0.45 + 0.65 * (0.5 + 0.5 * cos(qz.z * 0.34 - 0.45 * sin(qz.x * 0.52)))) + 0.16 * (0.5 + 0.5 * sin(qz.x * 1.4 + qz.z * 1.1))) - 0.14;
    } else {
      let bx = smoothstep(0.8, 5.4, abs(qx.x - 0.45 * sin(qx.z * 0.18))) * 0.72 + 0.28;
      hX = bx * (2.65 * pow(1.0 - abs(sin(qx.x * 0.34 + 0.48 * sin(qx.z * 0.23))), 1.3)
        * (0.42 + 0.68 * (0.5 + 0.5 * cos(qx.z * 0.29 + 0.42 * cos(qx.x * 0.38))))
        + pow(1.0 - abs(sin(qx.x * 0.62 - qx.z * 0.48)), 2.4) * 0.92) - 0.12;
      let bz = smoothstep(0.8, 5.4, abs(qz.x - 0.45 * sin(qz.z * 0.18))) * 0.72 + 0.28;
      hZ = bz * (2.65 * pow(1.0 - abs(sin(qz.x * 0.34 + 0.48 * sin(qz.z * 0.23))), 1.3)
        * (0.42 + 0.68 * (0.5 + 0.5 * cos(qz.z * 0.29 + 0.42 * cos(qz.x * 0.38))))
        + pow(1.0 - abs(sin(qz.x * 0.62 - qz.z * 0.48)), 2.4) * 0.92) - 0.12;
    }

    let N = normalize(vec3f(hC - hX, e, hC - hZ));
    let ndotl = max(dot(N, sunDir), 0.0);
    let hemi = 0.5 + 0.5 * N.y;

    var albedo = vec3f(0.82, 0.44, 0.22);
    var shadowTint = vec3f(0.08, 0.07, 0.16);

    if (scene == 0) {
      let glint = pow(max(dot(reflect(-sunDir, N), -rd), 0.0), 28.0) * 0.35;
      albedo = vec3f(0.86, 0.45, 0.21) + vec3f(0.28, 0.16, 0.06) * glint;
      shadowTint = vec3f(0.07, 0.06, 0.15);
    } else if (scene == 1) {
      let snow = smoothstep(1.15, 2.0, hitPos.y) * smoothstep(0.55, 0.80, N.y);
      albedo = mix(vec3f(0.06, 0.08, 0.11), vec3f(0.84, 0.86, 0.92), snow);
      shadowTint = vec3f(0.05, 0.09, 0.16);
    } else {
      let snow = smoothstep(1.30, 1.95, hitPos.y) * smoothstep(0.40, 0.70, N.y);
      albedo = mix(vec3f(0.11, 0.12, 0.17), vec3f(0.95, 0.88, 0.88), snow);
      shadowTint = vec3f(0.09, 0.11, 0.24);
    }

    let lit = albedo * (shadowTint * (0.60 + 0.55 * hemi) + sunCol * ndotl * 1.25);
    let fogAmt = 1.0 - exp(-t * select(0.042, 0.032, scene == 1));
    color = mix(lit, fogCol, fogAmt * 0.82);
  }

  let vig = 1.0 - 0.26 * dot(ndc * vec2f(0.45, 0.65), ndc * vec2f(0.45, 0.65));
  color *= vig;

  // ACES Filmic tone mapping -> linear light output for the compositor.
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e2 = 0.14;
  let mapped = clamp((color * (a * color + b)) / (color * (c * color + d) + e2), vec3f(0.0), vec3f(1.0));
  return vec4f(mapped, 1.0);
