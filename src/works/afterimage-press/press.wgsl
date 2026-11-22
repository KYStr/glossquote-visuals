struct Frame {
  geometry: vec4f, // device pixel offset and logical scene size
  state: vec4f,    // plate, blade contact y, tool visible, paper light time
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var smoothSampler: sampler;
@group(0) @binding(2) var pressBed: texture_2d<f32>;
@group(0) @binding(3) var cobalt: texture_2d<f32>;
@group(0) @binding(4) var combined: texture_2d<f32>;
@group(0) @binding(5) var orange: texture_2d<f32>;
@group(0) @binding(6) var squeegee: texture_2d<f32>;

@vertex
fn triangle(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let vertices = array(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(vertices[index], 0, 1);
}

@fragment
fn printFrame(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let uv = (pixel.xy - frame.geometry.xy) / frame.geometry.zw;
  let local = (uv - vec2f(0.065, 0.205)) / vec2f(0.87, 0.68);
  var color: vec3f;
  if (all(local >= vec2f(0)) && all(local < vec2f(1))) {
    if (frame.state.x > 1.5) {
      color = textureSampleLevel(orange, smoothSampler, local, 0).rgb;
    } else if (frame.state.x < 0.5 && uv.y < frame.state.y) {
      color = textureSampleLevel(combined, smoothSampler, local, 0).rgb;
    } else {
      color = textureSampleLevel(cobalt, smoothSampler, local, 0).rgb;
    }
    // Vary the reflected light on bare stock only. No printed mark moves.
    let paper = smoothstep(0.65, 0.86, min(color.r, min(color.g, color.b)));
    let glow = cos(local.x * 6 + local.y * 2 - frame.state.w) * (1.75 / 255.0);
    color += paper * glow * vec3f(1, 0.83, 0.62);
  } else {
    color = textureSampleLevel(pressBed, smoothSampler, uv, 0).rgb;
  }

  // The blade texture includes its contact shadow. Its edge is drawn at the
  // same stage coordinate used for the boundary of the new ink.
  let toolUv = (uv - vec2f(0.023, frame.state.y - 0.2484)) / vec2f(0.954, 0.306);
  if (frame.state.z > 0.5 && all(toolUv >= vec2f(0)) && all(toolUv < vec2f(1))) {
    let tool = textureSampleLevel(squeegee, smoothSampler, toolUv, 0);
    color = tool.rgb + color * (1.0 - tool.a);
  }
  return vec4f(color, 1);
}
