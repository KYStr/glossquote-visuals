// Model dimensions are in metres. Y is height and the bottom chine is the hinge.
const stations = [
  [-1.65, .018, .035], [-1.35, .14, .165], [-.87, .238, .226],
  [-.42, .258, .240], [.42, .258, .240], [.87, .233, .226],
  [1.36, .133, .158], [1.65, .018, .035],
];
const shell = ["#f46034", "#e04725", "#ed5329", "#f36436", "#e34f29", "#f55f32", "#fd7540"];
const dark = "#262b2e";
const rail = "#ff9164";
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function unfolding(seconds) {
  const t = seconds % 8;
  if (t < 3) return smooth(t / 2.75);
  return 1 - smooth((t - 4.5) / 2.9);
}

function rgb(hex) {
  return hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
}

export function boatScene({ aspect, opened = 0, pack = false, yaw = 0, tandem = false }) {
  const triangles = [];
  const scale = Math.min(.48, aspect * .482);
  const size = tandem ? 1.12 : 1;
  const cosine = Math.cos(yaw), sine = Math.sin(yaw);
  const bottomY = pack ? -.17 : mix(-.035, -.09, opened);
  const project = ([x, y, z]) => {
    x *= size;
    const u = x * cosine + z * sine;
    const v = z * cosine - x * sine;
    return [
      (.940 * u + .342 * v) * scale,
      (.169 * u - .465 * v + .869 * y) * scale * aspect + bottomY,
      .50 - (-.297 * u + .816 * v + .495 * y) * .13,
    ];
  };
  // A continuous edge defines each hinged side. Both vertices on the outer
  // edge rotate by the same angle around the fixed chine edge of that bay.
  const hinge = (i, side) => [stations[i][0], 0, side * stations[i][1]];
  const gunwale = (i, side, fold = opened) => {
    const [x, floor, panel] = stations[i];
    const angle = side > 0 ? mix(.10, 1.13, fold) : mix(.60, 1.16, fold);
    return [x, panel * Math.sin(angle) + .055 * Math.pow(Math.abs(x) / 1.65, 4), side * (floor + panel * Math.cos(angle))];
  };
  const point = (a, b, f) => a.map((v, i) => mix(v, b[i], f));
  function face(hex, ...vertices) {
    const tint = rgb(hex);
    const projected = vertices.map(project);
    for (let i = 1; i < projected.length - 1; i++) {
      triangles.push({ tint, points: [projected[0], projected[i], projected[i + 1]] });
    }
  }
  function box(x, y, z, l, h, w, [top, front, end]) {
    const a = [x-l/2,y,z-w/2], b = [x+l/2,y,z-w/2], c = [x+l/2,y,z+w/2], d = [x-l/2,y,z+w/2];
    const raise = ([u,v,t]) => [u,v+h,t];
    face(top, raise(a), raise(b), raise(c), raise(d));
    face(front, d, c, raise(c), raise(d));
    face(front, a, b, raise(b), raise(a));
    face(end, a, d, raise(d), raise(a));
    face(end, b, c, raise(c), raise(b));
  }
  if (pack) {
    for (let layer = 0; layer < 4; layer++) {
      box(0, .016 + layer * .066, 0, .90 - .011 * layer, .063, .36 - .004 * layer,
        [layer === 3 ? "#fb6538" : "#582f29", layer % 2 ? "#d54424" : "#f15b31", "#b23620"]);
    }
    for (const x of [-.27, .27]) {
      box(x, .277, 0, .070, .014, .371, ["#363b37", "#222727", "#1e2221"]);
      box(x, .018, .190, .069, .27, .014, ["#363b37", "#222727", "#1e2221"]);
      box(x, .293, .068, .097, .025, .082, ["#c1c8bd", "#777c75", "#444a47"]);
    }
    box(0, .16, .239, .17, .045, .035, ["#363b37", "#222727", "#171a19"]);
    for (const x of [-.082, .082]) box(x, .16, .207, .039, .045, .09, [dark, dark, dark]);
  } else {
    for (let i = 0; i < stations.length - 1; i++) {
      const x = stations[i][0], next = stations[i + 1][0];
      face(i % 2 ? "#733228" : "#893b2b", hinge(i, -1), hinge(i + 1, -1), hinge(i + 1, 1), hinge(i, 1));
      for (const side of [-1, 1]) {
        const a = hinge(i, side), b = hinge(i+1, side), c = gunwale(i+1, side), d = gunwale(i, side);
        const lift = (vertex, offset = .0014) => [vertex[0], vertex[1] + offset, vertex[2]];
        const crease = point(a, d, .47), nextCrease = point(b, c, .47);
        face(side > 0 ? shell[i] : "#be4229", a, b, nextCrease, crease);
        face(side > 0 ? shell[(i+1) % shell.length] : "#f47b4c", crease, nextCrease, c, d);
        face("#823524", lift(a), lift(b), lift(point(b,c,.026)), lift(point(a,d,.026)));
        face(rail, lift(point(a,d,.94)), lift(point(b,c,.94)), lift(c), lift(d));
        face("#a4432a", lift(point(a,d,.07), .003), lift(point(point(a,b,.024),point(d,c,.024),.07), .003),
          lift(point(d,c,.024),.003), lift(d,.003));
        if (side > 0 && i > 0 && i < 6) {
          const panelPoint = (u,v) => lift(point(point(a,b,u),point(d,c,u),v), .005);
          face("#ffd5b4", panelPoint(.12,.70), panelPoint(.23,.70), panelPoint(.23,.735), panelPoint(.12,.735));
        }
      }
      if (i === 0 || i === 6) continue;
      face("#302b2b", [x,.007,-.093], [next,.007,-.093], [next,.007,.093], [x,.007,.093]);
    }
    // Each deck cap pivots around a transverse hinge at the cockpit edge.
    // The raised caps make the end folds visible before they meet the sides.
    for (const [outer, inner] of [[0, 2], [7, 5]]) {
      const pivot = stations[inner][0];
      const base = gunwale(inner, -1)[1];
      const angle = (outer === 0 ? .85 : 1.08) * (1 - smooth((opened - .10) / .90));
      const cap = (index, side) => {
        const [x, y, z] = gunwale(index, side, 1);
        const direction = Math.sign(stations[outer][0] - pivot);
        const distance = Math.abs(x - pivot);
        const height = y - gunwale(inner, -1, 1)[1];
        return [
          pivot + direction * (distance * Math.cos(angle) - height * Math.sin(angle)),
          base + height * Math.cos(angle) + distance * Math.sin(angle) + .008,
          z,
        ];
      };
      const crown = i => point(cap(i, -1), cap(i, 1), .5).map((v,n) => n === 1 ? v+.024 : v);
      for (let i = outer; i !== inner;) {
        const j = i + Math.sign(inner - outer);
        face("#b9472d", crown(i), crown(j), cap(j, -1), cap(i, -1));
        face("#fc7042", crown(i), crown(j), cap(j, 1), cap(i, 1));
        const pivotEdge = i === outer ? j : i;
        box(cap(pivotEdge, 1)[0], crown(pivotEdge)[1]+.001, 0, .024, .009, .07, [rail, "#bb492d", "#bb492d"]);
        i = j;
      }
      const a = cap(inner, -1), b = cap(inner, 1);
      const lip = ([x,y,z]) => [x,y-.024,z];
      face("#772f24", a, crown(inner), lip(crown(inner)), lip(a));
      face("#a3422b", crown(inner), b, lip(b), lip(crown(inner)));
    }
    const seats = tandem ? [-.46, .48] : [0];
    for (const x of seats) {
      box(x, .020, 0, .38, .04, .34, ["#383c3c", "#20282b", "#171d20"]);
      box(x - .18, .052, 0, .048, .11, .33, ["#565657", "#363e3e", "#23282b"]);
      for (const strip of [-.095, -.048, 0, .048, .095]) {
        box(x + .024, .061, strip, .255, .003, .012, ["#585452", dark, dark]);
      }
    }
    for (const x of [-1.435, 1.435]) {
      box(x, .047 + .049 * opened, 0, .13, .025, .060, ["#3e3531", "#241f20", "#282222"]);
    }
  }
  return { triangles, shadow: [
    scale * (pack ? .49 : 1.66 * size),
    scale * aspect * (pack ? .13 : mix(.29, .115, opened)),
    bottomY - scale * aspect * (pack ? .03 : mix(.062, .086, opened)),
  ] };
}
