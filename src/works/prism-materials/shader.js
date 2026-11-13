import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";

const id = "prism-specimen";
const name = "PrismSpecimen";
const cycle = 12;
const finishes = { clear: 0, satin: 1, ribbed: 2 };

const clipPlane = (origin, direction, normal, offset, near, far, nearNormal, farNormal) => `
  let numerator = ${offset} - dot(${normal}, ${origin});
  let denominator = dot(${normal}, ${direction});
  if (abs(denominator) < 0.00001) {
    if (numerator < 0.0) { ${near} = 100.0; }
  } else {
    let crossAt = numerator / denominator;
    if (denominator < 0.0 && crossAt > ${near}) {
      ${near} = crossAt;
      ${nearNormal} = ${normal};
    }
    if (denominator > 0.0 && crossAt < ${far}) {
      ${far} = crossAt;
      ${farNormal} = ${normal};
    }
  }
`;

// The back is flat. The front is a shallow wedge. Diagonal planes cut the
// corners and bevel the join between the body and both broad faces.
const planes = [
  [[1, 0, 0], 0.95], [[-1, 0, 0], 0.95],
  [[0, 1, 0], 1.01], [[0, -1, 0], 1.01],
  [[0, 0, -1], 0.087], [[-0.065, 0.025, 1], 0.112],
  [[1, 1, 0], 1.78], [[1, -1, 0], 1.81],
  [[-1, -1, 0], 1.79], [[-1, 1, 0], 1.78],
  [[0.935, 0.025, 1], 1.023], [[-1.065, 0.025, 1], 1.023],
  [[-0.065, 1.025, 1], 1.083], [[-0.065, -0.975, 1], 1.083],
  [[1, 0, -1], 1.010], [[-1, 0, -1], 1.010],
  [[0, 1, -1], 1.070], [[0, -1, -1], 1.070],
  [[0.935, 1.025, 1], 1.853], [[0.935, -0.975, 1], 1.883],
  [[-1.065, -0.975, 1], 1.863], [[-1.065, 1.025, 1], 1.853],
];

const vector = values => "vec3f(" + values.map(value => value.toFixed(4)).join(", ") + ")";
const planeArray = "array<vec4f, " + planes.length + ">(" + planes.map(([normal, offset]) =>
  `vec4f(${vector(normal)}, ${offset})`).join(",\n") + ")";

const environment = (coordinate, blur) => `
  let backdrop = ${coordinate};
  let spread = ${blur};
  let gridAt = backdrop + vec2f(0.38, -0.08);
  let minorGrid = abs(fract(gridAt * 3.0 + 0.5) - 0.5) / 3.0;
  let majorGrid = abs(fract(gridAt * 0.75 + 0.5) - 0.5) / 0.75;
  let paper = mix(vec3f(0.74, 0.80, 0.90), vec3f(0.98, 0.985, 1.0),
    clamp(0.78 + backdrop.y * 0.13 - backdrop.x * 0.08, 0.0, 1.0));
  let stripe = 1.0 - smoothstep(0.27 - spread, 0.28 + spread, abs(backdrop.x - 0.26 * backdrop.y + 0.46));
  let insetStripe = (1.0 - smoothstep(0.018, 0.024 + spread, abs(backdrop.x - 0.26 * backdrop.y - 0.06))) *
    (0.024 / (0.024 + spread));
  let spectrumStripe = (1.0 - smoothstep(0.04, 0.045 + spread, abs(backdrop.x - 0.26 * backdrop.y - 0.13))) *
    (0.045 / (0.045 + spread));
  let minorWidth = 0.013 + spread * 0.32;
  let majorWidth = 0.015 + spread * 0.32;
  let grid = (1.0 - smoothstep(0.003, minorWidth, min(minorGrid.x, minorGrid.y))) * 0.13 * (0.013 / minorWidth) +
    (1.0 - smoothstep(0.005, majorWidth, min(majorGrid.x, majorGrid.y))) * 0.10 * (0.015 / majorWidth);
  var field = mix(paper, vec3f(0.010, 0.052, 0.94), stripe);
  field = mix(field, vec3f(0.02, 0.18, 0.74), insetStripe);
  field = mix(field, vec3f(0.41, 0.66, 0.99), spectrumStripe * 0.5);
  field *= 1.0 - grid;
`;

