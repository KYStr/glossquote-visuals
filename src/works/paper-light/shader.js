import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";

export const PAPER_PERIOD_SECONDS = 8;
const stocks = { dawn: 0, honey: 1, overcast: 2 };

function grain(name, coordinates, salt) {
  return `
    let ${name}Point = ${coordinates};
    let ${name}Cell = floor(${name}Point);
    let ${name}F = fract(${name}Point);
    let ${name}U = ${name}F * ${name}F * (3.0 - 2.0 * ${name}F);
    let ${name}A = fract(sin(dot(${name}Cell, vec2f(127.1, 311.7)) + ${salt}) * 43758.5453);
    let ${name}B = fract(sin(dot(${name}Cell + vec2f(1.0, 0.0), vec2f(127.1, 311.7)) + ${salt}) * 43758.5453);
    let ${name}C = fract(sin(dot(${name}Cell + vec2f(0.0, 1.0), vec2f(127.1, 311.7)) + ${salt}) * 43758.5453);
    let ${name}D = fract(sin(dot(${name}Cell + 1.0, vec2f(127.1, 311.7)) + ${salt}) * 43758.5453);
    let ${name} = mix(mix(${name}A, ${name}B, ${name}U.x), mix(${name}C, ${name}D, ${name}U.x), ${name}U.y) - 0.5;
  `;
}

