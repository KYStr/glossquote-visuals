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
@group(0) @binding(6) var shorePhoto: texture_2d<f32>;

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
fn grain(p: vec2f) -> f32 {
  return fract(52.9829189 * fract(dot(p, vec2f(.06711056,.00583715)))) - .5;
}
fn rippleNoise(p: vec2f) -> f32 {
  let cell = floor(p);
  let f = fract(p);
  let t = f*f*(3.0-2.0*f);
  return mix(mix(grain(cell),grain(cell+vec2f(1,0)),t.x),
             mix(grain(cell+vec2f(0,1)),grain(cell+vec2f(1,1)),t.x),t.y);
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
  let eddies = rippleNoise(p*vec2f(28,65)+vec2f(phase*.8,-phase*2.0));
  let warped = uv + vec2f(.018*rill*facets+.016*eddies,.008*facets+.011*eddies);
  let mirrored = textureSample(mirroredHull,linearClamp,warped);
  let fracture = sin(47.0*p.x + 2.7*rill + sin(23.0*p.x - 48.0*p.y));
  let broken = .09+.91*smoothstep(-.08,.74,.33*facets+.38*fracture+.24*rill+1.20*eddies);
  let fade = 1.0-smoothstep(.043,.33,-q.y);
  let reflection = (.14+.68*frame.tide.z)*fade*broken;
  let photo = lake * mix(.91,1.12,depth) + vec3f(.003,.012,.013);
  let luma = dot(mirrored.rgb,vec3f(.30,.57,.13));
  let reflected = mix(mirrored.rgb,vec3f(luma),.36)*vec3f(.68,.61,.54)*reflection;
  let water = photo * (1.0 - mirrored.a*reflection*.86) + reflected;

  let cut = exp(-abs(q.y + .012)*73.0) * (1.0-smoothstep(.44,1.02,abs(pocket.x)));
  let scatter = smoothstep(.22,.81,.66*facets+.34*rill);
  let meniscus = cut*scatter*frame.tide.z;
  let lit = water + meniscus*vec3f(.16,.25,.23);
  let travel = smoothstep(.68,2.60,frame.contact.y);
  let rockUV = vec2f((p.x+1.17+2.11*travel)/1.89,.48+(-.575-p.y-.31*travel)/.99);
  let rock = textureSample(shorePhoto,linearClamp,rockUV);
  let shelf = (1.0-smoothstep(.985,1.0,rockUV.x)) * select(0.0,1.0,rockUV.y > 0.0);
  let foot = vec2f((p.x-.013)/.367,(p.y+.641+.08*p.x)/.098);
  let pressure = exp(-dot(foot,foot))*(1.0-travel);
  return vec4f(lit*(1.0-rock.a*shelf)+rock.rgb*shelf*(.96-.52*pressure),1);
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
  @location(2) screen: vec2f,
}
@vertex fn panelVertex(
  @location(0) p: vec3f, @location(1) colour: vec3f, @location(2) surface: vec2f
) -> Panel {
  return Panel(vec4f(p, 1), colour, surface, p.xy);
}
@fragment fn panelFragment(panel: Panel) -> @location(0) vec4f {
  let texel = panel.surface * 352.0;
  let particulate = grain(floor(texel))*.050 + grain(floor(texel*.36))*.027;
  let micro = grain(panel.position.xy)*.014;
  let copper = smoothstep(.16,.49,panel.colour.r - panel.colour.b);
  let weave = (cos(texel.x*2.8)*cos(texel.y*3.1))*.019;
  let broad = sin(panel.surface.y*23.5+ .27*sin(panel.surface.x*13.1))*.009;
  let detail = micro + broad + mix(weave,particulate,copper);
  let p = panel.screen;
  let sky = dot((p-vec2f(-.43,.49))*vec2f(1.20,1.46),(p-vec2f(-.43,.49))*vec2f(1.20,1.46));
  let key = exp(-sky);
  let reflectedTrees = smoothstep(-.55,.46,p.y-.35*p.x + .11*sin(9.0*p.x));
  let lighting = .78+.34*key+.11*reflectedTrees;
  let bounce = vec3f(.029,.066,.058)*(1.0-key)*(1.0-.63*copper);
  let sheen = vec3f(.125,.077,.038)*copper*key*(.26+.74*reflectedTrees);
  let colour = panel.colour * (lighting+detail*.72) + detail + bounce + sheen;
  return vec4f(clamp(colour,vec3f(0),vec3f(1)),1);
}
@fragment fn mirrorFragment(panel: Panel) -> @location(0) vec4f {
  return vec4f(panel.colour,1);
}
