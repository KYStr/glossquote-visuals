  // One six-second stroke, then take up one pick. Advancing the draft row
  // index when take-up wraps keeps every previously woven intersection intact.
  let stroke = time + 0.235;
  let pick = floor(stroke);
  let beat = fract(stroke);
  let reverse = pick - 2.0 * floor(pick * 0.5) >= 1.0;
  let advance = smoothstep(0.04, 0.62, beat);
  let takeup = smoothstep(0.76, 0.98, beat);
  let px = uv.x - 0.5;
  let py = uv.y - 0.5;
  let gx = uv.x * 18.7 + 1.15 * py - 0.70;
  let gy = uv.y * 12.3 + 2.4 * px - 0.78 + takeup;
  let col = floor(gx + 0.5);
  let row = min(floor(gy + 0.5), 6.0);
  let draft = row + pick;
  let seam = gy - 6.0;
  let along = select(gx, 17.0 - gx, reverse);
  let head = mix(-1.40, 18.45, advance);
  let ahead = along - head;
  let nose = 1.0 - smoothstep(0.08, 0.95, abs(ahead + 0.16));
  let joined = 1.0 - smoothstep(-0.16, 0.14, ahead);
  // Beat the suspended pick back into the fell once the shuttle clears.
  let suspended = 1.0 - smoothstep(0.60, 0.73, beat);
  let pickDrop = suspended * (0.84 + 0.24 * nose);
  let twill = pattern == 1.0;
  let satin = pattern == 2.0;
  let diagonal = col - draft;
  let node = col - 2.0 * draft;
  let warpTop = select(
    select(col + draft - 2.0 * floor((col + draft) * 0.5) == 0.0,
      diagonal - 4.0 * floor(diagonal * 0.25) < 2.0, twill),
    node - 5.0 * floor(node * 0.2) != 0.0, satin);
  let activeRow = 6.0 + pick;
  let shedDiagonal = col - activeRow;
  let shedNode = col - 2.0 * activeRow;
  let raised = select(
    select(col + activeRow - 2.0 * floor((col + activeRow) * 0.5) == 0.0,
      shedDiagonal - 4.0 * floor(shedDiagonal * 0.25) < 2.0, twill),
    shedNode - 5.0 * floor(shedNode * 0.2) != 0.0, satin);
  let aroundShuttle = 0.50 + 0.50 * (1.0 - smoothstep(0.45, 3.35, abs(ahead)));
  let open = smoothstep(-0.34, 0.48, seam)
    * (1.0 - smoothstep(2.15, 4.1, seam))
    * smoothstep(0.02, 0.13, beat) * suspended * aroundShuttle;
  let split = select(-1.0, 1.0, raised);
  let warpX = gx - col - split * open * 0.24 - 0.032 * sin(2.5 * (gy + pick) + col * 2.17);
  let weftY = gy - row - 0.030 * sin(2.65 * gx + draft * 2.1)
    - select(0.0, pickDrop, row == 6.0);
  let laid = select(joined, 1.0, row < 6.0);
  let warpPress = (1.0 - smoothstep(0.05, 0.37, abs(gy - row))) * laid
    * select(1.0 - suspended, 1.0, row < 6.0);
  let weftPress = 1.0 - smoothstep(0.03, 0.35, abs(gx - col));
  // The warp and weft flatten against one another at the crossing; frayed
  // plies give each edge a shallow, spatially fixed irregularity.
  let aa = clamp(11.2 / max(viewport.y, 1.0), 0.014, 0.105);
  let edgeDetail = 1.0 - smoothstep(0.027, 0.085, aa);
  let napW = 0.0090 * sin(35.0 * (gy + pick) + 1.7 * col) * edgeDetail;
  let napF = 0.0075 * sin(39.0 * gx + 1.9 * draft) * edgeDetail;
  let warpWidth = select(select(0.365, 0.43, twill), 0.46, satin)
    * (1.0 - 0.32 * open) * (1.0 + 0.080 * warpPress) + napW;
  let weftBase = select(0.39, 0.34, satin) * (1.0 + 0.072 * weftPress) + napF;
  let tipTaper = 1.0 - 0.42 * smoothstep(-0.42, 0.14, ahead);
  let shuttleWidth = mix(weftBase, (weftBase + 0.14 + 0.07 * nose) * tipTaper, suspended);
  let weftWidth = select(weftBase, shuttleWidth, row == 6.0);
  let wx = warpX / warpWidth;
  let wy = weftY / weftWidth;
  let wu = wx * wx;
  let wv = wy * wy;
  let warpRound = sqrt(max(0.0, 1.0 - wu * (0.54 + 0.46 * wu)));
  let weftRound = sqrt(max(0.0, 1.0 - wv * (0.54 + 0.46 * wv)));
  let softEdge = aa + 0.024;
  let warpCover = 1.0 - smoothstep(warpWidth - softEdge, warpWidth + softEdge, abs(warpX));
  let weftCover = (1.0 - smoothstep(weftWidth - softEdge, weftWidth + softEdge, abs(weftY))) * laid;

  let warpDye = select(select(vec3f(0.57, 0.18, 0.16), vec3f(0.24, 0.37, 0.28), twill),
    vec3f(0.30, 0.23, 0.43), satin);
  let weftDye = select(select(vec3f(0.91, 0.73, 0.53), vec3f(0.75, 0.69, 0.48), twill),
    vec3f(0.71, 0.52, 0.33), satin);
  let accent = select(select(vec3f(0.99, 0.56, 0.27), vec3f(1.0, 0.32, 0.105), twill),
    vec3f(1.0, 0.49, 0.24), satin);
  let tracer = draft - 5.0 * floor(draft * 0.2) == 1.0;
  let beam = uv.x + 0.70 * uv.y - (0.99 + 0.065 * cos(6.2831853 * (beat - 0.235)));
  let light = 0.60 + 0.40 * exp(-4.5 * beam * beam);
  let ridgeCenter = gx - gy - pick - 0.44;
  let ridgeHighlight = 0.5 + 0.5 * cos(1.5707963 * ridgeCenter);
  let centralRidge = gx - gy + takeup - 4.44;
  let ridge = select(1.0, (0.73 + 0.38 * smoothstep(0.04, 0.85, ridgeHighlight))
    * (0.93 + 0.17 * exp(-0.085 * centralRidge * centralRidge)), twill);
  let warpTwist = gy + pick;
  let plyW = 47.0 * warpX + 5.2 * warpTwist + 0.71 * col + 0.55 * sin(3.0 * warpTwist + col);
  let plyF = 52.0 * weftY - 5.0 * gx + 0.62 * draft + 0.55 * sin(3.1 * gx - draft);
  let fibreWarp = (0.053 * sin(plyW) + 0.020 * sin(plyW * 1.82 + warpTwist) * edgeDetail) * edgeDetail;
  let fibreWeft = (0.058 * sin(plyF) + 0.021 * sin(plyF * 1.77 - gx) * edgeDetail) * edgeDetail;
  let laidEdge = seam + (1.0 - joined);
  let fade = smoothstep(1.0, 5.7, laidEdge);
  let warpShade = (0.34 + warpRound * 0.57 - 0.11 * wx * warpRound + fibreWarp - 0.057 * warpPress)
    * light * ridge * (1.0 + 0.42 * split * open);
  let weftShade = (0.34 + weftRound * 0.59 - 0.08 * wy * weftRound + fibreWeft - 0.045 * weftPress)
    * light * ridge;
  let sheen = select(0.026, 0.145, satin) * warpRound * warpRound * light;
  let warpColor = warpDye * warpShade + vec3f(sheen * (1.0 - 0.5 * open));
  let weftColor = mix(weftDye, accent, select(0.0, 0.88, tracer) + select(0.0, 0.12 * nose * suspended, row == 6.0))
    * weftShade;
  let yEdge = smoothstep(0.2, 1.4, laidEdge);
  let xEdge = smoothstep(-0.53, -0.36, gx) * (1.0 - smoothstep(17.33, 17.58, gx));
  let paper = vec3f(0.86, 0.80, 0.70) * (0.89 + 0.10 * light + 0.026 * sin(11.0 * px - 8.0 * py));
  let recess = vec3f(0.11, 0.085, 0.064) * (0.8 + 0.2 * light);
  let ground = mix(recess, paper, yEdge);
  let warpLayer = mix(mix(ground, weftColor * (1.0 - 0.59 * warpCover), weftCover), warpColor, warpCover);
  let weftLayer = mix(mix(ground, warpColor * (1.0 - 0.40 * weftCover), warpCover), weftColor, weftCover);
  let woven = select(weftLayer, warpLayer, warpTop);
  let looseThread = mix(paper * (1.0 - 0.20 * warpCover), warpColor, warpCover * 0.95);
  let visiblePick = select(0.0, suspended * weftCover, row == 6.0);
  let art = mix(woven, looseThread, yEdge * (1.0 - visiblePick));
  let falloff = (1.0 - 0.82 * fade) * xEdge;

  // The authored colors and CPU stills are sRGB. The Shaders compositor
  // applies the output transfer curve, so hand it linear light here.
  let rgb = clamp(mix(paper, art, falloff), vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
