struct Plates {
  @location(0) cobalt: vec4f,
  @location(1) combined: vec4f,
  @location(2) red: vec4f,
};

@group(0) @binding(0) var inkPlates: texture_2d<f32>;
@group(0) @binding(1) var master: texture_2d<f32>;

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
fn bakePlates(@builtin(position) pixel: vec4f) -> Plates {
  let texel = vec2i(pixel.xy);
  let plates = textureLoad(inkPlates, texel, 0).rgb;
  let proof = textureLoad(master, texel, 0).rgb;
  let paper = vec3f(247, 225, 195) / 255.0 + (plates.b - 128.0 / 255.0) * vec3f(0.66, 1, 1.15);
  let residual = proof - impression(paper, plates.r, plates.g);
  let blueDetail = smoothstep(0.03, 0.2, plates.r) * (1 - smoothstep(0.02, 0.12, plates.g));
  let redDetail = smoothstep(0.03, 0.2, plates.g) * (1 - smoothstep(0.02, 0.12, plates.r));
  let bare = (1 - plates.r) * (1 - plates.g);
  let cobalt = impression(paper, plates.r, 0) + residual * blueDetail;
  let red = impression(paper, 0, plates.g) + residual * redDetail;
  return Plates(vec4f(cobalt, bare), vec4f(proof, bare), vec4f(red, bare));
}
