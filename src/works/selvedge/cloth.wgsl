
  // The transform and yarn centerlines stay constant throughout the light cycle.
  let u = uv.x - 0.5;
  let v = uv.y - 0.5;
  let x = u + 0.12 * v;
  let y = v + 0.16 * u - 0.055 * u * u;
  let g = vec2f((x + 0.47) * 54.0, (y + 0.355) * 55.0);
  let col = floor(g.x + 0.5);
  let row = floor(g.y + 0.5);
  let seed = fract(sin(col * 23.71 + 14.02) * 314.17);
  let seedY = fract(sin(row * 18.31 + 21.12) * 215.37);
  let warp = g.x - col - 0.052 * sin(1.38 * g.y + seed * 6.28);
  let weft = g.y - row - 0.040 * sin(1.63 * g.x + seedY * 6.28);
  let phase = 0.5 - 0.5 * cos(fract(time) * 6.2831853);
  let lightDist = abs(uv.x - uv.y * 0.58 - mix(-0.12, 0.76, phase));
  let beam = exp(-31.0 * lightDist * lightDist);
  let lightSide = smoothstep(-0.06, 0.06, (uv.x - uv.y * 0.58) - mix(-0.12, 0.76, phase));
  let grain = 0.5 * sin(291.0 * uv.x + 193.0 * uv.y) * sin(233.0 * uv.y - 102.0 * uv.x);
  var paper = vec3f(0.91, 0.85, 0.76) + vec3f(0.023 * grain + 0.047 * beam);
  let end = 37.6 + 0.49 * sin(0.21 * col) + 0.31 * sin(0.9 * col);
  let edge = max(max(-g.x, g.x - 50.0), max(-g.y, g.y - end));
  let pixel = vec2f(1.0) / max(viewport, vec2f(1.0));
  let warpFootprint = 54.0 * (pixel.x + 0.12 * pixel.y);
  let weftFootprint = 55.0 * (pixel.y + abs(0.16 - 0.11 * u) * pixel.x);
  let aa = clamp(max(warpFootprint, weftFootprint) * 0.60, 0.015, 0.24);
  paper *= 1.0 - 0.23 * (1.0 - smoothstep(-0.6, 1.50, edge)) * (0.86 + 0.14 * beam);
  let cloth = 1.0 - smoothstep(-aa, aa, edge);
  let warpCover = 1.0 - smoothstep(0.395 - aa, 0.395 + aa, abs(warp));
  let weftCover = 1.0 - smoothstep(0.420 - aa, 0.420 + aa, abs(weft));
  let warpRound = sqrt(max(0.0, 1.0 - pow(clamp(abs(warp) / 0.45, 0.0, 1.0), 2.0)));
  let weftRound = sqrt(max(0.0, 1.0 - pow(clamp(abs(weft) / 0.46, 0.0, 1.0), 2.0)));

  // A cell records which yarn lies on top. Negative indices are normalized
  // before applying the draft, including at the first and last warp threads.
  let twillIndex = col - row;
  let satinIndex = col - 2.0 * row;
  let warpTop = select(
    select(col + row - 2.0 * floor((col + row) / 2.0) == 0.0,
      twillIndex - 4.0 * floor(twillIndex / 4.0) < 2.0, pattern == 1.0),
    satinIndex - 5.0 * floor(satinIndex / 5.0) != 0.0, pattern == 2.0);
  let warpDye = select(vec3f(0.47, 0.178, 0.169), vec3f(0.67, 0.46, 0.39), seed > 0.83);
  let weftDye = mix(vec3f(0.48, 0.28, 0.22), vec3f(0.79, 0.65, 0.49), 0.56 + 0.41 * seedY);
  let warpTwist = sin(warp * 16.0 + g.y * 8.4) * min(1.0, 0.05 / aa);
  let weftTwist = sin(weft * 18.0 - g.x * 9.4) * min(1.0, 0.05 / aa);
  let warpShade = (0.47 + 0.49 * warpRound + 0.12 * seed + 0.045 * warpTwist
    + 0.43 * beam * max(0.0, warpRound + 1.39 * warp * (lightSide - 0.73)));
  let weftShade = (0.45 + 0.42 * weftRound + 0.10 * seedY + 0.048 * weftTwist
    + 0.36 * beam * max(0.0, weftRound - 1.60 * weft));
  let warpColor = warpDye * warpShade;
  let weftColor = weftDye * weftShade;
  let recessed = vec3f(0.23, 0.105, 0.095) * (0.66 + 0.22 * beam);
  let warpLayer = mix(mix(recessed, weftColor * 0.72, weftCover), warpColor, warpCover);
  let weftLayer = mix(mix(recessed, warpColor * 0.72, warpCover), weftColor, weftCover);
  let woven = select(weftLayer, warpLayer, warpTop);
  let bound = smoothstep(47.7, 48.2, g.x) * (1.0 - smoothstep(49.65, 50.05, g.x));
  var color = mix(paper, woven * mix(vec3f(1.0), vec3f(0.85, 0.63, 0.58), bound), cloth);

  // A short irregular fringe extends the actual warp, with longer loose ends
  // in the middle and separate, lower-contrast shadows offset onto the backing.
  let fringeLength = 0.30 + 1.16 * seed + select(0.0, 2.1 + 4.3 * seed, col == 15.0 || col == 27.0 || col == 37.0);
  let dy = g.y - end;
  let hanging = warp - sin(dy * 0.76 + seed * 3.6) * min(0.35, dy * 0.16);
  let fringe = smoothstep(-aa, aa, dy) * (1.0 - smoothstep(fringeLength - aa, fringeLength + aa, dy));
  let valid = select(0.0, 1.0, col >= 0.0 && col <= 50.0);
  let shadow = 1.0 - smoothstep(0.06, 0.59, abs(hanging - 0.27 - 0.14 * beam));
  let strand = 1.0 - smoothstep(0.17 - aa, 0.19 + aa, abs(hanging));
  color *= 1.0 - 0.25 * valid * fringe * shadow;
  color = mix(color, warpDye * (0.56 + 0.56 * beam + 0.48 * (1.0 - abs(hanging))), valid * fringe * strand);
  let fiberSpread = clamp(dy / max(fringeLength, 0.3), 0.0, 1.0);
  let fiberOffset = 0.15 + 0.21 * fiberSpread * (0.35 + 0.65 * seed);
  let fine = 1.0 - smoothstep(0.018, 0.035 + aa, abs(abs(hanging + 0.05 * sin(g.y * 3.0)) - fiberOffset));
  let fuzz = fringe * fine * smoothstep(0.03, 0.35, dy);
  color = mix(color, warpDye * (0.76 + 0.74 * beam), 0.53 * valid * fuzz);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
