struct JellyFrame {
  @builtin(position) pixel: vec4f,
  @location(0) @interpolate(flat) timing: vec4f,
  @location(1) @interpolate(flat) piece: vec4f,
  @location(2) @interpolate(flat) bowl: vec4f,
  @location(3) @interpolate(flat) spoonUp: vec3f,
  @location(4) @interpolate(flat) spoonAxis: vec2f,
}

fn jellyFrame(time: f32, cutX: f32, cutZ: f32) -> JellyFrame {
  let contact = vec3f(-0.142, 0.0, 0.026) + vec3f(cutX, 0.392, cutZ);
  let arrive = smoothstep(0.22, 1.33, time);
  let insert = smoothstep(1.32, 1.91, time);
  let travel = smoothstep(1.94, 3.56, time);
  let press = smoothstep(1.23, 1.66, time) * (1.0 - smoothstep(1.82, 2.42, time));
  let rebound = 0.098 * smoothstep(2.16, 2.43, time) * (1.0 - smoothstep(2.44, 2.77, time));
  let destination = vec3f(0.38, contact.y + 0.330, -0.112);
  let pieceShift = (destination - contact) * travel + vec3f(0.0, 0.061 * sin(travel * 3.14159265), 0.0);
  let bowlContact = contact + vec3f(0.035, -0.145, 0.006);
  let bowlStart = bowlContact + vec3f(0.57, 0.33, -0.21);
  let bowlAbove = bowlContact + vec3f(0.048, 0.152, -0.009);
  let bowlCenter = mix(bowlStart, bowlAbove, arrive) - (bowlAbove - bowlContact) * insert
    + pieceShift - vec3f(cutX * 0.26 * travel, 0.035 * press, 0.0);
  let tilt = mix(0.26, 0.06, insert) + 0.10 * travel;
  let heading = normalize(vec3f(0.794, 0.0, -0.608));
  let tangent = heading * sqrt(1.0 - tilt * tilt) + vec3f(0.0, tilt, 0.0);
  let up = cross(vec3f(-heading.z, 0.0, heading.x), tangent);
  let projectedTilt = tangent.y * 0.83516465 - tangent.z * 0.55;
  let axis = normalize(vec2f(tangent.x, projectedTilt * 1.52));
  return JellyFrame(vec4f(0.0), vec4f(arrive, travel, press, rebound),
    vec4f(pieceShift, sin(0.68 * travel)), vec4f(bowlCenter, cos(0.68 * travel)), up, axis);
}

fn cacheColor(color: vec4f, kind: f32, coveredTaps: f32) -> vec4f {
  let mixed = 1.0 + coveredTaps * 31.0 + round(color.a * 30.0);
  let code = select(mixed, 128.0 + round(color.a * 127.0), kind == 2.0);
  return vec4f(color.rgb, select(code / 255.0, 0.0, kind == 0.0));
}

fn spoonShadow(floor: vec2f, bowl: vec2f, travel: f32) -> f32 {
  let shadowPos = (floor - bowl - vec2f(0.045, 0.09)) / vec2f(0.265, 0.199);
  return (1.0 - smoothstep(0.17, 1.14, length(shadowPos))) * (0.19 - 0.10 * travel);
}
