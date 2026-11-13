  let carrier = 1.0 - echoMix - dawnMix;
  let turn = 6.2831853 * fract(time);
  let axes = vec2f(mix(0.482, 0.326, wide), mix(0.486, 0.435, wide));
  let origin = vec2f(mix(0.50, 0.692, wide), mix(0.52, 0.56, wide));
  let xy = (uv - origin) / axes;
  let px = floor(uv * viewport);
  let x = xy.x - 0.17 * xy.y;
  let y = xy.y + 0.27 * xy.x;
  let underglow = exp(-dot(xy * vec2f(1.27, 1.37), xy * vec2f(1.27, 1.37)) * 1.70);
  let hash = fract(px * vec2f(0.1031, 0.11369));
  let grain = fract((hash.x + hash.y) * (hash.x + 13.13) * (hash.y + 19.19));
  let fog = carrier * vec3f(0.020, 0.015, 0.034) + echoMix * vec3f(0.019, 0.014, 0.079) + dawnMix * vec3f(0.048, 0.012, 0.034);
  let background = vec3f(0.0052, 0.0056, 0.0145) + fog * underglow + 0.0015 * grain * underglow;

  if (abs(x) > 1.04 || abs(y) > 1.30) {
    return vec4f(background, 1.0);
  }

  let swell = sin(3.2 * x - turn);
  let localBend = sin(2.9 * x + 0.5 * cos(turn));
  let bend = (0.25 * carrier - 0.13 * echoMix + 0.14 * dawnMix) * localBend
    + (0.10 * carrier + 0.21 * echoMix + 0.065 * dawnMix) * swell;
  let waist = 0.71 + 0.28 * cos(x * 1.4 - 0.20);
  let opening = (carrier * 0.16 + dawnMix * 0.57) * x;
  let radius = (0.53 + 0.045 * cos(turn - x * 4.0) + opening) * waist;
  let thinRadius = max(0.095, radius * (0.84 + 0.15 * cos(2.0 * x + turn)));
  let dy = (y - bend) / thinRadius;
  let core = sqrt(max(0.0, 1.0 - dy * dy));
  let shellEdge = 1.0 - smoothstep(0.986, 1.014, abs(dy));
  let tip = 1.0 - smoothstep(0.95, 1.027, abs(x));

  let twist = (4.1 * carrier + 6.2 * echoMix + 2.8 * dawnMix) * x
    + turn + (0.46 * carrier + 0.25 * echoMix + 0.71 * dawnMix) * sin(x * 4.2 - turn);
  let widthA = 0.91 * carrier + 0.56 * echoMix + 0.44 * dawnMix;
  let widthB = 0.24 * carrier + 0.52 * echoMix + 0.36 * dawnMix;
  let widthC = 0.31 * dawnMix;
  let phaseB = 1.83 + 1.23 * echoMix;
  let phaseC = -1.28 - 0.40 * x;

  var color = background;
  let indigo = carrier * vec3f(0.073, 0.029, 0.145) + echoMix * vec3f(0.074, 0.036, 0.40) + dawnMix * vec3f(0.20, 0.018, 0.078);
  let enamel = carrier * vec3f(0.61, 0.26, 0.054) + echoMix * vec3f(0.19, 0.15, 0.62) + dawnMix * vec3f(0.67, 0.15, 0.16);
  let highlight = carrier * vec3f(1.00, 0.79, 0.34) + echoMix * vec3f(0.53, 0.81, 0.99) + dawnMix * vec3f(1.00, 0.57, 0.32);

  if (shellEdge > 0.0) {
    // The orthographic ray meets the cylinder twice. Paint the rear intersection first,
    // then the nearer intersection only where that surface contains a ribbon.
    for (var face = 0; face < 2; face++) {
      let front = f32(face);
      let z = core * (front * 2.0 - 1.0);
      let theta = atan2(dy, z);
      let roll = theta - twist;
      let distanceA = abs(fract((roll + 3.14159265) / 6.2831853) * 6.2831853 - 3.14159265);
      let distanceB = abs(fract((roll + phaseB + 3.14159265) / 6.2831853) * 6.2831853 - 3.14159265);
      let distanceC = abs(fract((roll + phaseC + 3.14159265) / 6.2831853) * 6.2831853 - 3.14159265);
      let stripA = 1.0 - smoothstep(widthA - 0.02, widthA + 0.02, distanceA);
      let stripB = 1.0 - smoothstep(widthB - 0.02, widthB + 0.02, distanceB);
      let stripC = dawnMix * (1.0 - smoothstep(widthC - 0.02, widthC + 0.02, distanceC));
      let shell = max(stripA, max(stripB, stripC)) * shellEdge * tip;
      let rim = max(stripA * smoothstep(widthA - 0.14, widthA, distanceA),
        max(stripB * smoothstep(widthB - 0.11, widthB, distanceB), stripC * smoothstep(widthC - 0.10, widthC, distanceC)));

      // Anisotropic foil follows the winding angle. A bounded packet travels along
      // the same surface, so highlights and occlusion stay attached to the sculpture.
      let lightDot = max(0.0, dot(vec2f(dy, z), normalize(vec2f(-0.64, 0.76))));
      let packet = pow(0.5 + 0.5 * cos(x * (3.1 + 2.9 * echoMix) - turn + 0.65 * theta), 6.0);
      let streak = pow(max(0.0, cos(theta + 0.83 + 0.27 * sin(x * 5.0 - turn))), 22.0);
      let rib = pow(0.5 + 0.5 * cos(roll * 48.0 + sin(x * 12.0) * 1.8), 12.0);
      let machining = 0.89 + 0.10 * cos(x * 181.0 + theta * 2.6) + 0.03 * grain;
      let reflected = mix(indigo, enamel, clamp(0.15 + lightDot * 0.64 + packet * 0.19, 0.0, 1.0));
      let polished = reflected * machining * (0.47 + 0.53 * front + 0.22 * rib);
      let glint = (streak * (0.18 + 0.49 * packet) + rim * (0.12 + 0.31 * packet)) * (0.5 + 0.5 * front);
      color = mix(color, polished + highlight * glint, shell * (0.86 + front * 0.14));
    }
  }

  // Small receiver particles stay on two offset spiral traces around the shell.
  for (var orbit = 0; orbit < 2; orbit++) {
    let lane = f32(orbit);
    let pitch = 12.0 + lane * 5.0;
    let sliding = x * pitch + turn / 6.2831853 * (1.0 + lane);
    let cell = floor(sliding + 0.5);
    let anchor = (cell - turn / 6.2831853 * (1.0 + lane)) / pitch;
    let dx = x - anchor;
    let phase = anchor * (5.2 + 2.7 * echoMix) - turn + 2.3 * lane;
    let dyStar = y - bend - sin(phase) * thinRadius * (1.22 + 0.25 * lane);
    let behind = cos(phase) < 0.0 && abs(dy) < 0.98;
    let brightness = select(0.61, 0.19, behind) * (0.5 + 0.5 * pow(0.5 + 0.5 * cos((cell % (7.0 + lane)) * 6.2831853 / (7.0 + lane)), 3.0));
    let distance = length(vec2f(dx * 1.7, dyStar));
    let mote = (1.0 - smoothstep(0.004, 0.013, distance)) + 0.23 * exp(-distance * distance * 3200.0);
    color += highlight * mote * brightness * tip;
  }

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
