struct Frame {
  shadow: vec4f,
  tide: vec4f,
  contact: vec4f,
  crop: vec4f,
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var resolvedHull: texture_2d<f32>;
@group(0) @binding(2) var waterLayer: texture_2d<f32>;
@group(0) @binding(3) var linearClamp: sampler;
@group(0) @binding(4) var lakePhoto: texture_2d<f32>;
@group(0) @binding(5) var mirroredHull: texture_2d<f32>;
@group(0) @binding(6) var shorePhoto: texture_2d<f32>;
@group(0) @binding(7) var materialAtlas: texture_2d<f32>;

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
  var water = lake * mix(.91,1.12,depth) + vec3f(.003,.012,.013);
  if (frame.tide.z > 0.0) {
    let eddies = rippleNoise(p*vec2f(28,65)+vec2f(phase*.8,-phase*2.0));
    let warped = uv + vec2f(.018*rill*facets+.016*eddies,.008*facets+.011*eddies);
    let mirrored = textureSampleLevel(mirroredHull,linearClamp,warped,0);
    let fracture = sin(47.0*p.x + 2.7*rill + sin(23.0*p.x - 48.0*p.y));
    let broken = .09+.91*smoothstep(-.08,.74,.33*facets+.38*fracture+.24*rill+1.20*eddies);
    let fade = 1.0-smoothstep(.043,.33,-q.y);
    let reflection = .82*frame.tide.z*fade*broken;
    let luma = dot(mirrored.rgb,vec3f(.30,.57,.13));
    let reflected = mix(mirrored.rgb,vec3f(luma),.36)*vec3f(.68,.61,.54)*reflection;
    water = water * (1.0 - mirrored.a*reflection*.86) + reflected;
  }

  let cut = exp(-abs(q.y + .012)*73.0) * (1.0-smoothstep(.44,1.02,abs(pocket.x)));
  let scatter = smoothstep(.22,.81,.66*facets+.34*rill);
  let meniscus = cut*scatter*frame.tide.z;
  let lit = water + meniscus*vec3f(.16,.25,.23);
  if (frame.contact.y >= 2.60) { return vec4f(lit,1); }
  let travel = smoothstep(.68,2.60,frame.contact.y);
  let rockUV = vec2f((p.x+1.17+2.11*travel)/1.89,.48+(-.575-p.y-.31*travel)/.99);
  let rock = textureSampleLevel(shorePhoto,linearClamp,rockUV,0);
  let shelf = (1.0-smoothstep(.985,1.0,rockUV.x)) * select(0.0,1.0,rockUV.y > 0.0);
  let foot = vec2f((p.x-.013)/.367,(p.y+.641+.08*p.x)/.098);
  let pressure = exp(-dot(foot,foot))*(1.0-travel);
  return vec4f(lit*(1.0-rock.a*shelf)+rock.rgb*shelf*(.96-.52*pressure),1);
}

@fragment fn composeFragment(surface: Surface) -> @location(0) vec4f {
  let at = vec2i(surface.position.xy)-vec2i(frame.crop.xy);
  let size = vec2i(frame.crop.zw);
  var water = textureSample(waterLayer, linearClamp, imageUV(surface.uv)).rgb;
  if (any(at < vec2i(0)) || any(at >= size)) { return vec4f(water,1); }

  var hull = textureLoad(resolvedHull,at,0);
  let p = surface.uv;
  let contact = p.y-frame.shadow.z-frame.contact.x*(p.x-frame.shadow.w);
  // Follow the real lower silhouette. The wet strip spans only a few
  // native pixels and its broken crests sit just outside the hull coverage.
  if (frame.tide.z > 0.0 && abs(contact) < .19 && at.y >= 2 && at.y+3 < size.y) {
    let above = textureLoad(resolvedHull,at-vec2i(0,2),0).a;
    let below = textureLoad(resolvedHull,at+vec2i(0,3),0).a;
    let range = 1.0-smoothstep(.62,1.0,abs(p.x-frame.shadow.w)/frame.shadow.x);
    let contactStrength = frame.tide.z*range;
    let immersed = hull.a*(1.0-below)*contactStrength;
    hull = vec4f(mix(hull.rgb,hull.rgb*vec3f(.46,.63,.64)+water*hull.a*.16,immersed*.8),hull.a);
    let ripple = .54*sin(p.x*137.0+frame.tide.x*2.0)+.46*sin(p.x*289.0+1.9*sin(17.0*p.x));
    let crest = smoothstep(.05,.68,ripple)*above*(1.0-hull.a)*contactStrength;
    water += crest*vec3f(.185,.32,.29);
  }
  return vec4f(hull.rgb + water * (1.0 - hull.a), 1);
}

