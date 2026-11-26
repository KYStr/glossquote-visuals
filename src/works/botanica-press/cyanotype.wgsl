  // Museum-grade botanical cyanotype contact-printing frame under sunlit UV exposure.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // Full 10-second photochemical UV exposure cycle for ALL three specimens.
  let cyc = fract(time * 0.1) * 10.0;
  let rise = smoothstep(0.0, 3.8, cyc);
  let reset = 1.0 - smoothstep(8.6, 9.9, cyc);
  let exposure = rise * reset;
  let sunPos = mix(-0.95, 0.95, smoothstep(0.0, 4.6, cyc));

  var specimen = 0;
  if (preset >= 0.0) {
    specimen = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
  }

  // Deep smoked-walnut darkroom bench with directional window light falloff.
  let woodGrain = 0.5 + 0.5 * sin(p.y * 110.0 + 2.4 * sin(p.x * 9.0) + 0.8 * cos(p.y * 28.0));
  let benchLight = 1.08 - 0.34 * length(p - vec2f(-0.22, -0.18));
  var color = vec3f(0.145, 0.125, 0.112) * (0.86 + 0.12 * woodGrain) * clamp(benchLight, 0.58, 1.15);

  // Heavy 300 gsm cold-press cotton rag sheet bounds + soft deckle edge.
  let deckle = 0.0022 * sin(p.y * 74.0 + 0.6) * cos(p.x * 63.0);
  let paperHalf = vec2f(0.595, 0.415);
  let paperDist = max(abs(p.x) - paperHalf.x, abs(p.y) - paperHalf.y) + deckle;
  let paperMask = 1.0 - smoothstep(-feather, feather, paperDist);

  // Soft realistic cast shadow beneath the cotton sheet & contact glass.
  let sp = p - vec2f(0.016, 0.022);
  let shadowDist = max(abs(sp.x) - paperHalf.x, abs(sp.y) - paperHalf.y);
  let sheetShadow = exp(-max(shadowDist, 0.0) * 28.0) * smoothstep(0.10, -0.01, shadowDist);
  color *= 1.0 - 0.52 * sheetShadow;

  // Cold-press cotton rag paper fiber & subtle warm archival tone.
  let cellA = floor(p * 240.0);
  let cellB = floor(p * 95.0);
  let fiberFine = fract(sin(dot(cellA, vec2f(127.1, 311.7))) * 43758.5453);
  let fiberTooth = fract(sin(dot(cellB, vec2f(269.5, 183.3))) * 43758.5453);
  let paperBase = vec3f(0.962, 0.948, 0.916)
    - vec3f(0.020, 0.018, 0.016) * fiberFine
    - vec3f(0.014, 0.013, 0.011) * fiberTooth;

  // Organic hake-brush hand-coated cyanotype wash (soft dry-brush feathered edges).
  let strokeX = 0.014 * sin(p.y * 19.0 + 0.4) + 0.006 * sin(p.y * 68.0) + 0.003 * cos(p.y * 145.0);
  let strokeY = 0.009 * cos(p.x * 16.0 - 0.5) + 0.004 * sin(p.x * 54.0);
  let coatDistX = abs(p.x) - (0.505 + strokeX);
  let coatDistY = abs(p.y) - (0.335 + strokeY);
  let coatDist = max(coatDistX, coatDistY);
  let brushHair = 0.5 + 0.5 * sin(p.y * 190.0 + 1.8 * sin(p.x * 14.0));
  let coatMask = (1.0 - smoothstep(-0.014, 0.016, coatDist)) * (1.0 - 0.16 * brushHair * smoothstep(-0.045, 0.012, coatDist));

  // Botanical specimen silhouettes & translucent vein transmission (0 = Ginkgo, 1 = Fern, 2 = Eucalyptus).
  var leafMask = 0.0;
  var veinMask = 0.0;

  if (specimen == 0) {
    // Ginkgo Biloba: museum archival bilobed fan blade, dichotomous veins & curved petiole.
    let g = p - vec2f(0.0, 0.15);
    let gr = length(g);
    let ga = atan2(-g.y, g.x) - 1.5707963;
    let fanSpan = 0.98 - 0.06 * smoothstep(0.0, 0.35, gr);
    let sideDist = (abs(ga) - fanSpan) * max(gr, 0.02);
    let inAngle = 1.0 - smoothstep(-feather, feather, sideDist);
    let cleft = 0.145 * exp(-ga * ga * 44.0);
    let wave = 0.012 * sin(ga * 13.0 + 0.3) + 0.006 * cos(ga * 29.0 - 0.5);
    let outerEdge = 0.445 - cleft + wave;
    let blade = inAngle * (1.0 - smoothstep(-feather, feather, gr - outerEdge)) * smoothstep(0.0, 0.012, -g.y + 0.008);
    let stemCurve = 0.036 * sin((p.y - 0.15) * 6.5);
    let stemW = mix(0.007, 0.009, smoothstep(0.14, 0.32, p.y));
    let stemMask = (1.0 - smoothstep(stemW - 0.002, stemW + 0.002, abs(p.x - stemCurve)))
      * smoothstep(0.11, 0.14, p.y) * (1.0 - smoothstep(0.325, 0.34, p.y));
    leafMask = max(blade, stemMask);
    let primaryVeins = pow(0.5 + 0.5 * cos(ga * 44.0), 10.0) * smoothstep(0.04, 0.38, gr);
    let fineVeins = pow(0.5 + 0.5 * cos(ga * 88.0 + 0.4), 12.0) * smoothstep(0.18, 0.41, gr);
    veinMask = blade * clamp(primaryVeins * 0.85 + fineVeins * 0.5, 0.0, 1.0);
  } else if (specimen == 1) {
    // Maidenhair Fern (Adiantum): arching dark stipe + alternating scalloped fan pinnules.
    let curveX = 0.075 * sin(p.y * 4.2 + 0.45);
    let fx = p.x - curveX;
    let fy = p.y;
    let stem = (1.0 - smoothstep(0.0032, 0.0062, abs(fx)))
      * smoothstep(-0.315, -0.295, fy) * (1.0 - smoothstep(0.31, 0.33, fy));
    let env = clamp(1.0 - abs(fy + 0.03) * 2.2, 0.24, 1.0) * smoothstep(-0.31, -0.22, fy) * (1.0 - smoothstep(0.24, 0.31, fy));
    let side = select(-1.0, 1.0, fx >= 0.0);
    let row = fy * 13.5 + select(0.0, 0.45, side > 0.0);
    let cellY = fract(row) - 0.5;
    let armLen = 0.24 * env;
    let lx = (abs(fx) - 0.012) / max(armLen, 0.02);
    let ly = (cellY + lx * 0.28) * 1.95;
    // Fan-shaped scalloped pinnule silhouette.
    let fanR = length(vec2f((lx - 0.44) * 1.65, ly * 0.92));
    let fanAng = atan2(ly, max(lx, 0.001));
    let scallop = 0.065 * sin(fanAng * 9.0);
    let pinnaDist = fanR - (0.76 + scallop);
    let pinnae = (1.0 - smoothstep(-0.07, 0.07, pinnaDist))
      * smoothstep(0.0, 0.06, lx) * smoothstep(-0.30, -0.26, fy) * (1.0 - smoothstep(0.27, 0.305, fy));
    // Hair-thin petiolule connecting rachis to pinnule.
    let twig = (1.0 - smoothstep(0.0025, 0.005, abs(cellY + lx * 0.28) / 13.5))
      * smoothstep(0.0, 0.02, abs(fx)) * (1.0 - smoothstep(0.18, 0.35, lx)) * smoothstep(-0.29, -0.25, fy) * (1.0 - smoothstep(0.26, 0.29, fy));
    leafMask = max(max(stem, pinnae), twig);
    veinMask = pinnae * (pow(0.5 + 0.5 * cos(fanAng * 18.0), 8.0) * 0.7 + (1.0 - smoothstep(0.0, 0.14, abs(ly))) * 0.5);
  } else {
    // Eucalyptus Sprig: slender S-curved branch with 7 alternating lance-ovate leaves & midribs.
    let curveX = 0.048 * sin(p.y * 5.0 - 0.25);
    let ex = p.x - curveX;
    let ey = p.y;
    let stem = (1.0 - smoothstep(0.0042, 0.0074, abs(ex)))
      * smoothstep(-0.31, -0.29, ey) * (1.0 - smoothstep(0.31, 0.33, ey));
    let yNodes = array<f32, 7>(-0.23, -0.15, -0.07, 0.01, 0.09, 0.17, 0.24);
    let sides = array<f32, 7>(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, -1.0);
    let lengths = array<f32, 7>(0.115, 0.138, 0.155, 0.162, 0.152, 0.136, 0.110);
    var leaves = 0.0;
    var midribs = 0.0;
    for (var i = 0; i < 7; i++) {
      let cy = yNodes[i];
      let s = sides[i];
      let L = lengths[i];
      let ang = s * 0.62;
      let ca = cos(ang);
      let sa = sin(ang);
      let d = vec2f(ex - s * 0.008, ey - cy);
      // Local leaf axes: u along leaf length away from stem, v across blade width.
      let u = (d.x * s) * ca - d.y * sa;
      let v = (d.x * s) * sa + d.y * ca;
      let un = u / L;
      // Tapered lance-ovate profile (pointed tip, graceful rounded base).
      let halfW = 0.36 * L * sin(clamp(un, 0.0, 1.0) * 3.14159265) * (1.0 - 0.22 * un);
      let inU = smoothstep(0.0, 0.06, un) * (1.0 - smoothstep(0.94, 1.02, un));
      let bladeM = (1.0 - smoothstep(-feather, feather, abs(v) - halfW)) * inU;
      let ribM = bladeM * (1.0 - smoothstep(0.002, 0.006, abs(v)));
      let lateral = bladeM * pow(0.5 + 0.5 * cos((u * 48.0 - abs(v) * 65.0)), 10.0) * 0.55;
      leaves = max(leaves, bladeM);
      midribs = max(midribs, max(ribM, lateral));
    }
    // Terminal apical leaf neatly framed inside the Prussian wash.
    let tipD = vec2f(ex, ey + 0.235);
    let tipU = (-tipD.y) / 0.072;
    let tipW = 0.025 * sin(clamp(tipU, 0.0, 1.0) * 3.14159265);
    let tipLeaf = (1.0 - smoothstep(-feather, feather, abs(tipD.x) - tipW)) * smoothstep(0.0, 0.08, tipU) * (1.0 - smoothstep(0.92, 1.02, tipU));
    leafMask = max(max(stem, leaves), tipLeaf);
    veinMask = midribs;
  }

  // UV photochemical oxidation gradient driven by moving sunlight sweep.
  let diag = p.x * 0.72 + p.y * 0.52;
  let localUV = clamp(exposure * 1.28 - (diag - sunPos) * 0.42, 0.0, 1.0);
  // Ferric chartreuse-gold -> mineral cyan -> deep archival Prussian indigo with granulation.
  let gran = 0.92 + 0.10 * sin(p.x * 24.0 + p.y * 19.0) * cos(p.x * 13.0 - p.y * 27.0) + 0.04 * fiberTooth;
  let unexposed = vec3f(0.83, 0.84, 0.61);
  let midTone = vec3f(0.14, 0.41, 0.49);
  let prussian = vec3f(0.045, 0.155, 0.315) * gran;
  var emulsion = mix(unexposed, midTone, smoothstep(0.0, 0.46, localUV));
  emulsion = mix(emulsion, prussian, smoothstep(0.32, 1.0, localUV));

  // Masked specimen preserves warm cotton-white with delicate cyan-blue translucent vein bleed.
  let printTone = mix(emulsion, paperBase + vec3f(0.012, 0.012, 0.014), leafMask * 0.94);
  let veinedPrint = mix(printTone, mix(paperBase, midTone, 0.36), veinMask * 0.52);

  var sheetCol = mix(paperBase, veinedPrint, coatMask);

  // Subtle diagonal sunlight sheen & bevelled archival glass contact-frame glint.
  let sunBand = exp(-pow(diag - sunPos, 2.0) * 16.0) * 0.13;
  let glassBevel = exp(-abs(paperDist + 0.015) * 160.0) * 0.24 * paperMask;
  sheetCol += vec3f(1.0, 0.96, 0.86) * (sunBand + glassBevel);

  color = mix(color, sheetCol, paperMask);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
