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
  [[0, 0, -1], 0.31], [[-0.23, 0.09, 1], 0.34],
  [[1, 1, 0], 1.64], [[1, -1, 0], 1.71],
  [[-1, -1, 0], 1.67], [[-1, 1, 0], 1.64],
  [[0.77, 0.09, 1], 1.185], [[-1.23, 0.09, 1], 1.185],
  [[-0.23, 1.09, 1], 1.24], [[-0.23, -0.91, 1], 1.24],
  [[1, 0, -1], 1.17], [[-1, 0, -1], 1.17],
  [[0, 1, -1], 1.22], [[0, -1, -1], 1.22],
  [[0.77, 1.09, 1], 1.86], [[0.77, -0.91, 1], 1.93],
  [[-1.23, -0.91, 1], 1.89], [[-1.23, 1.09, 1], 1.86],
];

const vector = values => "vec3f(" + values.map(value => value.toFixed(4)).join(", ") + ")";
const planeArray = "array<vec4f, " + planes.length + ">(" + planes.map(([normal, offset]) =>
  `vec4f(${vector(normal)}, ${offset})`).join(",\n") + ")";

const environment = coordinate => `
  let backdrop = ${coordinate};
  let gridAt = backdrop + vec2f(0.38, -0.08);
  let minorGrid = abs(fract(gridAt * 3.0 + 0.5) - 0.5) / 3.0;
  let majorGrid = abs(fract(gridAt * 0.75 + 0.5) - 0.5) / 0.75;
  let paper = mix(vec3f(0.74, 0.80, 0.90), vec3f(0.98, 0.985, 1.0),
    clamp(0.78 + backdrop.y * 0.13 - backdrop.x * 0.08, 0.0, 1.0));
  let stripe = 1.0 - smoothstep(0.27, 0.28, abs(backdrop.x - 0.26 * backdrop.y + 0.46));
  let insetStripe = 1.0 - smoothstep(0.018, 0.024, abs(backdrop.x - 0.26 * backdrop.y - 0.06));
  let spectrumStripe = 1.0 - smoothstep(0.04, 0.045, abs(backdrop.x - 0.26 * backdrop.y - 0.13));
  let grid = (1.0 - smoothstep(0.003, 0.013, min(minorGrid.x, minorGrid.y))) * 0.13 +
    (1.0 - smoothstep(0.005, 0.015, min(majorGrid.x, majorGrid.y))) * 0.10;
  var field = mix(paper, vec3f(0.010, 0.052, 0.94), stripe);
  field = mix(field, vec3f(0.02, 0.18, 0.74), insetStripe);
  field = mix(field, vec3f(0.41, 0.66, 0.99), spectrumStripe * 0.5);
  field *= 1.0 - grid;
`;

const specimen = defineShader({
  name,
  props: { yaw: { default: 0 }, material: { default: 0 }, speed: { default: 1 } },
  animatedTime: { speed: "speed" },
  paint: wgsl`
    let screen = (uv - vec2f(0.52, 0.475)) * vec2f(aspect, -1.0) * max(3.18, 3.0 / aspect);
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

    if (near >= far || far <= 0.0) {
      ${environment("(eye + ray * ((-2.05 - eye.z) / ray.z)).xy")}
      let softShadow = exp(-dot((screen - vec2f(0.13, -1.14)) * vec2f(1.0, 5.7),
                               (screen - vec2f(0.13, -1.14)) * vec2f(1.0, 5.7)) * 3.0);
      let dither = fract(sin(dot(uv * viewport, vec2f(12.9898, 78.233))) * 43758.5453);
      return vec4f(field * (1.0 - 0.20 * softShadow) + (dither - 0.5) * 0.003, 1);
    }

    let hit = origin + near * heading;
    let geometricNormal = normalize(nearNormal);
    let facing = abs(geometricNormal.z);
    let flute = sin(hit.x * 39.0);
    let etched = vec3f(
      sin(hit.x * 121.0 + hit.y * 174.0) * cos(hit.y * 215.0),
      cos(hit.x * 181.0 - hit.y * 211.0) * sin(hit.x * 177.0), 0.0);
    var normal = geometricNormal;
    if (material == 1.0) { normal = normalize(normal + etched * 0.072 * facing); }
    if (material == 2.0) { normal = normalize(normal + vec3f(flute * 0.24 * facing, 0, 0)); }

    var transmitted = vec3f(0);
    for (var channel = 0u; channel < 3u; channel += 1u) {
      let ior = 1.504 + f32(channel) * 0.023;
      var insideRay = refract(heading, normal, 1.0 / ior);
      var insideOrigin = hit + insideRay * 0.0002;
      var rayLength = 0.0;
      var outsideRay = vec3f(0);
      var exitAt = insideOrigin;
      for (var bounce = 0u; bounce < 2u; bounce += 1u) {
        var untilExit = 100.0;
        var exitNormal = vec3f(0, 0, -1);
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
        rayLength += untilExit;
        exitAt = insideOrigin + untilExit * insideRay;
        exitNormal = normalize(exitNormal);
        outsideRay = refract(insideRay, -exitNormal, ior);
        if (length(outsideRay) > 0.0001) { break; }
        insideRay = reflect(insideRay, exitNormal);
        insideOrigin = exitAt + insideRay * 0.0002;
      }

      let worldExit = objectToWorld * exitAt;
      let worldRay = objectToWorld * outsideRay;
      if (worldRay.z < -0.06) {
        let receiver = worldExit + worldRay * ((-2.05 - worldExit.z) / worldRay.z);
        ${environment("receiver.xy")}
        if (material == 1.0) {
          let broadStripe = 1.0 - smoothstep(0.08, 0.64, abs(receiver.x - 0.26 * receiver.y + 0.46));
          let diffuse = mix(vec3f(0.81, 0.88, 0.96), vec3f(0.07, 0.28, 0.84), broadStripe);
          field = mix(field, diffuse, 0.72 * facing);
        }
        let absorption = exp(-vec3f(0.16, 0.052, 0.026) * rayLength);
        transmitted[channel] = field[channel] * absorption[channel];
      } else {
        let internalReflection = 0.35 + 0.48 * abs(insideRay.y);
        transmitted[channel] = vec3f(0.29, 0.54, 0.94)[channel] * internalReflection;
      }
    }

    let reflected = objectToWorld * reflect(heading, normal);
    let lightStrip = pow(max(0.0, dot(reflected, normalize(vec3f(-0.67, 0.76, 0.68)))), 15.0);
    let fillStrip = pow(max(0.0, dot(reflected, normalize(vec3f(0.71, 0.35, 0.64)))), 22.0);
    let fresnel = 0.045 + 0.91 * pow(1.0 - clamp(dot(-heading, normal), 0.0, 1.0), 4.2);
    let reflectiveField = vec3f(0.39, 0.54, 0.86) + lightStrip * 0.56 + fillStrip * 0.35;
    let thinFilm = 0.5 + 0.5 * cos(vec3f(0, 2.094, 4.189) + dot(hit, vec3f(4.7, 6.9, 3.1)) + 6.0 * fresnel);
    let facetEdge = 1.0 - smoothstep(0.0, 0.05, far - near);
    let polish = lightStrip * 0.30 + fillStrip * 0.16;
    var color = mix(transmitted, reflectiveField, fresnel) + thinFilm * (fresnel * 0.21 + facetEdge * 0.16);
    color += vec3f(polish);
    if (material == 2.0) { color *= 0.95 + 0.05 * flute; }
    return vec4f(clamp(color, vec3f(0), vec3f(1)), 1.0);
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
