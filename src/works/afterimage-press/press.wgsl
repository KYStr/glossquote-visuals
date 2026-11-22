struct Frame {
  geometry: vec4f, // device pixel offset and logical scene size
  state: vec4f,    // plate, blade contact y, tool visible, paper light time
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var smoothSampler: sampler;
@group(0) @binding(2) var pressBed: texture_2d<f32>;
@group(0) @binding(3) var inkPlates: texture_2d<f32>;
@group(0) @binding(4) var master: texture_2d<f32>;
@group(0) @binding(5) var squeegee: texture_2d<f32>;

@vertex
fn triangle(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let vertices = array(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(vertices[index], 0, 1);
}

fn impression(paper: vec3f, blue: f32, red: f32) -> vec3f {
  let cobalt = vec3f(3, 23, 107) / 255.0;
  let vermilion = vec3f(242, 11, 3) / 255.0;
  let overprint = vec3f(49, 14, 57) / 255.0;
  return mix(mix(paper, cobalt, blue), mix(vermilion, overprint, blue), red);
}

@fragment
fn printFrame(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let uv = (pixel.xy - frame.geometry.xy) / frame.geometry.zw;
  let local = (uv - vec2f(0.044, 0.106)) / vec2f(0.912, 0.84444444);
  // Bow the blade under pressure. Once deposited, each ink stays registered.
  let pressure = smoothstep(0.106, 0.18, frame.state.y)
    * (1 - smoothstep(0.91, 0.958, frame.state.y));
  let edge = frame.state.y + 0.0075 * pressure * sin(uv.x * 3.14159265);
  var color: vec3f;
  if (all(local >= vec2f(0)) && all(local < vec2f(1))) {
    let plates = textureSampleLevel(inkPlates, smoothSampler, local, 0).rgb;
    let proof = textureSampleLevel(master, smoothSampler, local, 0).rgb;
    let paper = vec3f(247, 225, 195) / 255.0 + (plates.b - 128.0 / 255.0) * vec3f(0.66, 1, 1.15);
    // Calibrate to the approved impression. Apply residual texture with its
    // ink so single plates retain their halftone and the final stays true.
    let residual = proof - impression(paper, plates.r, plates.g);
    let row = uv.y - edge;
    let blueDetail = smoothstep(0.03, 0.2, plates.r) * (1 - smoothstep(0.02, 0.12, plates.g));
    let redDetail = smoothstep(0.03, 0.2, plates.g) * (1 - smoothstep(0.02, 0.12, plates.r));
    if (frame.state.x > 1.5) {
      color = impression(paper, 0, plates.g) + residual * redDetail;
    } else {
      let transferred = select(1 - smoothstep(-0.0012, 0.0, row), 0.0, frame.state.x > 0.5);
      color = impression(paper, plates.r, plates.g * transferred)
        + residual * mix(blueDetail, 1.0, transferred);
      let wet = pressure * transferred * plates.g * (1 - smoothstep(0, 0.018, -row));
      color += wet * vec3f(0.019, 0.008, 0.005);
    }
    let bare = (1 - plates.r) * (1 - plates.g);
    let glow = cos(local.x * 6 + local.y * 2 - frame.state.w) * (1.65 / 255.0);
    color += bare * glow * vec3f(1, 0.83, 0.62);
  } else {
    color = textureSampleLevel(pressBed, smoothSampler, uv, 0).rgb;
  }

  let toolUv = (uv - vec2f(0.014, edge - 0.10958824)) / vec2f(0.972, 0.135);
  if (frame.state.z > 0.5 && all(toolUv >= vec2f(0)) && all(toolUv < vec2f(1))) {
    let tool = textureSampleLevel(squeegee, smoothSampler, toolUv, 0);
    color = tool.rgb + color * (1 - tool.a);
  }
  return vec4f(color, 1);
}