// Invert a cylindrical bend to recover the sheet's material coordinates.
// The mark and fibres use those coordinates even as the silhouette flexes.
const paper = defineShader({
  name: "GlossQuoteCottonFold",
  animatedTime: { speed: "clockRate" },
  props: {
    clockRate: { default: 1 },
    lampAngle: { default: 38 },
    lampStock: { default: 0 },
  },
  paint: wgsl({
    body: `
      let cycle = time * ${2 * Math.PI / PAPER_PERIOD_SECONDS};
      let breath = 0.5 - 0.5 * cos(cycle);
      let lamp = (lampAngle - 90.0) * 0.014 + 0.29 * sin(cycle);
      let warmth = select(vec3f(1.0, 0.92, 0.79), vec3f(0.81, 0.92, 1.10), lampStock > 1.5);
      let lightColor = select(warmth, vec3f(1.14, 0.91, 0.66), lampStock > 0.5 && lampStock < 1.5);

      let width = clamp(aspect, 0.87, 1.85);
      let screen = (uv - 0.5) * vec2f(width, 1.0);
      let origin = vec2f(-0.035 * width, -0.09);
      let dx = screen - origin;
      let across = vec2f(0.961, -0.276);
      let down = vec2f(0.276, 0.961);
      let pos = vec2f(dot(dx, across), dot(dx, down));

      let curlX = pos.x + 0.17;
      let curve = -0.21 * curlX * curlX;
      let curveSlope = -0.42 * curlX;
      let sectionY = pos.y - curve;
      let hinge = 0.214 - 0.027 * breath;
      let radius = 0.316 - 0.071 * breath;
      let endTheta = (0.498 - hinge) / radius;
      let edgeY = hinge + radius * sin(endTheta);
      let edgeZ = radius * (1.0 - cos(endTheta));
      let theta = asin(clamp((sectionY - hinge) / radius, 0.0, sin(endTheta)));
      let materialV = select(sectionY, hinge + radius * theta, sectionY > hinge) + curve;
      let sheet = vec2f(pos.x, materialV);
      let upperX = 0.54 * width + 0.031;
      let coverage = max(pos.x - upperX, sectionY - edgeY);
      let aa = 1.15 / viewport.y;
      let face = 1.0 - smoothstep(-aa, aa, coverage);
      let thickness = 0.0055;
      let edge = 1.0 - smoothstep(-aa, aa, coverage - thickness);

      // The shadow is projected from the same raised rim and light direction.
      let lampPosition = vec3f(1.23 * sin(lamp), -0.48 + 0.47 * sin(cycle), 0.91);
      let rimLight = normalize(lampPosition - vec3f(screen.x, 0.28, edgeZ));
      let ground = vec2f(pos.x + edgeZ * dot(rimLight.xy, across) / rimLight.z,
                         pos.y + edgeZ * dot(rimLight.xy, down) / rimLight.z);
      let groundCurve = -0.21 * (ground.x + 0.17) * (ground.x + 0.17);
      let shadowDistance = max(ground.y - groundCurve - edgeY, ground.x - upperX);
      let shadow = 1.0 - smoothstep(-0.027, 0.037 + 0.16 * edgeZ, shadowDistance);
      let floorFalloff = max(0.0, 1.0 - 0.72 * length(screen - vec2f(-0.31, -0.24)));
      let detailScale = min(1.0, viewport.y / 480.0);
      ${grain("groundGrain", "pos * (260.0 * detailScale)", "9.7")}
      let underlay = vec3f(0.42, 0.104, 0.049) * (0.53 + 0.56 * floorFalloff) * (1.0 - 0.62 * shadow);
      let background = underlay + vec3f(0.0045 * groundGrain);
      let cut = vec3f(0.81, 0.67, 0.50) * (0.58 + 0.27 * max(0.0, dot(-down, rimLight.xy)) + 0.08 * groundGrain);
      let underSheet = mix(background, cut, edge);

      // Four concentric arch channels and their compressed shoulders.
      let mark = sheet - vec2f(-0.017, 0.198);
      let dome = vec2f(mark.x, min(mark.y, 0.0));
      let dist = max(length(dome), 0.0001);
      let grad = dome / dist;
      let spacing = 0.059;
      let ring = round((dist - 0.171) / spacing);
      let delta = dist - (0.171 + clamp(ring, 0.0, 3.0) * spacing);
      let trough = delta / 0.0093;
      let bevel = delta / 0.017;
      let pressed = exp(-trough * trough);
      let shoulder = exp(-bevel * bevel);
      let cap = 1.0 - smoothstep(0.137, 0.168, mark.y);
      let slope = cap * delta * (0.0105 * pressed / 0.00008649 - 0.0028 * shoulder / 0.000289);

      let fibreUV = vec2f(dot(sheet, vec2f(0.84, 0.54)), dot(sheet, vec2f(-0.54, 0.84)));
      ${grain("warp", "sheet * 71.0", "1.7")}
      ${grain("floss", "fibreUV * vec2f(183.0, 342.0) * detailScale + warp * 1.1", "3.3")}
      ${grain("lint", "fibreUV * vec2f(426.0, 210.0) * detailScale", "12.3")}
      let detail = vec2f(0.29 * floss + 0.035 * warp, 0.24 * lint - 0.045 * warp);
      let fiberDepth = slope * grad + detail;

      let curlSlope = tan(theta);
      let slopeV = curlSlope + fiberDepth.y / max(0.35, cos(theta));
      let slopeU = fiberDepth.x - curveSlope * (slopeV - fiberDepth.y);
      let surfaceNormal = normalize(vec3f(-across * slopeU - down * slopeV, 1.0));
      let height = radius * (1.0 - cos(theta));
      let lightVector = lampPosition - vec3f(screen, height);
      let light = normalize(lightVector);
      let exposure = 0.82 + 0.26 / (0.32 + dot(lightVector, lightVector));
      let diffuse = max(dot(surfaceNormal, light), 0.0);
      let sheen = pow(max(dot(surfaceNormal, normalize(light + vec3f(0.0, 0.0, 1.0))), 0.0), 12.0);
      let edgeBounce = 0.024 * smoothstep(hinge, edgeY, sectionY);
      let bounce = vec3f(1.0, 0.53, 0.30) * edgeBounce;
      let material = vec3f(0.93, 0.845, 0.70) * (1.0 + 0.031 * warp + 0.092 * floss + 0.078 * lint - 0.065 * cap * pressed);
      let surface = material * (vec3f(0.18, 0.195, 0.22) + lightColor * exposure * (0.20 + 0.57 * diffuse));
      let lit = surface + bounce + lightColor * (0.056 * sheen);
      return vec4f(mix(underSheet, lit, face), 1.0);
    `,
  }),
});

registerShader(paper);

function lampProps({ angle, preset }) {
  return { lampAngle: angle, lampStock: stocks[preset] };
}

export function applyPaperLight(renderer, settings) {
  renderer.update("paper", lampProps(settings));
}

export function initializePaperLight(canvas, options) {
  return initializeStandalone(canvas, [
    { id: "paper", type: "GlossQuoteCottonFold", props: lampProps(options.settings) },
  ], options);
}
