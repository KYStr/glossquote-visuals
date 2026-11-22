const span = .825;
const tau = Math.PI * 2;
export const duration = 4.8;
export const modeTimes = [0, 2.65, duration];
const mix = (a,b,t) => a + (b-a)*t;
const point = (a,b,t) => [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const minus = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit = v => { const length = Math.hypot(...v) || 1; return v.map(c => c/length); };
const ease = (t, a, b) => {
  const w = Math.max(0, Math.min(1, (t-a)/(b-a)));
  return w*w*(3-2*w);
};

export function assembly(seconds) {
  return {
    strap: ease(seconds, .18, 1.08),
    inner: ease(seconds, .85, 2.72),
    stern: ease(seconds, 1.32, 3.1),
    bow: ease(seconds, 1.85, 3.48),
    port: ease(seconds, 2.56, 4.02),
    starboard: ease(seconds, 2.7, 4.18),
    caps: ease(seconds, 3.55, 4.54),
    seat: ease(seconds, 3.18, 4.45),
    settle: ease(seconds, 4.05, duration),
  };
}

const colours = new Map();
function colour(hex) {
  if (!colours.has(hex)) colours.set(hex, [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255));
  return colours.get(hex);
}
const light = unit([-.44, .82, .37]);
const bounce = unit([.40,.15,-.9]);
const specular = unit([-.30,.94,.17]);
export function assemblyStage(seconds) {
  if (seconds >= duration) return "complete";
  if (seconds >= 4.05) return "settling";
  if (seconds >= 3.00) return "raising";
  if (seconds >= 1.12) return "extending";
  if (seconds >= .18) return "releasing";
  return "packed";
}

function hinge(x, y, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return (along, up, z) => [x + along*c-up*s, y + along*s+up*c, z];
}
function rigidChain(phase) {
  const starboard = hinge(0, 0, mix(-.051, 0, phase.inner));
  const port = hinge(0, .050*(1-phase.inner), mix(.051, Math.PI, phase.inner));
  const fixedEnd = t => t(span,0,0);
  const [sx, sy] = fixedEnd(starboard), [px, py] = fixedEnd(port);
  const invert = move => (x,y,z) => move(x,-y,z);
  return [
    { move: invert(port), inner: true, sign: -1 },
    { move: invert(hinge(px,py+.057*(1-phase.stern),mix(Math.PI+.055,Math.PI,phase.stern))), inner: false, sign: -1 },
    { move: starboard, inner: true, sign: 1 },
    { move: hinge(sx,sy-.054*(1-phase.bow),mix(Math.PI+.055,tau,phase.bow)), inner: false, sign: 1 },
  ];
}
const sectionShape = {
  inner: [[0,.245,.270],[span,.205,.248]],
  ends: [[0,.205,.248],[.42,.128,.184],[.695,.047,.086],[span,.008,.012]],
};
const look = [
  { top:"#ef693e", band:"#d84c2c", base:"#9a3b28" },
  { top:"#ff8251", band:"#eb5633", base:"#9a3b28" },
  { top:"#ef6d41", band:"#de4f2d", base:"#a5412a" },
  { top:"#fa7544", band:"#e85832", base:"#a5412a" },
];

export function boatScene({ aspect, seconds = duration, yaw = 0, tandem = false, plate = false }) {
  const phase = assembly(seconds);
  const surfaces = [];
  const chain = rigidChain(phase);
  let orientation = 1;
  // The entire animation uses these same four floor leaves, eight cheeks,
  // deck caps, belt lengths and seat. Only hinge angles and webbing flex change.
  function face(hex, ...verts) {
    const normal = unit(cross(minus(verts[1],verts[0]), minus(verts[2],verts[0])));
    const illumination = .70 + .32*Math.max(0,dot(normal, light)*orientation) + .095*Math.max(0,dot(normal,bounce)*orientation);
    const glint = .065*Math.pow(Math.max(0,dot(normal,specular)*orientation),10);
    const tint = colour(hex).map((v,i) => Math.min(1, v*illumination + glint*[1,.77,.64][i]));
    surfaces.push({ tint, verts });
  }
  function block(move, x, y, z, length, height, width, paints, bevel = .006) {
    const [top, sides, end] = paints;
    const x0=x-length/2, x1=x+length/2, z0=z-width/2, z1=z+width/2;
    const corners = (dx, dz, h) => [
      move(x0+dx,h,z0+dz), move(x0+dx,h,z1-dz),
      move(x1-dx,h,z1-dz), move(x1-dx,h,z0+dz),
    ];
    const a=corners(0,0,y), b=corners(0,0,y+height-bevel), c=corners(bevel,bevel,y+height);
    face(top,...c);
    face(end,...a.slice().reverse());
    for (let i=0;i<4;i++) {
      const j=(i+1)%4;
      face(i%2 ? sides : end,a[i],a[j],b[j],b[i]);
      face(top,b[i],b[j],c[j],c[i]);
    }
  }
  const rail = "#ff9d70", black = "#2b3033";
  for (const [index, { move, inner, sign }] of chain.entries()) {
    orientation = sign;
    const sections = inner ? sectionShape.inner : sectionShape.ends;
    const { top, band, base } = look[index];
    const thickness = .018;
    const at = ([x,w], side, lift = 0) => move(x,lift,side*w);
    for (let i=0; i<sections.length-1; i++) {
      const a=sections[i], b=sections[i+1];
      const floor = [at(a,-1),at(a,1),at(b,1),at(b,-1)];
      const under = [at(a,-1,-thickness),at(a,1,-thickness),at(b,1,-thickness),at(b,-1,-thickness)];
      face(base,...floor);
      face(top,...under.slice().reverse());
      for (const [j,k] of [[0,1],[1,2],[2,3],[3,0]]) face(band,under[j],under[k],floor[k],floor[j]);

      for (const side of [-1,1]) {
        // A fixed width cheek rotates on its own longitudinal chine.
        // A narrow second bevel preserves the fold ridge even at glancing angles.
        const settle = side === 1 ? phase.starboard : phase.port;
        const free = ease(seconds, inner ? 1.75 : 2.05, inner ? 2.93 : 3.46);
        const angle = mix(mix(3.106, .38, free),side === 1 ? 1.10 : 1.14,settle);
        const wing = ([x,w,panel],u,bias=0) => move(x, .005 + panel*u*Math.sin(angle) + bias, side*(w + panel*u*Math.cos(angle)));
        const shade = side === 1 ? top : band;
        const edge = (u,v,h,hex) => face(hex, wing(a,u,h),wing(a,v,h),wing(b,v,h),wing(b,u,h));
        edge(0,.61,0,shade);
        edge(.61,.96,0,side===1 ? band : top);
        edge(.96,1,.001,rail);
        edge(0,.045,.003,"#76362d");
        face(band,wing(a,1),wing(a,1,-.011),wing(b,1,-.011),wing(b,1));
        face("#ce5030",wing(a,0,-.011),wing(b,0,-.011),wing(b,.63,-.011),wing(a,.63,-.011));
        face("#ed673e",wing(a,.63,-.011),wing(b,.63,-.011),wing(b,.94,-.011),wing(a,.94,-.011));
        face("#ff9b6d",wing(a,.94,-.011),wing(b,.94,-.011),wing(b,1,-.011),wing(a,1,-.011));
        const mark = wing(a,.68,.005);
        const tip = wing(b,.68,.005);
        const trim = (u,v) => point(wing(a,v,.006),wing(b,v,.006),u);
        if (inner && side === 1) {
          face("#ffc7a1", point(mark,tip,.22),trim(.22,.73),trim(.43,.73),point(mark,tip,.43));
          face("#ffc7a1", point(mark,tip,.48),trim(.48,.73),trim(.53,.73),point(mark,tip,.53));
        }
      }
    }
    // The keel stay reads as one longitudinal line as the leaves lock flat.
    // Individually shaded seams remain visible at all four rigid joints.
    const end = sections.at(-1)[0];
    block(move,end*.5,.004,0,end*.992,.014,inner ? .136 : .076,
      ["#60413b","#453633","#392d2c"],.004);
    for (const offset of [-.055,.055]) {
      if (inner) block(move,span*.5,.020,offset,span*.965,.007,.009,["#a7634a","#694539","#57403a"],.002);
    }
    if (inner) {
      for (const z of [-.155,.155]) {
        block(move,.036,.004,z,.066,.020,.072,["#604547",black,black],.004);
      }
    } else {
      // The caps are triangulated rigid leaves. They rise to clear the sidewalls
      // and then settle into the same tapered rails on both ends of the hull.
      const lift = ease(seconds, 2.81, 3.62)*(1-phase.caps);
      const capAngle = .27 * (1-phase.caps) + .50*lift;
      const sit = mix(.048,.252,phase.caps) + .08*lift;
      const capTransform = (x,y,z) => move(x*Math.cos(capAngle)-y*Math.sin(capAngle),sit+x*Math.sin(capAngle)+y*Math.cos(capAngle),z);
      const cap = ([x,w,panel],side,lift=0) => {
        const width = side * (w + panel*Math.cos(1.12));
        const fall = .24 * Math.pow(x/span,1.62);
        return capTransform(x,lift-fall+(!side ? .018 : 0),width);
      };
      for (let i=0;i<sections.length-1;i++) {
        const a=sections[i], b=sections[i+1];
        for (const side of [-1,1]) {
          const u=cap(a,0), v=cap(b,0), w=cap(b,side), q=cap(a,side);
          face(side === 1 ? "#ff8953" : "#f16c42",u,q,w,v);
          face("#aa422d",q,cap(a,side,-.013),cap(b,side,-.013),w);
          face(band,cap(a,0,-.013),cap(b,0,-.013),cap(b,side,-.013),cap(a,side,-.013));
        }
      }
      block(capTransform,.695,-.149,0,.091,.019,.057,
        ["#4a3f3c","#272727","#222326"],.004);
    }
    if (!inner) continue;

    if (sign === -1 || tandem) {
      const atSeat = tandem ? .48 : .38;
      block(move,atSeat,.016,0,.37,.062,.35,["#494e56","#292e35","#232a33"],.016);
      const angle = mix(.10,1.20,phase.seat);
      const pivot = atSeat-sign*.158;
      const back = (x,y,z) => move(pivot-sign*(x*Math.cos(angle)-y*Math.sin(angle)),.065+x*Math.sin(angle)+y*Math.cos(angle),z);
      block(back,.097,0,0,.198,.056,.352,["#505963","#333b43","#272e35"],.016);
      block(back,.108,.052,0,.126,.011,.286,["#626b75","#424b55","#33424c"],.004);
      for (const lane of [-.10, -.05, 0, .05, .10]) {
        block(move,atSeat+sign*.024,.077,lane,.23,.004,.017,["#616972","#3e454e","#313840"],.001);
      }
    }
  }

  // Each strap stays fixed at one anchor. As the buckle releases, the band
  // bends away and settles as a rear gear tie, with no loss of its solid buckle.
  const tie = hinge(0, .05*(1-phase.inner), mix(.051, Math.PI, phase.inner));
  const grip = ease(seconds, .52, 1.20);
  const slack = Math.sin(phase.strap*Math.PI);
  const anchorY = mix(.187,-.055,grip)+.07*slack;
  const anchorZ = mix(-.19,-.197,grip);
  for (const x of [.20,.68]) {
    const wrap = x < .3 ? .230 : .309;
    const path = [
      tie(x,.014,-.214), tie(x,mix(.13,-.028,grip),mix(-.223,-.185,grip)),
      tie(x,anchorY,anchorZ),
      tie(x,mix(.198,-.054,grip)+.05*slack,mix(.00,-.185,grip)),
      tie(x,mix(.187,-.048,grip)+.045*slack,mix(.184,-.177,grip)),
      tie(x,mix(.181,-.051,grip)+.03*slack,mix(wrap,-.166,grip)),
      tie(x,mix(.02,-.025,grip),mix(.242,-.155,grip)),
      tie(x,mix(-.141,-.019,grip),mix(.22,-.144,grip)),
    ];
    for (let j=0; j<path.length-1;j++) {
      const offset = minus(tie(x+.027,0,0),tie(x,0,0));
      const a=path[j], b=path[j+1];
      const shift = (p,k,h=0) => p.map((v,i) => v + k*offset[i] + (i===1 ? h : 0));
      face("#252b31",shift(a,-1),shift(a,1),shift(b,1),shift(b,-1));
      face("#4f5150",shift(a,-1,.001),shift(a,-.77,.001),shift(b,-.77,.001),shift(b,-1,.001));
    }
    const buckle = point(path[3],path[4],.24);
    const hardware = (dx,dy,dz) => [buckle[0]+dx,buckle[1]+dy,buckle[2]+dz];
    block(hardware,0,0,0,.088,.025,.109,["#c4c8b7","#737d7b","#535d5e"],.008);
    block(hardware,0,.025,0,.048,.007,.078,["#38424a","#353c40","#30383c"],.002);
  }
  // A rigid bail shares the two webbing anchors. Its open centre and dark
  // grip clear the packed silhouette. It folds flat as the straps release.
  const bailAngle = mix(-.13,-1.48,grip);
  const bail = (x,y,z) => tie(x,anchorY+y*Math.cos(bailAngle)-z*Math.sin(bailAngle),anchorZ+y*Math.sin(bailAngle)+z*Math.cos(bailAngle));
  const handlePaint = ["#454a4e","#20272d","#192026"];
  for (const x of [.20,.68]) {
    block(bail,x,-.014,0,.083,.060,.094,["#595b58","#363a3f","#252c34"],.009);
    block(bail,x,.035,0,.061,.206,.064,handlePaint,.008);
  }
  block(bail,.44,.225,0,.530,.068,.094,handlePaint,.017);
  for (let index=0;index<7;index++) {
    block(bail,.348+index*.030,.290,0,.012,.006,.052,["#636566","#353b40","#283037"],.001);
  }

  const carryDetail = plate && seconds === 0;
  const viewYaw = mix(.055,-.10,ease(seconds,.60,3.90)) + yaw;
  const tilt = mix(.56,.62,ease(seconds,1.25,3.70));
  const c=Math.cos(viewYaw), s=Math.sin(viewYaw), elevation=Math.sqrt(1-tilt*tilt);
  const diagonal = carryDetail ? .08 : mix(.29,.23,phase.settle);
  const dc=Math.sqrt(1-diagonal*diagonal);
  const projectWorld = ([x,y,z]) => {
    if (tandem) { x *= 1.12; z *= 1.07; }
    const u=x*c+z*s, v=z*c-x*s, yv=y*elevation-v*tilt;
    return [dc*u-diagonal*yv, diagonal*u+dc*yv, .5-(v*elevation+y*tilt)*.12];
  };
  const projected = surfaces.map(({ tint, verts }) => ({ tint, points:verts.map(projectWorld) }));
  const frame = [Infinity,-Infinity,Infinity,-Infinity];
  for (const { points } of projected) {
    for (const [x,y] of points) {
      frame[0]=Math.min(frame[0],x); frame[1]=Math.max(frame[1],x);
      frame[2]=Math.min(frame[2],y); frame[3]=Math.max(frame[3],y);
    }
  }
  const xCenter=(frame[0]+frame[1])*.5, yCenter=(frame[2]+frame[3])*.5;
  const nominal=carryDetail ? 1.04 : mix(1.25,.475,ease(seconds, .88, 3.48));
  const scale = Math.min(nominal, 1.73/(frame[1]-frame[0]), 1.51/((frame[3]-frame[2])*aspect));
  const yOffset=carryDetail ? .17 : .063;
  const triangles=[];
  for (const { tint, points } of projected) {
    for (const p of points) {
      p[0]=(p[0]-xCenter)*scale;
      p[1]=(p[1]-yCenter)*scale*aspect+yOffset;
    }
    for (let i=1;i<points.length-1;i++) triangles.push({ tint, points:[points[0],points[i],points[i+1]] });
  }
  const [groundX,groundY] = projectWorld([0,-.045 - .28*(1-phase.settle),.095*phase.settle]);
  const shadowCenter = (groundY-yCenter)*scale*aspect+yOffset;
  const shadowX = Math.min(.16, Math.max(-.16, (groundX-xCenter)*scale));
  const shadow = [
    Math.max(.23,(frame[1]-frame[0])*.50*scale),
    Math.max(.065,mix(.179,.087,phase.settle)*aspect*scale),
    Math.max(-.64,shadowCenter), shadowX,
  ];
  return { triangles, shadow };
}
