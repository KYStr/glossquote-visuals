struct Frame {
  shadow: vec4f,
  tide: vec4f,
  contact: vec4f,
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var resolvedHull: texture_2d<f32>;
@group(0) @binding(2) var waterLayer: texture_2d<f32>;
@group(0) @binding(3) var linearClamp: sampler;
@group(0) @binding(4) var lakePhoto: texture_2d<f32>;
@group(0) @binding(5) var mirroredHull: texture_2d<f32>;

struct Surface {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}
@vertex fn waterVertex(@builtin(vertex_index) i: u32) -> Surface {
  let p = array(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3))[i];
  return Surface(vec4f(p, .999, 1), p);
}
fn imageUV(p: vec2f) -> vec2f {
  return p * vec2f(.5, -.5) + .5;
}
@fragment fn waterFragment(surface: Surface) -> @location(0) vec4f {
  let p = surface.uv;
  let uv = imageUV(p);
  let ratio = frame.tide.y / frame.tide.w;
  let crop = vec2f(min(1.0,ratio), min(1.0,1.0/ratio));
  let phase = frame.tide.x;
  let ripple = p.y*28.0+p.x*7.5+2.4*sin(p.x*4.0+p.y*2.6);
  let facets = sin(p.y*121.0 + 2.6*sin(7.0*p.x + p.y*3.0) - phase*1.22);
  let rill = sin(ripple+phase+.51*facets);
  let flutter = vec2f(.0042*rill+.0016*facets,.0018*sin(.69*ripple-phase));
  let lake = textureSample(lakePhoto,linearClamp,(uv-.5+flutter*.37)*crop+.5).rgb;

  let q = vec2f(p.x-frame.shadow.w,p.y-frame.shadow.z-frame.contact.x*(p.x-frame.shadow.w));
  let pocket = q / frame.shadow.xy;
  let depth = 1.0 - .59*exp(-2.4*dot(pocket,pocket));
  let warped = uv + vec2f(.019*rill*facets+.007*sin(ripple*.65-phase),.0055*facets+.007*abs(rill));
  let mirrored = textureSample(mirroredHull,linearClamp,warped);
  let fracture = sin(29.0*p.x + 2.7*rill + sin(23.0*p.x - 48.0*p.y));
  let broken = (.18+.82*smoothstep(-.40,.71,facets+.53*rill+.52*fracture)) * (.68+.32*sin(ripple*.39+phase));
  let fade = 1.0-smoothstep(.09,.61,-q.y);
  let reflection = (.24+.45*frame.tide.z)*fade*broken;
  let photo = lake * mix(.91,1.12,depth) + vec3f(.003,.012,.013);
  let reflected = mirrored.rgb * vec3f(1.06,.75,.53) * reflection;
  let water = photo * (1.0 - mirrored.a*reflection*.68) + reflected;

  let cut = exp(-abs(q.y + .012)*73.0) * (1.0-smoothstep(.44,1.02,abs(pocket.x)));
  let scatter = smoothstep(.22,.81,.66*facets+.34*rill);
  let meniscus = cut*scatter*frame.tide.z;
  return vec4f(water + meniscus*vec3f(.16,.25,.23),1);
}

@fragment fn composeFragment(surface: Surface) -> @location(0) vec4f {
  let hull = textureLoad(resolvedHull, vec2i(surface.position.xy), 0);
  let water = textureSample(waterLayer, linearClamp, imageUV(surface.uv)).rgb;
  return vec4f(hull.rgb + water * (1.0 - hull.a), 1);
}

struct Panel {
  @builtin(position) position: vec4f,
  @location(0) colour: vec3f,
  @location(1) surface: vec2f,
}
@vertex fn panelVertex(
  @location(0) p: vec3f, @location(1) colour: vec3f, @location(2) surface: vec2f
) -> Panel {
  return Panel(vec4f(p, 1), colour, surface);
}
fn grain(p: vec2f) -> f32 {
  return fract(52.9829189 * fract(dot(p, vec2f(.06711056,.00583715)))) - .5;
}
@fragment fn panelFragment(panel: Panel) -> @location(0) vec4f {
  let texel = panel.surface * 352.0;
  let particulate = grain(floor(texel))*.064 + grain(floor(texel*.36))*.029;
  let micro = grain(panel.position.xy)*.014;
  let copper = smoothstep(.16,.49,panel.colour.r - panel.colour.b);
  let weave = (cos(texel.x*2.8)*cos(texel.y*3.1))*.019;
  let broad = sin(panel.surface.y*23.5+ .27*sin(panel.surface.x*13.1))*.014;
  let detail = micro + broad + mix(weave,particulate,copper);
  return vec4f(clamp(panel.colour*(1.0+detail*.72)+detail,vec3f(0),vec3f(1)),1);
}
@fragment fn mirrorFragment(panel: Panel) -> @location(0) vec4f {
  return vec4f(panel.colour,1);
}
