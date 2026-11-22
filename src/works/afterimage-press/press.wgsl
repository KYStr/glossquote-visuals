struct Frame {
  geometry: vec4f, // device pixel offset and logical scene size
  state: vec4f,    // plate, blade contact y, tool visible, paper reflected light
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var smoothSampler: sampler;
@group(0) @binding(2) var pressBed: texture_2d<f32>;
@group(0) @binding(3) var cobalt: texture_2d<f32>;
@group(0) @binding(4) var combined: texture_2d<f32>;
@group(0) @binding(5) var red: texture_2d<f32>;
@group(0) @binding(6) var squeegee: texture_2d<f32>;
@group(0) @binding(7) var inkPlates: texture_2d<f32>;

@vertex
fn triangle(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let vertices = array(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(vertices[index], 0, 1);
}

@fragment
fn printFrame(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let uv = (pixel.xy - frame.geometry.xy) / frame.geometry.zw;
  let local = (uv - vec2f(0.044, 0.106)) / vec2f(0.912, 0.84444444);
  let moving = frame.state.z > 0.5;
  var edge = frame.state.y;
  var pressure = 0.0;
  if (moving) {
    pressure = smoothstep(0.106, 0.18, edge) * (1 - smoothstep(0.91, 0.958, edge));
    edge += 0.0075 * pressure * sin(uv.x * 3.14159265);
  }
  var color: vec3f;
  if (all(local >= vec2f(0)) && all(local < vec2f(1))) {
    let row = uv.y - edge;
    var ink: vec4f;
    if (frame.state.x > 1.5) {
      ink = textureSampleLevel(red, smoothSampler, local, 0);
    } else if (frame.state.x > 0.5 || row >= 0.0) {
      ink = textureSampleLevel(cobalt, smoothSampler, local, 0);
    } else if (row <= -0.0012) {
      ink = textureSampleLevel(combined, smoothSampler, local, 0);
    } else {
      // Both impressions are consulted only in the subpixel contact edge.
      ink = mix(textureSampleLevel(cobalt, smoothSampler, local, 0),
                textureSampleLevel(combined, smoothSampler, local, 0),
                1 - smoothstep(-0.0012, 0.0, row));
    }
    let glow = ink.a * frame.state.w * (0.7 + 0.3 * local.x);
    color = ink.rgb + glow * vec3f(1, 0.83, 0.62);
    if (moving && row < 0 && row > -0.018) {
      let amount = textureSampleLevel(inkPlates, smoothSampler, local, 0).g;
      let wet = pressure * amount * (1 - smoothstep(0, 0.018, -row));
      color += wet * vec3f(0.019, 0.008, 0.005);
    }
  } else {
    color = textureSampleLevel(pressBed, smoothSampler, uv, 0).rgb;
  }

  if (moving) {
    let toolUv = (uv - vec2f(0.014, edge - 0.10958824)) / vec2f(0.972, 0.135);
    if (all(toolUv >= vec2f(0)) && all(toolUv < vec2f(1))) {
      let tool = textureSampleLevel(squeegee, smoothSampler, toolUv, 0);
      color = tool.rgb + color * (1.0 - tool.a);
    }
  }
  return vec4f(color, 1);
}
