struct Frame {
  shadow: vec4f,
  tide: vec4f,
}
@group(0) @binding(0) var<uniform> frame: Frame;

struct Surface {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}
@vertex fn waterVertex(@builtin(vertex_index) i: u32) -> Surface {
  let p = array(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3))[i];
  return Surface(vec4f(p, .999, 1), p);
}
@fragment fn waterFragment(surface: Surface) -> @location(0) vec4f {
  let p = surface.uv;
  let light = exp(-dot(p * vec2f(.83, .66), p * vec2f(.83, .66)));
  let ripple = p.y * 34.0 + p.x * 9.0 + 2.5*sin(p.x*4.0+p.y*2.9) + .8*sin(p.x*8.0-p.y*5.0);
  let cut = pow(.5+.5*sin(ripple + frame.tide.x), 13.0);
  let streak = .5+.5*sin(16.0*p.x + 5.0*p.y + sin(p.y*9.0));
  let thread = pow(.5+.5*sin(p.y*87.0+p.x*20.0+2.0*cos(p.x*6.0+p.y*3.0)), 14.0);
  let q = vec2f(p.x-frame.shadow.w+.13, p.y-frame.shadow.z+.09*p.x);
  let r = vec2f(p.x-frame.shadow.w,p.y-frame.shadow.z-.095*p.x*frame.tide.y)/frame.shadow.xy;
  let occlusion = 1.0 - .51*exp(-2.1*dot(r,r)) - .18*exp(-6.0*dot(q,q));
  let grain = fract(52.9829189 * fract(dot(surface.position.xy, vec2f(.06711056,.00583715)))) - .5;
  let blue = vec3f(.020,.126,.196) + vec3f(.014,.139,.173)*light
           + vec3f(.025,.086,.10) * (cut*streak*.9 + thread*.33);
  let rim = .042*exp(-3.0*dot(r,r))*(1.0+sin(ripple+frame.tide.x))*select(0.0,1.0,p.y<frame.shadow.z);
  let reach = (p.x-frame.shadow.w)/frame.shadow.x;
  let surfaceLine = (p.y-frame.shadow.z-.160*p.x*frame.tide.y);
  let contact = exp(-1.85*reach*reach*reach*reach) * exp(-abs(surfaceLine+.061)*22.0);
  let reflected = contact*frame.tide.z*(.54+.46*sin(ripple*1.9+frame.tide.x));
  return vec4f(occlusion*blue+rim*vec3f(.28,.67,.76)+reflected*vec3f(.10,.075,.060)+grain*.014, 1);
}

struct Panel {
  @builtin(position) position: vec4f,
  @location(0) colour: vec3f,
}
@vertex fn panelVertex(@location(0) p: vec3f, @location(1) colour: vec3f) -> Panel {
  return Panel(vec4f(p, 1), colour);
}
@fragment fn panelFragment(panel: Panel) -> @location(0) vec4f {
  let grain = fract(52.9829189 * fract(dot(panel.position.xy, vec2f(.06711056,.00583715)))) - .5;
  return vec4f(panel.colour + grain*.026, 1);
}
