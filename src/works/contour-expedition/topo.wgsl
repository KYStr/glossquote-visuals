  // Illuminated Swiss topographic relief map with progressive trekking route.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second route progress & drifting alpine sun azimuth.
  let cyc = fract(time * 0.1);
  let routeProgress = smoothstep(0.05, 0.78, cyc);
  var region = 0;
  if (preset >= 0.0) {
    region = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  } else {
    region = i32(floor(fract(time / 12.0) * 3.0));
  }

  // Elevation field + finite-difference gradient for 3D Swiss hillshading.
  let eps = 0.004;
  // Evaluate height at (x, y), (x+eps, y), (x, y+eps).
  var h0 = 0.0;
  var hx = 0.0;
  var hy = 0.0;

  let p0 = p;
  let px = p + vec2f(eps, 0.0);
  let py = p + vec2f(0.0, eps);

  if (region == 0) {
    // Mont Blanc Massif: broad twin glaciated domes & sweeping ridge.
    h0 = 0.92 * exp(-dot((p0 - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1), (p0 - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1)))
      + 0.62 * exp(-dot((p0 - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2), (p0 - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2)))
      + 0.10 * sin(p0.x * 7.5 + p0.y * 4.2) * cos(p0.y * 6.5 - p0.x * 3.1)
      + 0.04 * sin(p0.x * 16.0 - p0.y * 14.0);
    hx = 0.92 * exp(-dot((px - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1), (px - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1)))
      + 0.62 * exp(-dot((px - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2), (px - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2)))
      + 0.10 * sin(px.x * 7.5 + px.y * 4.2) * cos(px.y * 6.5 - px.x * 3.1)
      + 0.04 * sin(px.x * 16.0 - px.y * 14.0);
    hy = 0.92 * exp(-dot((py - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1), (py - vec2f(0.08, -0.06)) * vec2f(1.6, 2.1)))
      + 0.62 * exp(-dot((py - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2), (py - vec2f(-0.28, 0.10)) * vec2f(2.1, 2.2)))
      + 0.10 * sin(py.x * 7.5 + py.y * 4.2) * cos(py.y * 6.5 - py.x * 3.1)
      + 0.04 * sin(py.x * 16.0 - py.y * 14.0);
  } else if (region == 1) {
    // Japan Northern Alps: sharp diagonal Yari-Hotaka spine.
    let s0 = p0.y + 0.42 * p0.x;
    let sx = px.y + 0.42 * px.x;
    let sy = py.y + 0.42 * py.x;
    h0 = 0.88 * exp(-s0 * s0 * 14.0) * exp(-p0.x * p0.x * 2.2)
      + 0.35 * exp(-length(p0 - vec2f(0.24, -0.10)) * 4.8)
      + 0.09 * sin(p0.x * 10.0 - p0.y * 8.0) * cos(p0.y * 9.0)
      + 0.045 * cos(p0.x * 18.0 + p0.y * 15.0);
    hx = 0.88 * exp(-sx * sx * 14.0) * exp(-px.x * px.x * 2.2)
      + 0.35 * exp(-length(px - vec2f(0.24, -0.10)) * 4.8)
      + 0.09 * sin(px.x * 10.0 - px.y * 8.0) * cos(px.y * 9.0)
      + 0.045 * cos(px.x * 18.0 + px.y * 15.0);
    hy = 0.88 * exp(-sy * sy * 14.0) * exp(-py.x * py.x * 2.2)
      + 0.35 * exp(-length(py - vec2f(0.24, -0.10)) * 4.8)
      + 0.09 * sin(py.x * 10.0 - py.y * 8.0) * cos(py.y * 9.0)
      + 0.045 * cos(py.x * 18.0 + py.y * 15.0);
  } else {
    // Patagonia Fitz Roy: dramatic granite spire + glacial cirque.
    h0 = 0.98 * exp(-length(p0 - vec2f(0.12, -0.05)) * 3.4)
      + 0.56 * exp(-length(p0 - vec2f(-0.24, -0.14)) * 4.1)
      + 0.11 * sin(p0.x * 9.0 + p0.y * 7.0) * cos(p0.x * 5.0 - p0.y * 11.0);
    hx = 0.98 * exp(-length(px - vec2f(0.12, -0.05)) * 3.4)
      + 0.56 * exp(-length(px - vec2f(-0.24, -0.14)) * 4.1)
      + 0.11 * sin(px.x * 9.0 + px.y * 7.0) * cos(px.x * 5.0 - px.y * 11.0);
    hy = 0.98 * exp(-length(py - vec2f(0.12, -0.05)) * 3.4)
      + 0.56 * exp(-length(py - vec2f(-0.24, -0.14)) * 4.1)
      + 0.11 * sin(py.x * 9.0 + py.y * 7.0) * cos(py.x * 5.0 - py.y * 11.0);
  }

  let grad = vec2f((hx - h0) / eps, (hy - h0) / eps);
  let N = normalize(vec3f(-grad.x * 0.42, -grad.y * 0.42, 1.0));
  let sunAngle = -2.35 + 0.45 * sin(time * 0.42);
  let L = normalize(vec3f(cos(sunAngle) * 0.78, sin(sunAngle) * 0.78, 0.62));
  let shade = clamp(dot(N, L), 0.0, 1.0);

  // Hypsometric alpine map tints: pine valley -> stone scree -> alpine snowfield.
  let valleyCol = select(vec3f(0.81, 0.84, 0.78), vec3f(0.76, 0.82, 0.83), region == 2);
  let rockCol = vec3f(0.86, 0.84, 0.79);
  let snowCol = vec3f(0.96, 0.97, 0.98);
  var terrain = mix(valleyCol, rockCol, smoothstep(0.22, 0.55, h0));
  terrain = mix(terrain, snowCol, smoothstep(0.62, 0.86, h0));
  // Swiss oblique hillshade: cool blue-slate shadows, warm sunlight slopes.
  let hillTint = mix(vec3f(0.68, 0.74, 0.78), vec3f(1.04, 1.01, 0.95), shade);
  var color = terrain * hillTint;

  // Precision topographic contour lines (minor + bold 5th index contours).
  let slopeMag = max(length(grad), 0.35);
  let minorPhase = abs(fract(h0 * 18.0 + 0.5) - 0.5) / (slopeMag * 0.045);
  let majorPhase = abs(fract(h0 * 3.6 + 0.5) - 0.5) / (slopeMag * 0.011);
  let minorLine = 1.0 - smoothstep(0.18, 0.48, minorPhase);
  let majorLine = 1.0 - smoothstep(0.16, 0.44, majorPhase);
  let contourCol = mix(vec3f(0.45, 0.38, 0.30), vec3f(0.26, 0.44, 0.58), smoothstep(0.66, 0.82, h0));
  color = mix(color, contourCol, clamp(minorLine * 0.32 + majorLine * 0.62, 0.0, 0.78));

  // Fine UTM coordinate grid & map border ticks.
  let utm = max(
    1.0 - smoothstep(0.0, 0.0022, abs(fract(p.x * 3.5 + 0.5) - 0.5)),
    1.0 - smoothstep(0.0, 0.0022, abs(fract(p.y * 3.5 + 0.5) - 0.5))
  );
  color = mix(color, vec3f(0.22, 0.28, 0.25), utm * 0.14);

  // Progressive signal-orange expedition route from basecamp (-0.42, 0.22) to summit (0.10, -0.06).
  let tParam = clamp((p.x + 0.42) / 0.52, 0.0, 1.0);
  let pathY = mix(0.22, -0.06, tParam) - 0.075 * sin(tParam * 3.14159265) + 0.025 * sin(tParam * 9.42);
  let pathDist = abs(p.y - pathY);
  let inSpan = step(-0.42, p.x) * step(p.x, 0.10);
  let revealed = 1.0 - smoothstep(routeProgress - 0.02, routeProgress + 0.02, tParam);
  let plannedDash = smoothstep(0.2, 0.5, sin(tParam * 52.0));

  let orange = vec3f(0.84, 0.31, 0.11);
  // Faint dashed future route ahead of active progress.
  let futureLine = (1.0 - smoothstep(0.003, 0.0055, pathDist)) * inSpan * plannedDash * (1.0 - revealed);
  color = mix(color, vec3f(0.22, 0.25, 0.22), futureLine * 0.45);
  // Solid vivid signal-orange active trekking trail.
  let activeLine = (1.0 - smoothstep(0.0045, 0.0085, pathDist)) * inSpan * revealed;
  color = mix(color, orange, activeLine);

  // Basecamp circle & summit triangle cairn markers.
  let baseD = length(p - vec2f(-0.42, 0.22));
  let baseRing = (1.0 - smoothstep(0.015, 0.019, baseD)) * smoothstep(0.007, 0.010, baseD);
  color = mix(color, vec3f(0.11, 0.17, 0.15), baseRing);

  let sumP = p - vec2f(0.10, -0.06);
  let triD = max(abs(sumP.x) * 0.866 + sumP.y * 0.5, -sumP.y) - 0.016;
  let summitMark = 1.0 - smoothstep(-feather, feather, triD);
  color = mix(color, orange, summitMark);

  // Pulsing live expedition waypoint dot at the leading tip of the route.
  let tipX = mix(-0.42, 0.10, routeProgress);
  let tipY = mix(0.22, -0.06, routeProgress) - 0.075 * sin(routeProgress * 3.14159265) + 0.025 * sin(routeProgress * 9.42);
  let tipD = length(p - vec2f(tipX, tipY));
  let tipHalo = exp(-tipD * 34.0) * 0.45;
  let tipDot = 1.0 - smoothstep(0.010, 0.014, tipD);
  color += orange * tipHalo;
  color = mix(color, vec3f(1.0, 0.98, 0.95), tipDot);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