const roomLighting = (direction, origin) => `
  let roomRay = ${direction};
  let roomPoint = ${origin} + 2.3 * roomRay;
  let ceiling = smoothstep(-0.24, 0.55, roomRay.y);
  let windowAt = roomPoint.x + roomPoint.y * 0.21;
  let windowWidth = smoothstep(-0.4, -0.15, windowAt) * (1.0 - smoothstep(1.1, 1.4, windowAt));
  let windowHeight = smoothstep(-1.0, -0.77, roomPoint.y) * (1.0 - smoothstep(0.35, 0.47, roomPoint.y));
  let reflectedSill = 1.0 - smoothstep(0.06, 0.3, abs(roomPoint.y + 0.19 - 0.16 * roomPoint.x));
  let room = mix(vec3f(0.17, 0.24, 0.36), vec3f(0.87, 0.93, 0.99), ceiling) +
    vec3f(0.44, 0.49, 0.54) * windowWidth * windowHeight +
    vec3f(0.24, 0.26, 0.28) * reflectedSill;
`;

const specimen = defineShader({
  name,
  props: { yaw: { default: 0 }, material: { default: 0 }, speed: { default: 1 } },
  animatedTime: { speed: "speed" },
  paint: wgsl`
    let screen = (uv - vec2f(0.52, 0.475)) * vec2f(aspect, -1.0) * max(2.88, 2.8 / aspect);
    let ray = normalize(vec3f(screen, -5.25));
    let eye = vec3f(0.0, 0.0, 5.25);
    let orbit = time * ${2 * Math.PI / cycle};
    let yTurn = -0.49 + yaw * 0.0174533 + sin(orbit) * 0.135;
    let xTurn = 0.22 + cos(orbit) * 0.058;
    let zTurn = -0.23 + sin(orbit + 0.7) * 0.027;
    let cy = cos(yTurn);
    let sy = sin(yTurn);
    let cx = cos(xTurn);
    let sx = sin(xTurn);
    let cz = cos(zTurn);
    let sz = sin(zTurn);
    let roll = mat3x3f(vec3f(cz, sz, 0), vec3f(-sz, cz, 0), vec3f(0, 0, 1));
    let pitch = mat3x3f(vec3f(1, 0, 0), vec3f(0, cx, sx), vec3f(0, -sx, cx));
    let turn = mat3x3f(vec3f(cy, 0, -sy), vec3f(0, 1, 0), vec3f(sy, 0, cy));
    let objectToWorld = roll * turn * pitch;
    let worldToObject = transpose(objectToWorld);
    let origin = worldToObject * eye;
    let heading = worldToObject * ray;
    let facets = ${planeArray};
    var near = -100.0;
    var far = 100.0;
    var nearNormal = vec3f(0, 0, 1);
    var farNormal = vec3f(0, 0, -1);
    for (var i = 0u; i < ${planes.length}u; i += 1u) {
      let facet = facets[i];
      ${clipPlane("origin", "heading", "facet.xyz", "facet.w", "near", "far", "nearNormal", "farNormal")}
    }

    ${environment("(eye + ray * ((-2.05 - eye.z) / ray.z)).xy", "0.0")}
    let background = field;
    if (near >= far || far <= 0.0) { return vec4f(background, 1.0); }

    let hit = origin + near * heading;
    let geometricNormal = normalize(nearNormal);
    let facing = abs(geometricNormal.z);
    let flute = sin(hit.x * 27.0);
    let broadFace = smoothstep(0.84, 0.99, facing);
    var normal = geometricNormal;
    if (material == 2.0) { normal = normalize(normal + vec3f(flute * 0.16 * broadFace, 0, 0)); }

    var transmitted = vec3f(0);
    for (var channel = 0u; channel < 3u; channel += 1u) {
      let ior = 1.511 + (f32(channel) - 1.0) * 0.0035;
      var insideRay = refract(heading, normal, 1.0 / ior);
      var insideOrigin = hit + insideRay * 0.0002;
      var rayLength = 0.0;
      var outsideRay = vec3f(0);
      var exitAt = insideOrigin;
      for (var bounce = 0u; bounce < 2u; bounce += 1u) {
        var untilExit = 100.0;
        var exitNormal = vec3f(0, 0, -1);
        // A point strictly inside the back face cannot cross a different
        // plane first. Most front-face rays take this shorter path.
        let backDist = (-0.087 - insideOrigin.z) / min(insideRay.z, -0.00001);
        let backPoint = abs((insideOrigin + backDist * insideRay).xy);
        if (insideRay.z < -0.00001 && backDist > 0.0 && backPoint.x < 0.922 &&
            backPoint.y < 0.982 && backPoint.x + backPoint.y < 1.775) {
          untilExit = backDist;
        } else {
          for (var i = 0u; i < ${planes.length}u; i += 1u) {
            let facet = facets[i];
            let denom = dot(facet.xyz, insideRay);
            if (denom > 0.00001) {
              let crossAt = (facet.w - dot(facet.xyz, insideOrigin)) / denom;
              if (crossAt < untilExit) {
                untilExit = crossAt;
                exitNormal = facet.xyz;
              }
            }
          }
        }
        rayLength += untilExit;
        exitAt = insideOrigin + untilExit * insideRay;
        exitNormal = normalize(exitNormal);
        outsideRay = refract(insideRay, -exitNormal, ior);
        if (dot(outsideRay, outsideRay) > 0.0001) { break; }
        insideRay = reflect(insideRay, exitNormal);
        insideOrigin = exitAt + insideRay * 0.0002;
      }

      let worldExit = objectToWorld * exitAt;
      let emerged = dot(outsideRay, outsideRay) > 0.0001;
      let worldRay = objectToWorld * select(insideRay, outsideRay, emerged);
      let absorption = exp(-vec3f(0.20, 0.055, 0.035) * rayLength);
      ${roomLighting("worldRay", "worldExit")}
      var lightThroughGlass = room;
      if (emerged && worldRay.z < -0.18) {
        let receiver = worldExit + worldRay * ((-2.05 - worldExit.z) / worldRay.z);
        ${environment("receiver.xy", "select(0.007, 0.24 * broadFace + 0.01, material == 1.0)")}
        let wall = smoothstep(0.18, 0.5, -worldRay.z) *
          (1.0 - smoothstep(4.0, 7.0, length(receiver)));
        lightThroughGlass = mix(room, field, wall);
      }
      transmitted[channel] = lightThroughGlass[channel] * absorption[channel];
    }

    let reflected = objectToWorld * reflect(heading, normal);
    ${roomLighting("reflected", "objectToWorld * hit")}
    let lightStrip = pow(max(0.0, dot(reflected, normalize(vec3f(-0.67, 0.76, 0.68)))), 24.0);
    let viewCosine = clamp(dot(-heading, normal), 0.0, 1.0);
    let fresnel = 0.042 + 0.958 * pow(1.0 - viewCosine, 5.0);
    let path = far - near;
    let rim = (1.0 - smoothstep(0.003, 0.028, path)) * 0.19;
    let satinFace = select(0.0, 0.17 * broadFace, material == 1.0);
    let diffused = mix(transmitted, vec3f(0.88, 0.92, 0.97), satinFace);
    let color = mix(diffused, room + vec3f(lightStrip * 0.42), fresnel) + vec3f(rim);
    let coverage = smoothstep(0.0, 0.022, path);
    return vec4f(mix(background, clamp(color, vec3f(0), vec3f(1)), coverage), 1.0);
  `,
});

registerShader(specimen);

export function initializePrism(canvas, options) {
  return initializeStandalone(canvas, [{ id, type: name, props: {
    yaw: options.settings.angle, material: finishes[options.settings.finish],
  } }], options);
}

export function updatePrism(renderer, settings) {
  renderer.update(id, { yaw: settings.angle, material: finishes[settings.finish] });
}