@fragment fn composeMotionFragment(surface: Surface) -> @location(0) vec4f {
  let at = surface.position.xy-frame.crop.xy;
  let water = textureSample(waterLayer,linearClamp,imageUV(surface.uv)).rgb;
  if (any(at < vec2f(0)) || any(at >= frame.crop.zw)) { return vec4f(water,1); }
  let pixels = vec2f(textureDimensions(resolvedHull));
  let source = at/frame.crop.zw*pixels-.5;
  // Remap the blend weight around texel centres to keep the thin creases
  // crisp without stepping the resolved coverage at the silhouette.
  let blendWeight = smoothstep(vec2f(.10),vec2f(.90),fract(source));
  let coord = (floor(source)+blendWeight+.5)/pixels;
  let hull = textureSampleLevel(resolvedHull,linearClamp,coord,0);
  return vec4f(hull.rgb+water*(1.0-hull.a),1);
}

struct Panel {
  @builtin(position) position: vec4f,
  @location(0) colour: vec3f,
  @location(1) surface: vec2f,
  @location(2) lighting: vec2f,
  @location(3) @interpolate(flat) material: u32,
}
@vertex fn panelVertex(
  @location(0) p: vec3f, @location(1) colour: vec3f, @location(2) surface: vec2f, @location(3) material: f32
) -> Panel {
  let local = (imageUV(p.xy)*frame.contact.zw-frame.crop.xy)/frame.crop.zw;
  let sky = (p.xy-vec2f(-.43,.49))*vec2f(1.20,1.46);
  let trees = smoothstep(-.55,.46,p.y-.35*p.x + .11*sin(9.0*p.x));
  return Panel(vec4f(local*vec2f(2,-2)+vec2f(-1,1),p.z,1), colour, surface,
    vec2f(exp(-dot(sky,sky)),trees),u32(material));
}
@fragment fn panelFragment(panel: Panel) -> @location(0) vec4f {
  let mat = panel.material;
  let micro = grain(panel.position.xy+frame.crop.xy)*.014;
  let copper = smoothstep(.16,.49,panel.colour.r - panel.colour.b);
  var detail = micro;
  if (mat == 0u) {
    let texel = panel.surface * 352.0;
    let particulate = grain(floor(texel))*.050 + grain(floor(texel*.36))*.027;
    let weave = (cos(texel.x*2.8)*cos(texel.y*3.1))*.019;
    detail += mix(weave,particulate,copper);
  }
  let key = panel.lighting.x;
  let reflectedTrees = panel.lighting.y;
  let lighting = .78+.34*key+.11*reflectedTrees;
  let bounce = vec3f(.029,.066,.058)*(1.0-key)*(1.0-.63*copper);
  let sheen = vec3f(.125,.077,.038)*copper*key*(.26+.74*reflectedTrees);
  var colour = panel.colour * (lighting+detail*.72) + detail + bounce + sheen;
  let uv = clamp(panel.surface,vec2f(0),vec2f(1));
  if (mat > 0u) {
    let seating = mat == 3u || mat == 4u;
    let deck = mat == 2u || mat == 6u;
    // Insets keep linear filtering in its own swatch at the atlas boundaries.
    let shellUV = mix(vec2f(.006,.010),vec2f(.994,.489),uv);
    let deckUV = mix(vec2f(.006,.510),vec2f(.495,.990),uv);
    let seatPos = select(vec2f(uv.x,.55+uv.y*.20),uv,mat == 4u);
    let seatUV = mix(vec2f(.506,.510),vec2f(.994,.990),seatPos);
    let lookup = select(select(shellUV,deckUV,deck),seatUV,seating);
    let photograph = textureSampleLevel(materialAtlas,linearClamp,lookup,0).rgb;
    if (seating) {
      let textile = photograph * (1.13+.35*key) - vec3f(.005);
      colour = mix(colour,textile,.86);
    } else {
      let exposure = .53+.65*clamp((colour.r-.18)/.62,0.0,1.0);
      let polymer = photograph*vec3f(1.18,1.10,1.04)*exposure + .24*bounce + .26*sheen;
      colour = mix(colour,polymer,.76);
    }
    if (mat == 5u || mat == 6u) {
      // The two belts straddle x=.20 and .68 on the same packed leaf.
      let lift = smoothstep(.14,1.12,frame.contact.y);
      let x = uv.x-.012-.055*lift;
      let strip = min(abs(x-.176),abs(x-.758));
      let shadow = 1.0-smoothstep(.019,.060+.028*lift,strip);
      colour *= 1.0-.38*(1.0-lift)*shadow;
    }
  }
  return vec4f(clamp(colour,vec3f(0),vec3f(1)),1);
}
struct Mirror {
  @builtin(position) position: vec4f,
  @location(0) colour: vec3f,
}
@vertex fn mirrorVertex(@location(0) p: vec3f, @location(1) colour: vec3f) -> Mirror {
  return Mirror(vec4f(p,1),colour);
}
@fragment fn mirrorFragment(panel: Mirror) -> @location(0) vec4f {
  return vec4f(panel.colour,1);
}
