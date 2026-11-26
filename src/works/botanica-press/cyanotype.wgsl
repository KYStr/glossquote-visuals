  // Botanical cyanotype contact-printing frame under sunlit UV exposure.
  // Coordinates centered on the cotton rag plate, aspect-corrected.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0);
  let feather = 1.6 / max(180.0, viewport.y);

  // 10-second UV exposure cycle when preset < 0.
  let cyc = fract(time * 0.1) * 10.0;
  var specimen = 0;
  var exposure = 1.0;
  var sunPos = 0.0;

  if (preset < 0.0) {
    let rise = smoothstep(0.0, 3.6, cyc);
    let reset = 1.0 - smoothstep(8.6, 9.9, cyc);
    exposure = rise * reset;
    sunPos = mix(-0.95, 0.95, smoothstep(0.0, 4.2, cyc));
    specimen = 0;
  } else {
    specimen = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
    exposure = 0.92 + 0.08 * (0.5 + 0.5 * sin(time * 0.6283185));
    sunPos = 0.35 * sin(time * 0.5);
  }

  // Sunlit oak worktable surround outside the cotton paper sheet.
  let grain = 0.5 + 0.5 * sin(p.x * 16.0 + 2.0 * sin(p.y * 5.0)) * cos(p.y * 52.0);
  var color = vec3f(0.84, 0.77, 0.67) * (0.94 + 0.05 * grain - 0.08 * length(p));

  // Heavy bevelled glass & 300 gsm cotton rag paper sheet bounds.
  let paperHalf = vec2f(0.60, 0.42);
  let paperDist = max(abs(p.x) - paperHalf.x, abs(p.y) - paperHalf.y);
  let paperMask = 1.0 - smoothstep(-feather, feather, paperDist);

  // Cast shadow under the cotton paper & glass frame.
  let sp = p - vec2f(0.018, 0.022);
  let shadowDist = max(abs(sp.x) - paperHalf.x, abs(sp.y) - paperHalf.y);
  let sheetShadow = exp(-max(shadowDist, 0.0) * 32.0) * smoothstep(0.08, -0.01, shadowDist);
  color *= 1.0 - 0.24 * sheetShadow;

  // Cotton rag paper fiber texture.
  let fiber = fract(sin(dot(floor(p * 260.0), vec2f(127.1, 311.7))) * 43758.5453);
  let paperBase = vec3f(0.965, 0.952, 0.922) - vec3f(0.022, 0.020, 0.018) * fiber;

  // Hand-brushed cyanotype emulsion coating boundary (subtle dry-brush bristle streaks).
  let bristleX = 0.008 * sin(p.y * 85.0) + 0.006 * cos(p.y * 210.0 + 1.1) + 0.005 * sin(p.y * 19.0);
  let bristleY = 0.006 * cos(p.x * 72.0 + 0.5) + 0.004 * sin(p.x * 165.0) + 0.004 * cos(p.x * 16.0);
  let brushEdgeX = 0.515 + bristleX;
  let brushEdgeY = 0.345 + bristleY;
  let coatDist = max(abs(p.x) - brushEdgeX, abs(p.y) - brushEdgeY);
  let coatMask = 1.0 - smoothstep(-0.005, 0.006, coatDist);

  // Botanical specimen silhouettes & translucent vein transmission (0 = Ginkgo, 1 = Fern, 2 = Eucalyptus).
  var leafMask = 0.0;
  var veinMask = 0.0;

  if (specimen == 0) {
    // Ginkgo Biloba: crisp fan-shaped bilobed blade + radiating veins + curved petiole.
    let g = p - vec2f(0.0, 0.14);
    let gr = length(g);
    let ga = atan2(-g.y, g.x) - 1.5707963; // 0 = straight up
    let fanSpan = 0.96;
    let sideDist = (abs(ga) - fanSpan) * max(gr, 0.02);
    let inAngle = 1.0 - smoothstep(-feather, feather, sideDist);
    let cleft = 0.14 * exp(-ga * ga * 42.0);
    let scallop = 0.014 * sin(ga * 14.0) + 0.007 * cos(ga * 27.0);
    let outerEdge = 0.44 - cleft + scallop;
    let blade = inAngle * (1.0 - smoothstep(-feather, feather, gr - outerEdge)) * smoothstep(0.0, 0.012, -g.y + 0.008);
    // Slender curved stem seamlessly joined to the fan base.
    let stemCurve = 0.04 * sin((p.y - 0.14) * 7.0);
    let stemMask = (1.0 - smoothstep(0.007, 0.011, abs(p.x - stemCurve)))
      * smoothstep(0.11, 0.135, p.y) * (1.0 - smoothstep(0.32, 0.34, p.y));
    leafMask = max(blade, stemMask);
    // Dichotomous radiating veins inside blade.
    veinMask = blade * pow(0.5 + 0.5 * cos(ga * 46.0), 8.0) * smoothstep(0.05, 0.36, gr);
  } else if (specimen == 1) {
    // Maidenhair Fern frond: arching central rachis + alternating paired pinnae.
    let curveX = 0.08 * sin(p.y * 4.5 + 0.4);
    let fx = p.x - curveX;
    let fy = p.y;
    let stem = (1.0 - smoothstep(0.0045, 0.008, abs(fx)))
      * smoothstep(-0.31, -0.29, fy) * (1.0 - smoothstep(0.31, 0.33, fy));
    // Periodic paired leaflets tapering toward the frond tip.
    let taper = clamp(1.0 - (fy + 0.30) * 1.15, 0.18, 1.0) * smoothstep(0.30, 0.18, fy);
    let side = select(-1.0, 1.0, fx >= 0.0);
    let yOff = fy * 15.0 + select(0.0, 0.5, side > 0.0);
    let cellY = fract(yOff) - 0.5;
    let leafLen = 0.25 * taper;
    let localX = (abs(fx) - 0.015) / max(leafLen, 0.02);
    let localY = (cellY + localX * 0.22) * 2.1;
    let pinnaDist = length(vec2f((localX - 0.5) * 1.9, localY)) - 0.82;
    let pinnae = (1.0 - smoothstep(-0.08, 0.08, pinnaDist))
      * smoothstep(0.0, 0.05, localX) * smoothstep(-0.31, -0.26, fy) * (1.0 - smoothstep(0.27, 0.31, fy));
    leafMask = max(stem, pinnae);
    veinMask = pinnae * (1.0 - smoothstep(0.0, 0.14, abs(localY)));
  } else {
    // Eucalyptus Sprig: gracefully curved branch with opposite silver-dollar leaves.
    let curveX = 0.055 * sin(p.y * 5.2 - 0.3);
    let ex = p.x - curveX;
    let ey = p.y;
    let stem = (1.0 - smoothstep(0.0055, 0.009, abs(ex)))
      * smoothstep(-0.32, -0.30, ey) * (1.0 - smoothstep(0.31, 0.33, ey));
    // 4 opposite pairs of rounded leaves along the stem.
    let ySteps = array<f32, 4>(-0.20, -0.07, 0.07, 0.20);
    let sizes = array<f32, 4>(0.058, 0.076, 0.084, 0.072);
    var leaves = 0.0;
    var midribs = 0.0;
    for (var i = 0; i < 4; i++) {
      let cy = ySteps[i];
      let rad = sizes[i];
      let dL = length((vec2f(ex, ey) - vec2f(-rad * 1.15, cy - 0.015)) * vec2f(0.95, 1.12)) - rad;
      let dR = length((vec2f(ex, ey) - vec2f(rad * 1.15, cy + 0.015)) * vec2f(0.95, 1.12)) - rad;
      let mL = 1.0 - smoothstep(-feather, feather, dL);
      let mR = 1.0 - smoothstep(-feather, feather, dR);
      leaves = max(leaves, max(mL, mR));
      midribs = max(midribs, (mL + mR) * (1.0 - smoothstep(0.0, 0.008, abs(ey - cy))));
    }
    leafMask = max(stem, leaves);
    veinMask = midribs;
  }

  // UV photochemical oxidation gradient driven by moving sunlight sweep.
  let diag = p.x * 0.72 + p.y * 0.52;
  let localUV = clamp(exposure * 1.25 - (diag - sunPos) * 0.38, 0.0, 1.0);
  // Ferric yellow-green -> cyan teal -> deep archival Prussian blue.
  let unexposed = vec3f(0.84, 0.85, 0.62);
  let midTone = vec3f(0.18, 0.44, 0.50);
  let prussian = vec3f(0.068, 0.195, 0.365) * (0.94 + 0.08 * sin(p.x * 22.0 + p.y * 17.0));
  var emulsion = mix(unexposed, midTone, smoothstep(0.0, 0.48, localUV));
  emulsion = mix(emulsion, prussian, smoothstep(0.35, 1.0, localUV));

  // Masked leaf stays cotton-white with delicate cyan-blue translucent bleed along veins.
  let printTone = mix(emulsion, paperBase + vec3f(0.01, 0.01, 0.015), leafMask * 0.92);
  let veinedPrint = mix(printTone, mix(paperBase, midTone, 0.34), veinMask * 0.48);

  var sheetCol = mix(paperBase, veinedPrint, coatMask);

  // Diagonal warm UV sunbeam highlight + bevelled glass edge glint.
  let sunBand = exp(-pow(diag - sunPos, 2.0) * 14.0) * 0.14;
  let glassBevel = exp(-abs(paperDist + 0.016) * 140.0) * 0.28 * paperMask;
  sheetCol += vec3f(1.0, 0.96, 0.84) * (sunBand + glassBevel);

  color = mix(color, sheetCol, paperMask);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
