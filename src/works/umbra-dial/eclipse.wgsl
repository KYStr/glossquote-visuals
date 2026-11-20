  // World units are solar radii. Both discs, light leaks and measuring
  // guides are projected from the same plane and use the same lens center.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0) / 0.345;
  let slope = vec2f(1.0, -0.115);
  let radius = length(p);
  let t = fract(time * 0.1) * 10.0;
  // Ease through the narrow contact window so the bead is visible before
  // full alignment. The ring holds while the corona continues to breathe.
  var displacement = mix(0.8, 0.044, smoothstep(0.0, 0.78, t));
  if (t >= 0.78) {
    displacement = mix(0.044, 0.0, smoothstep(0.78, 1.04, t));
  }
  if (t >= 2.25) {
    displacement = mix(0.0, -1.57, smoothstep(2.25, 6.65, t));
  }
  if (t >= 6.65) {
    displacement = mix(-1.57, 0.8, smoothstep(6.65, 10.0, t));
  }
  if (preset >= 0.0) {
    let positions = array<f32, 3>(0.8, 0.0, -1.57);
    let position = positions[u32(clamp(preset, 0.0, 2.0))];
    displacement = position * (1.0 + 0.018 * sin(time * 0.6283185));
  }
  let m = p - slope * displacement;
  let lunarRadius = length(m);
  let feather = 1.3 / max(150.0, viewport.y);
  let background = vec3f(0.031, 0.027, 0.043);

  // Fixed optical plate with two off-axis orbit guides and a sparse star field.
  let orbit = length((p - vec2f(0.03, 0.01)) * vec2f(0.79, 1.0));
  let graticule = (1.0 - smoothstep(0.0, 0.006, abs(orbit - 1.38)))
    + 0.48 * (1.0 - smoothstep(0.0, 0.006, abs(orbit - 1.49)))
    + 0.44 * (1.0 - smoothstep(0.0, 0.004, abs(p.y + 0.115 * p.x)));
  let grid = p * 9.0;
  let seed = fract(dot(floor(grid), vec2f(0.618034, 0.819173)));
  let offset = vec2f(fract(seed * 13.31), fract(seed * 37.11)) * 0.58 + 0.21;
  let stars = smoothstep(0.96, 0.998, seed)
    * (1.0 - smoothstep(0.015, 0.075, length(fract(grid) - offset)));
  var color = background + graticule * vec3f(0.11, 0.087, 0.147)
    + stars * vec3f(0.43, 0.34, 0.55);

  let a = atan2(p.y, p.x);
  let lightAxis = normalize(vec2f(-0.94, -0.34));
  let lightSide = dot(p / max(radius, 0.001), lightAxis);
  let height = max(radius - 1.0, 0.0);
  let warp = a + height * (0.37 * sin(a * 3.0) + 0.17 * sin(a * 11.0));
  let petal = 0.5 + 0.5 * cos(2.0 * a + 0.83 + 0.5 * sin(3.0 * a));
  let strand = 0.54 * sin(warp * 21.0 + sin(warp * 8.0) * 1.8)
    + 0.28 * sin(warp * 53.0 + sin(a * 17.0) * 1.3) + 0.18 * cos(warp * 101.0);
  let halo = exp(-height * height * 3.5) * 0.052;
  let wind = exp(-height * (6.0 - 3.3 * petal)) * (0.12 + 0.29 * pow(0.5 + 0.5 * strand, 2.0)) * (0.20 + 0.80 * petal);
  let rim = exp(-height * 30.0) * (0.36 + 0.32 * (0.5 + 0.5 * strand));
  let reveal = 1.0 - smoothstep(0.035, 0.70, abs(displacement));
  let breath = 0.98 + 0.02 * cos(time * 0.6283185);
  color += (halo + wind + rim) * vec3f(0.56, 0.265, 0.99) * (0.53 + 0.47 * reveal) * breath;

  let solarDisc = 1.0 - smoothstep(-feather, feather, radius - 1.0);
  let solarZ = sqrt(max(0.0, 1.0 - radius * radius));
  let photosphere = sin(p.x * 45.0 + 2.4 * cos(p.y * 42.0)) * cos(p.y * 63.0 + p.x * 71.0)
    + 0.54 * cos(p.x * 181.0 + p.y * 141.0 + sin(p.y * 81.0));
  let sun = vec3f(1.0, 0.937, 0.805)
    * (0.79 + 0.23 * pow(solarZ, 0.44) + 0.031 * photosphere + 0.033 * lightSide * radius);
  color = mix(color, sun, solarDisc);

  let moonDisc = 1.0 - smoothstep(-feather, feather, lunarRadius - 0.988);
  let facing = dot(m / max(lunarRadius, 0.001), normalize(-slope)) * sign(displacement);
  let lunarEdge = pow(smoothstep(-0.45, 1.0, facing), 2.0)
    * exp(-abs(lunarRadius - 0.983) * 56.0) * smoothstep(0.04, 0.62, abs(displacement));
  let maria = 0.5 + 0.5 * sin(m.x * 12.0 + 1.6 * cos(m.y * 11.0))
    * cos(m.y * 18.0 - 4.0 * m.x);
  let moon = vec3f(0.040, 0.033, 0.055)
    + lunarEdge * vec3f(0.12, 0.079, 0.17) + vec3f(0.010, 0.007, 0.013) * maria * (0.65 + 0.35 * lightSide);
  color = mix(color, moon, moonDisc);

  // A few exposed valleys at contact, seen just outside the moving lunar limb.
  let distanceFromContact = (abs(displacement) - 0.038) * 64.0;
  let contact = exp(-distanceFromContact * distanceFromContact);
  let beadCenter = -normalize(slope + vec2f(0.0, 0.08)) * sign(displacement) * 0.998;
  let bead = p - beadCenter;
  let beadDistance = length(bead * vec2f(1.32, 0.84));
  let glint = exp(-beadDistance * 26.0) * 0.52 + exp(-beadDistance * beadDistance * 2350.0) * 0.77;
  color += contact * glint * vec3f(1.0, 0.87, 0.94) * (1.0 - 0.72 * moonDisc);
  // The palette above is authored in display sRGB. The compositor takes linear light.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
