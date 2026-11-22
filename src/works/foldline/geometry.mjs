const span = .825;
const tau = Math.PI * 2;
export const duration = 4.8;
export const modeTimes = [0, 2.65, duration];
export const hullStride = 9;
export const mirrorStride = 6;
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
  { top:"#dd8556", band:"#ad5228", base:"#4a2318" },
  { top:"#e98e5c", band:"#c1683d", base:"#552818" },
  { top:"#e48149", band:"#bc532b", base:"#4a2318" },
  { top:"#f1935f", band:"#c96030", base:"#552818" },
];

export function boatScene({ aspect, seconds = duration, yaw = 0, tandem = false, plate = false, buffers }) {
  const phase = assembly(seconds);
  const surfaces = [];
  const chain = rigidChain(phase);
  let orientation = 1;
  const uncase = ease(seconds,.88,1.77);
  const packFit = ease(seconds,1.08,1.89);
  const caseLeft = -.052, caseRight = .851;
  const caseTop = .182, caseBase = -.171, caseNear = .278, caseFar = -.278;
  function face(hex, ...verts) {
    surface(hex, verts, 0);
  }
  function photoFace(hex, material, uv, ...verts) {
    surface(hex, verts, material, uv);
  }
  function surface(hex, verts, material, uv) {
    if (fittingCore && packFit < 1) {
      verts = verts.map(([x,y,z]) => [x,y*mix(.63,1,packFit),z*mix(.83,1,packFit)]);
    }
    const base = minus(verts[1],verts[0]);
    const normal = unit(cross(base, minus(verts[2],verts[0])));
    const illumination = .63 + .41*Math.max(0,dot(normal, light)*orientation) + .10*Math.max(0,dot(normal,bounce)*orientation);
    const glint = .092*Math.pow(Math.max(0,dot(normal,specular)*orientation),12);
    const [r,g,b] = colour(hex);
    const tint = [Math.min(1,r*illumination+glint),Math.min(1,g*illumination+glint*.77),Math.min(1,b*illumination+glint*.64)];
    if (!uv) {
      const across = unit(base);
      const along = cross(normal,across);
      uv = verts.map(p => {
        const q=minus(p,verts[0]);
        return [dot(q,across),dot(q,along)];
      });
    }
    surfaces.push({ tint, verts, uv, material });
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
  function cord(points, radius, hex, guide = [0,1,0], depth = radius) {
    const sides = 5;
    const rings = points.map((p,i) => {
      const tangent = unit(minus(points[Math.min(i+1,points.length-1)],points[Math.max(i-1,0)]));
      const wide = unit(cross(tangent,guide));
      const high = cross(wide,tangent);
      return Array.from({ length:sides }, (_,j) => {
        const a=j*tau/sides;
        return p.map((c,k)=>c+wide[k]*radius*Math.cos(a)+high[k]*depth*Math.sin(a));
      });
    });
    for (let i=1;i<rings.length;i++) {
      for (let j=0;j<sides;j++) {
        const k=(j+1)%sides;
        face(hex,rings[i-1][j],rings[i][j],rings[i][k],rings[i-1][k]);
      }
    }
  }
  function cushion(move, x, y, length, width, height, paint, material) {
    // Four rounded corners and three height rings form a padded shell.
    const outline = [];
    const radius = .040;
    for (let corner=0;corner<4;corner++) {
      const start=corner*Math.PI/2;
      const xc=Math.cos(start+Math.PI/4)*(length/2-radius)*Math.SQRT2;
      const zc=Math.sin(start+Math.PI/4)*(width/2-radius)*Math.SQRT2;
      for (let step=0;step<=3;step++) {
        const angle=start+step*Math.PI/6;
        outline.push([xc+radius*Math.cos(angle),zc+radius*Math.sin(angle)]);
      }
    }
    const uv = new Map();
    const rings = [[.90,0],[1,.36],[.973,.77],[.85,.97]].map(([s,h]) =>
      outline.map(([u,v]) => {
        const p = move(x+u*s,y+h*height,v*s);
        uv.set(p,[.5+v*s/width,.5-u*s/length]);
        return p;
      }));
    const paddedFace = (hex, ...points) => photoFace(hex,material,points.map(p=>uv.get(p)),...points);
    for (let level=1;level<rings.length;level++) {
      const lower=rings[level-1], upper=rings[level];
      for (let i=0;i<outline.length;i++) {
        const j=(i+1)%outline.length;
        paddedFace(paint[level-1],lower[i],upper[i],upper[j],lower[j]);
      }
    }
    const rim=rings.at(-1);
    const dome=move(x,y+height,0);
    uv.set(dome,[.5,.5]);
    for (let i=0;i<outline.length;i++) paddedFace(paint[3],dome,rim[(i+1)%rim.length],rim[i]);
    return rings[2];
  }
  let fittingCore = true;
  const rail = "#ffc294", black = "#262724";
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
        const shade = side === 1 ? "#562c1d" : "#48261b";
        const wingUV = (station,t) => [station[0]/span,1-t];
        const shellMaterial = index === 1 ? 5 : 1;
        const edge = (u,v,h,hex) => photoFace(hex,shellMaterial,
          [wingUV(a,u),wingUV(a,v),wingUV(b,v),wingUV(b,u)],wing(a,u,h),wing(a,v,h),wing(b,v,h),wing(b,u,h));
        edge(0,.61,0,shade);
        edge(.61,.96,0,side===1 ? "#925032" : "#7f4027");
        edge(.96,1,.001,rail);
        edge(0,.045,.003,"#76362d");
        face(band,wing(a,1),wing(a,1,-.011),wing(b,1,-.011),wing(b,1));
        const outside = (lo,hi,hex) => photoFace(hex,shellMaterial,
          [wingUV(a,lo),wingUV(b,lo),wingUV(b,hi),wingUV(a,hi)],
          wing(a,lo,-.011),wing(b,lo,-.011),wing(b,hi,-.011),wing(a,hi,-.011));
        outside(0,.25,"#4c2c1c");
        outside(.25,.63,"#a44822");
        const c=wing(a,.63,-.011), d=wing(b,.63,-.011);
        const e=wing(b,.966,-.011), f=wing(a,.966,-.011);
        photoFace("#c3693b",shellMaterial,[wingUV(a,.63),wingUV(b,.63),wingUV(b,.966)],c,d,e);
        photoFace("#c87648",shellMaterial,[wingUV(a,.63),wingUV(b,.966),wingUV(a,.966)],c,e,f);
        const lifted = ([x,y,z]) => [x,y+(phase.settle*.0007+.0011),z];
        face("#da9060",lifted(c),lifted(point(c,d,.023)),lifted(point(e,d,.018)),lifted(e));
        face("#f3a477",f,e,wing(b,1,-.011),wing(a,1,-.011));
        face("#b07445",wing(a,.062,-.012),wing(b,.062,-.012),wing(b,.073,-.012),wing(a,.073,-.012));
        if (inner) {
          // Each curved shoulder stays hinged to its own cheek. The four pieces
          // meet at the centre and under the caps when the cockpit oval opens.
          const curl = mix(2.92,.02,settle);
          const apertureEnd = tandem ? .96 : .69;
          const shoulder = (u, t, lift=0) => {
            const [x,w,p] = a.map((v,k)=>mix(v,b[k],u));
            const near = w+p*Math.cos(angle);
            const open = .294*Math.sqrt(Math.max(0,1-(u/apertureEnd)**2));
            const spread = w+p*Math.cos(1.10)-Math.max(.003,open);
            return move(x,.007+p*Math.sin(angle)+spread*t*Math.sin(curl)+lift,
              side*(near-spread*t*Math.cos(curl)));
          };
          const edgeSteps = [0,.16,.32,.48,.60,.73,.84,.92,1].map(v=>v*apertureEnd);
          const deckSteps = [...edgeSteps, (1+apertureEnd)*.5, 1];
          for (let i=1;i<deckSteps.length;i++) {
            const a=deckSteps[i-1], b=deckSteps[i];
            photoFace(side === 1 ? "#bd6538" : "#cf7848",2,[[a,.30],[a,.74],[b,.74],[b,.30]],
              shoulder(a,0),shoulder(a,1),shoulder(b,1),shoulder(b,0));
          }
          cord(edgeSteps.map(u=>shoulder(u,1,.010)),.016,"#222728");
        }
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
      ["#513421","#31251d","#2e2720"],.004);
    for (const offset of [-.055,.055]) {
      if (inner) block(move,span*.5,.020,offset,span*.965,.007,.009,["#845232","#60422c","#4a3023"],.002);
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
          const textureID = index === 1 ? 6 : 2;
          const across = side === 1 ? .81 : .19;
          const au=a[0]/span, bu=b[0]/span;
          photoFace(side === 1 ? "#e4925f" : "#b76537",textureID,[[au,.5],[au,across],[bu,across]],u,q,w);
          photoFace(side === 1 ? "#d38351" : "#c17040",textureID,[[au,.5],[bu,across],[bu,.5]],u,w,v);
          face("#8f4527",q,cap(a,side,-.013),cap(b,side,-.013),w);
          face(band,cap(a,0,-.013),cap(b,0,-.013),cap(b,side,-.013),cap(a,side,-.013));
        }
      }
      for (const side of [-1,1]) {
        cord([
          cap([.072,.192,.244],side,.014),
          cap([.24,0,.0],0,.021),
          cap([.42,.117,.166],-side,.016),
        ],.007,"#252721");
        for (const x of [.072,.42]) {
          block(capTransform,x,-.24*Math.pow(x/span,1.62)+.005,side*(x<.2?.282:.197),
            .042,.014,.035,["#434139","#272824","#25241e"],.004);
        }
      }
      block(capTransform,.695,-.149,0,.091,.019,.057,
        ["#4a3f3c","#272727","#222326"],.004);
    }
    if (!inner) continue;

    if (sign === 1 || tandem) {
      const atSeat = tandem ? .48 : .247;
      const padded = ["#171b1a","#242a2a","#2a3030","#272d2d"];
      cushion(move,atSeat,.018,.37,.36,.063,padded,3);
      const angle = mix(.10,.95,phase.seat);
      const pivot = atSeat+sign*.158;
      const back = (x,y,z) => move(pivot+sign*(x*Math.cos(angle)-y*Math.sin(angle)),.065+x*Math.sin(angle)+y*Math.cos(angle),z);
      const piping = cushion(back,.141,0,.286,.382,.067,padded,4);
      cord([...piping,piping[0]],.0033,"#646761",[.7,.3,.6]);
    }
  }

  fittingCore = false;
  orientation = 1;

  // The front skin and rear tray open on opposite long edges. Their
  // reinforcement folds tuck into the linked end leaves beneath each cap.
  for (const side of [-1,1]) {
    const front = side === 1;
    const leaf = chain[front ? 1 : 3].move;
    const dock = ease(seconds,1.34,3.18);
    const angle = mix(0,front ? -1.64 : 1.12,uncase);
    const depth = front ? caseNear : caseFar;
    const hingeY = front ? caseTop : caseBase;
    const near = (x,y,z) => {
      const across = z-depth, height = y-hingeY;
      const opened = [x,hingeY+height*Math.cos(angle)-across*Math.sin(angle),
        depth+height*Math.sin(angle)+across*Math.cos(angle)];
      const along = (caseRight-x)/(caseRight-caseLeft);
      const bed = leaf(.06+along*.34,(front ? -1 : 1)*(.004+.015*(caseTop-y)),-side*(.04+.22*z));
      return point(opened,bed,dock);
    };
    const bevel = .013, x0=caseLeft, x1=caseRight, y0=caseBase, y1=caseTop;
    const rim = depth-side*bevel;
    const skin = [
      near(x0+bevel,y0+bevel,depth), near(x1-bevel,y0+bevel,depth),
      near(x1-bevel,y1-bevel,depth), near(x0+bevel,y1-bevel,depth),
    ];
    const lip = [near(x0,y0,rim),near(x1,y0,rim),near(x1,y1,rim),near(x0,y1,rim)];
    const skinUV = [[0,1],[1,1],[1,0],[0,0]];
    const enamel = (paint, uv, corners) => photoFace(paint,7,front ? uv : uv.slice().reverse(),
      ...(front ? corners : corners.slice().reverse()));
    if (front) {
      const fold = (left, right, rise) => {
        const leftY = y0+left, rightY = y0+right;
        const v = y => 1-(y-y0-bevel)/(y1-y0-2*bevel);
        return {
          uv: [[0,v(leftY)],[1,v(rightY)]],
          corners: [near(x0+bevel,leftY,depth),near(x1-bevel,rightY,depth+rise)],
        };
      };
      const ridge = fold(.092,.198,.008);
      const roll = fold(.106,.214,.003);
      enamel("#be7047",[skinUV[0],skinUV[1],ridge.uv[1],ridge.uv[0]],[skin[0],skin[1],ridge.corners[1],ridge.corners[0]]);
      enamel("#c1764d",[...ridge.uv,roll.uv[1],roll.uv[0]],[...ridge.corners,roll.corners[1],roll.corners[0]]);
      enamel("#c4774c",[...roll.uv,skinUV[2],skinUV[3]],[...roll.corners,skin[2],skin[3]]);
    } else {
      enamel("#ad5a37",skinUV,skin);
    }
    for (let i=0;i<4;i++) {
      const j=(i+1)%4;
      enamel(i===2 ? "#c4845b" : "#9a4d2f",skinUV,[lip[i],lip[j],skin[j],skin[i]]);
    }
    const middle = side*.004;
    const lidJoint = -.122;
    const ledge = front ? caseTop : caseBase;
    const endOfLid = front ? lidJoint+.0015 : middle;
    const farLedge = near(x0+bevel,ledge,endOfLid), farRidge = near(x1-bevel,ledge,endOfLid);
    enamel(front ? "#c08058" : "#8c4429",skinUV,front
      ? [lip[3],lip[2],farRidge,farLedge] : [farLedge,farRidge,lip[1],lip[0]]);
    if (!front) {
      enamel("#bf7e56",skinUV,[near(x1-bevel,y1-.004,lidJoint-.0015),near(x0+bevel,y1-.004,lidJoint-.0015),lip[3],lip[2]]);
      face("#693d2d",near(x1-bevel,y1-.008,lidJoint+.017),near(x0+bevel,y1-.008,lidJoint+.017),near(x0+bevel,y1-.008,lidJoint-.010),near(x1-bevel,y1-.008,lidJoint-.010));
    }
    for (const end of [0,1]) {
      const offset = end ? x1 : x0;
      const lo = side*.002;
      const corners=[near(offset,y0+.006,lo),near(offset,y0+.006,rim),
        near(offset,y1-.006,rim),near(offset,y1-.006,lo)];
      enamel(end ? "#8d4b31" : "#a55d3d",skinUV,end ? corners : corners.slice().reverse());
      // The narrow gasket seams retain the folded layers at each end.
      for (const height of [y0+.035,y0+.060,y0+.087]) {
        const seamX = offset + (end ? .001 : -.001);
        face("#60382a",near(seamX,height,lo),near(seamX,height,rim),
          near(seamX,height+.004,rim),near(seamX,height+.004,lo));
        face("#986244",near(seamX,height+.004,lo),near(seamX,height+.004,rim),
          near(seamX,height+.008,rim),near(seamX,height+.008,lo));
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
  for (const [packedX,x] of [[.16,.20],[.67,.68]]) {
    const wrap = x < .3 ? .230 : .309;
    const loose = [
      tie(x,.014,-.214), tie(x,mix(.13,-.028,grip),mix(-.223,-.185,grip)),
      tie(x,anchorY,anchorZ),
      tie(x,mix(.198,-.054,grip)+.05*slack,mix(.00,-.185,grip)),
      tie(x,mix(.187,-.048,grip)+.045*slack,mix(.184,-.177,grip)),
      tie(x,mix(.181,-.051,grip)+.03*slack,mix(wrap,-.166,grip)),
      tie(x,mix(.02,-.025,grip),mix(.242,-.155,grip)),
      tie(x,mix(-.141,-.019,grip),mix(.22,-.144,grip)),
    ];
    const lift = .105*slack;
    const belt = [
      [caseBase+.014,caseFar], [caseTop-.016,caseFar-.006],
      [caseTop+.006,caseFar+.017], [caseTop+.007,caseNear-.020],
      [caseTop-.013,caseNear+.008], [caseTop-.106-.026*slack,caseNear+.011+lift],
      [caseBase+.015,caseNear+.017+lift*.64], [caseBase-.006,caseNear-.015],
    ];
    const pull = packedX < .3 ? -1 : 1;
    const path = belt.map(([y,z],i)=>{
      const freeEnd = [0,0,.36,.65,1,.86,.25,0][i]*slack;
      return point([packedX+pull*.054*freeEnd,y+.045*freeEnd,z],loose[i],grip);
    });
    for (let j=0; j<path.length-1;j++) {
      const offset = minus(tie(x+mix(.018,.027,grip),0,0),tie(x,0,0));
      const a=path[j], b=path[j+1];
      const shift = (p,k,h=0) => p.map((v,i) => v + k*offset[i] + (i===1 ? h : 0));
      face("#252b31",shift(a,-1),shift(a,1),shift(b,1),shift(b,-1));
      face("#4f5150",shift(a,-1,.001),shift(a,-.77,.001),shift(b,-.77,.001),shift(b,-1,.001));
    }
    const buckle = point(point(path[4],path[5],.55),point(path[3],path[4],.24),grip);
    const buckleAngle = grip * Math.PI/2;
    const claspSwing = pull*.52*slack;
    const hardware = (dx,dy,dz) => {
      const up = dy*Math.sin(buckleAngle)+dz*Math.cos(buckleAngle);
      return [buckle[0]+dx*Math.cos(claspSwing)-up*Math.sin(claspSwing),
        buckle[1]+dx*Math.sin(claspSwing)+up*Math.cos(claspSwing),
        buckle[2]+dy*Math.cos(buckleAngle)-dz*Math.sin(buckleAngle)];
    };
    const buckleHeight = mix(.013,.025,grip);
    block(hardware,0,0,0,mix(.055,.088,grip),buckleHeight,mix(.047,.109,grip),
      ["#686960","#454945","#343936"],mix(.004,.008,grip));
    block(hardware,0,buckleHeight,0,mix(.033,.048,grip),mix(.003,.007,grip),mix(.031,.078,grip),
      ["#282f2e","#353c40","#30383c"],mix(.001,.002,grip));
  }
  // A rigid bail shares the two webbing anchors. Its open centre and dark
  // grip clear the packed silhouette. It folds flat as the straps release.
  const bailAngle = mix(-.13,-1.48,grip);
  const bail = (x,y,z) => point([x,caseTop+y,-.033+z],
    tie(x,anchorY+y*Math.cos(bailAngle)-z*Math.sin(bailAngle),anchorZ+y*Math.sin(bailAngle)+z*Math.cos(bailAngle)),grip);
  const handleLeft = mix(.244,.20,grip), handleRight = mix(.573,.68,grip);
  for (const x of [handleLeft,handleRight]) {
    block(bail,x,mix(-.003,-.014,grip),0,mix(.069,.083,grip),mix(.025,.060,grip),
      mix(.083,.094,grip),["#454944","#303531","#222622"],mix(.006,.009,grip));
  }
  const handle = Array.from({length:13},(_,i)=>bail(mix(handleLeft,handleRight,i/12),
    mix(.014,.030,grip)+mix(.085,.256,grip)*Math.pow(Math.sin(i*Math.PI/12),mix(.60,.71,grip)),0));
  cord(handle,mix(.018,.028,grip),"#282d29",[0,0,1],mix(.016,.018,grip));

  const carryDetail = plate && seconds === 0;
  const viewYaw = mix(.14,.30,ease(seconds,.60,4.38)) + yaw;
  const tilt = mix(.31,.62,ease(seconds,.92,3.70));
  const c=Math.cos(viewYaw), s=Math.sin(viewYaw), elevation=Math.sqrt(1-tilt*tilt);
  const diagonal = carryDetail ? .11 : mix(.10,.23,ease(seconds,.64,3.68));
  const dc=Math.sqrt(1-diagonal*diagonal);
  function project(x,y,z, target, offset) {
    if (tandem) { x *= 1.12; z *= 1.07; }
    const u=x*c+z*s, v=z*c-x*s, yv=y*elevation-v*tilt;
    const distance = v*elevation+y*tilt-.23*u;
    const near = 1 + .125*distance;
    target[offset] = near*(dc*u-diagonal*yv);
    target[offset+1] = near*(diagonal*u+dc*yv);
    target[offset+2] = .5-distance*.12;
  }
  const projectWorld = ([x,y,z]) => {
    const p = [];
    project(x,y,z,p,0);
    return p;
  };
  const frame = [Infinity,-Infinity,Infinity,-Infinity];
  function include(x,y) {
    frame[0]=Math.min(frame[0],x); frame[1]=Math.max(frame[1],x);
    frame[2]=Math.min(frame[2],y); frame[3]=Math.max(frame[3],y);
  }
  let vertices = 0, indices = 0, projected;
  const waterLevel = mix(-.31,.024,phase.settle);
  if (buffers) {
    const { hull, mirror, attributes, topology } = buffers;
    const updateUV = buffers.indexCount === 0;
    const reflects = seconds > 4.05;
    for (const { tint, verts, uv, material } of surfaces) {
      const first = vertices;
      for (let i=0;i<verts.length;i++,vertices++) {
        const [x,y,z] = verts[i];
        const offset = vertices*hullStride;
        project(x,y,z,hull,offset);
        include(hull[offset],hull[offset+1]);
        hull.set(tint,offset+3);
        // Photo UVs are fixed to the leaf. Procedural UVs can bend with webbing.
        if (updateUV || !material) {
          attributes[vertices*3] = uv[i][0];
          attributes[vertices*3+1] = uv[i][1];
          attributes[vertices*3+2] = material;
        }
        if (reflects) {
          const reflected = vertices*mirrorStride;
          project(x,2*waterLevel-y,z,mirror,reflected);
          mirror.set(tint,reflected+3);
        }
      }
      if (updateUV) {
        for (let i=1;i<verts.length-1;i++) {
          topology[indices++] = first;
          topology[indices++] = first+i;
          topology[indices++] = first+i+1;
        }
      }
    }
    if (vertices*hullStride > hull.length || indices > topology.length) throw new RangeError("Hull vertex count");
    if (updateUV) buffers.indexCount = indices;
  } else {
    projected = surfaces.map(({ verts }) => verts.map(projectWorld));
    for (const points of projected) for (const [x,y] of points) include(x,y);
  }
  const xCenter=(frame[0]+frame[1])*.5, yCenter=(frame[2]+frame[3])*.5;
  const nominal=carryDetail ? 1.19 : mix(1.37,.513,ease(seconds, .88, 3.48));
  const scale = Math.min(nominal, 1.81/(frame[1]-frame[0]), 1.51/((frame[3]-frame[2])*aspect));
  const departure = ease(seconds,.68,2.38);
  const packedY = mix(-.177,-.140,ease(aspect,1.28,2.24));
  const xOffset = carryDetail ? 0 : mix(-.079,-.145,ease(aspect,1.28,2.24))*(1-departure);
  const yOffset=carryDetail ? .08 : mix(mix(packedY,.063,departure),.155,phase.settle);
  const scaleY = scale*aspect;
  if (buffers) {
    const { hull, mirror } = buffers;
    for (let i=0;i<vertices;i++) {
      const offset = i*hullStride;
      // Interleave the attributes only at the upload boundary. Projection and
      // material lookup share one vertex per face corner instead of per triangle.
      hull[offset] = (hull[offset]-xCenter)*scale+xOffset;
      hull[offset+1] = (hull[offset+1]-yCenter)*scaleY+yOffset;
      hull[offset+6] = buffers.attributes[i*3];
      hull[offset+7] = buffers.attributes[i*3+1];
      hull[offset+8] = buffers.attributes[i*3+2];
      if (seconds > 4.05) {
        const reflected = i*mirrorStride;
        mirror[reflected] = (mirror[reflected]-xCenter)*scale+xOffset;
        mirror[reflected+1] = (mirror[reflected+1]-yCenter)*scaleY+yOffset;
      }
    }
  }
  function tessellate(mirrored) {
    const triangles=[];
    for (const [index, { tint, verts, uv, material }] of surfaces.entries()) {
      const points = mirrored ? verts.map(([x,y,z])=>projectWorld([x,2*waterLevel-y,z])) : projected[index];
      for (const p of points) {
        p[0]=(p[0]-xCenter)*scale+xOffset;
        p[1]=(p[1]-yCenter)*scale*aspect+yOffset;
      }
      for (let i=1;i<points.length-1;i++) {
        triangles.push({ tint, material, points:[points[0],points[i],points[i+1]], uv:[uv[0],uv[i],uv[i+1]] });
      }
    }
    return triangles;
  }
  const contact = .232*phase.settle;
  const shoreContact = 1-ease(seconds,.80,2.60);
  const contactY = mix(waterLevel,caseBase-.008,shoreContact);
  const contactZ = mix(contact,caseNear-.040,shoreContact);
  const contactX = shoreContact*(caseLeft+caseRight)/2;
  const [groundX,groundY] = projectWorld([contactX,contactY,contactZ]);
  const [leftX,leftY] = projectWorld([contactX-1,contactY,contactZ]);
  const [rightX,rightY] = projectWorld([contactX+1,contactY,contactZ]);
  const slope = (rightY-leftY)/(rightX-leftX)*aspect;
  const shadowCenter = (groundY-yCenter)*scale*aspect+yOffset;
  const shadowLimit = mix(.16,.23,shoreContact);
  const shadowX = Math.min(shadowLimit, Math.max(-shadowLimit, (groundX-xCenter)*scale+xOffset));
  const shadow = [
    Math.max(.23,(frame[1]-frame[0])*.50*scale),
    Math.max(.065,mix(.179,.087,phase.settle)*aspect*scale),
    mix(Math.max(-.64,shadowCenter),shadowCenter,shoreContact), shadowX,
  ];
  if (buffers) {
    buffers.vertexCount = vertices;
    buffers.shadow.set(shadow);
    buffers.slope = slope;
    buffers.reflects = seconds > 4.05;
    buffers.yOffset = yOffset;
    return;
  }
  return { triangles: tessellate(false), shadow, reflection: plate ? [] : tessellate(true), slope };
}
