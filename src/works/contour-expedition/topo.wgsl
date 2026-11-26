  // Swiss Imhof-style topographic relief cartography with route-aligned expedition telemetry.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second route progress & drifting alpine sun azimuth.
  let cyc = fract(time * 0.1);
  let routeProgress = smoothstep(0.04, 0.78, cyc);
  var region = 0;
  if (preset >= 0.0) {
    region = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    region = i32(floor(fract(time / 12.0) * 3.0));
  }

  // Multi-octave alpine ridge elevation field + finite-difference gradient for Imhof hillshading.
  let eps = 0.0038;
  var h0 = 0.0;
  var hx = 0.0;
  var hy = 0.0;

  let p0 = p;
  let px = p + vec2f(eps, 0.0);
  let py = p + vec2f(0.0, eps);

  // Smooth organic multi-directional alpine relief harmonics (no straight crease artifacts).
  let r0a = sin(p0.x * 6.8 + 1.15 * sin(p0.y * 5.2)) * cos(p0.y * 7.2 - 0.95 * cos(p0.x * 4.8));
  let r0b = sin(p0.x * 14.5 - p0.y * 11.5 + 0.8 * cos(p0.x * 9.0)) * cos(p0.y * 13.0 + p0.x * 8.5);
  let rxa = sin(px.x * 6.8 + 1.15 * sin(px.y * 5.2)) * cos(px.y * 7.2 - 0.95 * cos(px.x * 4.8));
  let rxb = sin(px.x * 14.5 - px.y * 11.5 + 0.8 * cos(px.x * 9.0)) * cos(px.y * 13.0 + px.x * 8.5);
  let rya = sin(py.x * 6.8 + 1.15 * sin(py.y * 5.2)) * cos(py.y * 7.2 - 0.95 * cos(py.x * 4.8));
  let ryb = sin(py.x * 14.5 - py.y * 11.5 + 0.8 * cos(py.x * 9.0)) * cos(py.y * 13.0 + py.x * 8.5);

  if (region == 0) {
    // Mont Blanc Massif: twin glaciated domes & sculpted granite arêtes.
    let m0 = 0.88 * exp(-dot((p0 - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05), (p0 - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05)))
      + 0.60 * exp(-dot((p0 - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15), (p0 - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15)));
    let mx = 0.88 * exp(-dot((px - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05), (px - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05)))
      + 0.60 * exp(-dot((px - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15), (px - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15)));
    let my = 0.88 * exp(-dot((py - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05), (py - vec2f(0.08, -0.06)) * vec2f(1.55, 2.05)))
      + 0.60 * exp(-dot((py - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15), (py - vec2f(-0.28, 0.10)) * vec2f(2.05, 2.15)));
    h0 = m0 + (0.095 * r0a + 0.036 * r0b) * (0.40 + 0.60 * m0);
    hx = mx + (0.095 * rxa + 0.036 * rxb) * (0.40 + 0.60 * mx);
    hy = my + (0.095 * rya + 0.036 * ryb) * (0.40 + 0.60 * my);
  } else if (region == 1) {
    // Japan Northern Alps: sharp NW-to-SE Yari-Hotaka spine.
    let s0 = p0.y - 0.42 * p0.x;
    let sx = px.y - 0.42 * px.x;
    let sy = py.y - 0.42 * py.x;
    let m0 = 0.86 * exp(-s0 * s0 * 14.5) * exp(-p0.x * p0.x * 1.9)
      + 0.38 * exp(-length(p0 - vec2f(0.32, 0.14)) * 4.5);
    let mx = 0.86 * exp(-sx * sx * 14.5) * exp(-px.x * px.x * 1.9)
      + 0.38 * exp(-length(px - vec2f(0.32, 0.14)) * 4.5);
    let my = 0.86 * exp(-sy * sy * 14.5) * exp(-py.x * py.x * 1.9)
      + 0.38 * exp(-length(py - vec2f(0.32, 0.14)) * 4.5);
    h0 = m0 + (0.092 * r0a + 0.038 * r0b) * (0.35 + 0.65 * m0);
    hx = mx + (0.092 * rxa + 0.038 * rxb) * (0.35 + 0.65 * mx);
    hy = my + (0.092 * rya + 0.038 * ryb) * (0.35 + 0.65 * my);
  } else {
    // Patagonia Fitz Roy: dramatic granite spire & glacial cirque.
    let m0 = 0.95 * exp(-length(p0 - vec2f(0.12, -0.05)) * 3.3)
      + 0.56 * exp(-length(p0 - vec2f(-0.24, -0.14)) * 4.0);
    let mx = 0.95 * exp(-length(px - vec2f(0.12, -0.05)) * 3.3)
      + 0.56 * exp(-length(px - vec2f(-0.24, -0.14)) * 4.0);
    let my = 0.95 * exp(-length(py - vec2f(0.12, -0.05)) * 3.3)
      + 0.56 * exp(-length(py - vec2f(-0.24, -0.14)) * 4.0);
    h0 = m0 + (0.098 * r0a + 0.038 * r0b) * (0.35 + 0.65 * m0);
    hx = mx + (0.098 * rxa + 0.038 * rxb) * (0.35 + 0.65 * mx);
    hy = my + (0.098 * rya + 0.038 * ryb) * (0.35 + 0.65 * my);
  }

  let grad = vec2f((hx - h0) / eps, (hy - h0) / eps);
  let N = normalize(vec3f(-grad.x * 0.55, -grad.y * 0.55, 1.0));
  let sunAngle = -2.35 + 0.35 * sin(time * 0.38);
  let L = normalize(vec3f(cos(sunAngle) * 0.82, sin(sunAngle) * 0.82, 0.58));
  let shade = clamp(dot(N, L), 0.0, 1.0);

  // Classic Swiss Imhof hypsometric palette: alpine moss-slate -> limestone scree -> glacial snow.
  let valleyCol = select(vec3f(0.76, 0.80, 0.75), vec3f(0.72, 0.79, 0.81), region == 2);
  let rockCol = vec3f(0.84, 0.82, 0.77);
  let snowCol = vec3f(0.965, 0.975, 0.985);
  var terrain = mix(valleyCol, rockCol, smoothstep(0.24, 0.56, h0));
  terrain = mix(terrain, snowCol, smoothstep(0.64, 0.86, h0));
  // Imhof oblique relief shading: cool glacial-slate shadow, crisp ivory-gold sunlight.
  let hillTint = mix(vec3f(0.58, 0.66, 0.74), vec3f(1.06, 1.02, 0.94), smoothstep(0.08, 0.92, shade));
  var color = terrain * hillTint;

  // Precision engraved topographic contour lines (minor + bold 5th index contours).
  let slopeMag = max(length(grad), 0.38);
  let minorPhase = abs(fract(h0 * 19.0 + 0.5) - 0.5) / (slopeMag * 0.042);
  let majorPhase = abs(fract(h0 * 3.8 + 0.5) - 0.5) / (slopeMag * 0.011);
  let minorLine = 1.0 - smoothstep(0.16, 0.44, minorPhase);
  let majorLine = 1.0 - smoothstep(0.14, 0.40, majorPhase);
  let contourCol = mix(vec3f(0.42, 0.35, 0.28), vec3f(0.22, 0.43, 0.58), smoothstep(0.66, 0.84, h0));
  color = mix(color, contourCol, clamp(minorLine * 0.28 + majorLine * 0.58, 0.0, 0.74));

  // Fine UTM coordinate grid & cartographic neatline border.
  let utm = max(
    1.0 - smoothstep(0.0, 0.002, abs(fract(p.x * 3.5 + 0.5) - 0.5)),
    1.0 - smoothstep(0.0, 0.002, abs(fract(p.y * 3.5 + 0.5) - 0.5))
  );
  color = mix(color, vec3f(0.16, 0.22, 0.20), utm * 0.13);
  let borderD = max(abs(p.x) - (aspect * 0.475), abs(p.y) - 0.455);
  let neatline = 1.0 - smoothstep(0.001, 0.003, abs(borderD));
  color = mix(color, vec3f(0.15, 0.20, 0.18), neatline * 0.42);

  // Region-specific expedition route, basecamp, and arrival-aligned summit chevron.
  var startPt = vec2f(-0.44, 0.24);
  var endPt = vec2f(0.08, -0.06);
  var arcAmp = -0.085;
  var wiggleAmp = 0.012;
  var wiggleFreq = 6.283185;
  if (region == 1) {
    startPt = vec2f(-0.46, -0.20);
    endPt = vec2f(0.36, 0.15);
    arcAmp = 0.055;
    wiggleAmp = 0.012;
    wiggleFreq = 6.283185;
  } else if (region == 2) {
    startPt = vec2f(0.48, 0.26);
    endPt = vec2f(0.12, -0.05);
    arcAmp = 0.105;
    wiggleAmp = 0.010;
    wiggleFreq = 6.283185;
  }

  let spanX = endPt.x - startPt.x;
  let tParam = clamp((p.x - startPt.x) / spanX, 0.0, 1.0);
  let pathY = mix(startPt.y, endPt.y, tParam)
    + arcAmp * sin(tParam * 3.14159265)
    + wiggleAmp * sin(tParam * wiggleFreq);
  let pathDist = abs(p.y - pathY);
  let minX = min(startPt.x, endPt.x);
  let maxX = max(startPt.x, endPt.x);
  let inSpan = step(minX, p.x) * step(p.x, maxX);
  let revealed = 1.0 - smoothstep(routeProgress - 0.018, routeProgress + 0.018, tParam);
  let plannedDash = smoothstep(0.25, 0.55, sin(tParam * 54.0));

  let vermilion = vec3f(0.79, 0.24, 0.09);
  let inkDark = vec3f(0.09, 0.13, 0.12);

  // Subtle light casing under active trail for crisp Swiss map legibility.
  let trailCasing = (1.0 - smoothstep(0.007, 0.011, pathDist)) * inSpan * revealed;
  color = mix(color, vec3f(0.98, 0.97, 0.94), trailCasing * 0.55);

  // Faint dashed future route ahead of active progress.
  let futureLine = (1.0 - smoothstep(0.0025, 0.0048, pathDist)) * inSpan * plannedDash * (1.0 - revealed);
  color = mix(color, inkDark, futureLine * 0.42);

  // Solid vivid vermilion active trekking trail.
  let activeLine = (1.0 - smoothstep(0.0038, 0.0072, pathDist)) * inSpan * revealed;
  color = mix(color, vermilion, activeLine);

  // Basecamp survey ring marker.
  let baseD = length(p - startPt);
  let baseFill = 1.0 - smoothstep(0.007, 0.010, baseD);
  let baseRing = (1.0 - smoothstep(0.015, 0.019, baseD)) * smoothstep(0.009, 0.012, baseD);
  color = mix(color, vec3f(0.98, 0.97, 0.94), baseFill * 0.92);
  color = mix(color, inkDark, baseRing);

  // Route-aligned directional summit chevron pointing strictly along arrival tangent (t = 1).
  let dtx = spanX;
  let dty = (endPt.y - startPt.y) - arcAmp * 3.14159265 + wiggleAmp * wiggleFreq * cos(wiggleFreq);
  let fwd = normalize(vec2f(dtx, dty));
  let right = vec2f(-fwd.y, fwd.x);
  let sumP = p - endPt;
  let lu = dot(sumP, fwd);
  let lv = dot(sumP, right);
  // Crisp tapered arrow head centered on endPt, pointing toward +fwd.
  let tipU = lu - 0.014;
  let arrowSide = abs(lv) + tipU * 0.62;
  let arrowBack = -(lu + 0.018);
  let arrowNotch = (lu + 0.012) - abs(lv) * 0.38;
  let arrowD = max(max(arrowSide, arrowBack), -arrowNotch);
  let arrowHalo = 1.0 - smoothstep(0.002, 0.007, arrowD);
  let arrowFill = 1.0 - smoothstep(-feather, feather, arrowD);
  color = mix(color, vec3f(0.98, 0.97, 0.94), arrowHalo * 0.85);
  color = mix(color, vermilion, arrowFill);

  // Moving expedition waypoint dot that cleanly fades out BEFORE reaching the summit arrow.
  let tipFade = smoothstep(0.0, 0.05, routeProgress) * (1.0 - smoothstep(0.84, 0.96, routeProgress));
  let tipX = mix(startPt.x, endPt.x, routeProgress);
  let tipY = mix(startPt.y, endPt.y, routeProgress)
    + arcAmp * sin(routeProgress * 3.14159265)
    + wiggleAmp * sin(routeProgress * wiggleFreq);
  let tipD = length(p - vec2f(tipX, tipY));
  let tipRing = (1.0 - smoothstep(0.012, 0.016, tipD)) * tipFade;
  let tipDot = (1.0 - smoothstep(0.006, 0.009, tipD)) * tipFade;
  color = mix(color, vermilion, tipRing * 0.88);
  color = mix(color, vec3f(0.99, 0.98, 0.96), tipDot);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
