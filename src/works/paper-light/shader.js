import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";

export const PAPER_PERIOD_SECONDS = 8;
const stocks = { dawn: 0, honey: 1, overcast: 2 };

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
      let lamp = (lampAngle - 90.0) * 0.014 + 0.18 * sin(cycle);
      let light = normalize(vec3f(0.83 * sin(lamp), -0.76, 0.48 + 0.22 * cos(lamp)));
      let warmth = select(vec3f(1.0, 0.92, 0.79), vec3f(0.81, 0.92, 1.10), lampStock > 1.5);
      let lightColor = select(warmth, vec3f(1.14, 0.91, 0.66), lampStock > 0.5 && lampStock < 1.5);

      let width = clamp(aspect, 0.87, 1.85);
      let screen = (uv - 0.5) * vec2f(width, 1.0);
      let origin = vec2f(-0.035 * width, -0.09);
      let dx = screen - origin;
      let across = vec2f(0.961, -0.276);
      let down = vec2f(0.276, 0.961);
      let pos = vec2f(dot(dx, across), dot(dx, down));

      let hinge = 0.237 - 0.032 * breath;
      let radius = 0.237 + 0.048 * breath;
      let endTheta = (0.502 - hinge) / radius;
      let edgeY = hinge + radius * sin(endTheta);
      let edgeZ = radius * (1.0 - cos(endTheta));
      let theta = asin(clamp((pos.y - hinge) / radius, 0.0, sin(endTheta)));
      let materialV = select(pos.y, hinge + radius * theta, pos.y > hinge);
      let sheet = vec2f(pos.x, materialV);
      let upperX = 0.456 * width + 0.031;
      let coverage = max(pos.x - upperX, pos.y - edgeY);
      let aa = 1.15 / viewport.y;
      let face = 1.0 - smoothstep(-aa, aa, coverage);
      let thickness = 0.0055;
      let edge = 1.0 - smoothstep(-aa, aa, coverage - thickness);

      // The shadow is projected from the same raised rim and light direction.
      let ground = vec2f(pos.x + edgeZ * dot(light.xy, across) / light.z,
                         pos.y + edgeZ * dot(light.xy, down) / light.z);
      let shadowDistance = max(ground.y - edgeY, ground.x - upperX);
      let shadow = 1.0 - smoothstep(-0.027, 0.063, shadowDistance);
      let floorFalloff = max(0.0, 1.0 - 0.72 * length(screen - vec2f(-0.31, -0.24)));
      let groundGrain = sin(302.0 * pos.x + 225.0 * pos.y + sin(pos.y * 307.0));
      let underlay = vec3f(0.42, 0.104, 0.049) * (0.53 + 0.56 * floorFalloff) * (1.0 - 0.62 * shadow);
      let background = underlay + vec3f(0.0045 * groundGrain);
      let cut = vec3f(0.77, 0.61, 0.44) * (0.62 + 0.2 * max(0.0, dot(down, light.xy)));
      let underSheet = mix(background, cut, edge);

      // Four concentric arch channels and their compressed shoulders.
      let mark = sheet - vec2f(-0.017, 0.177);
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
      let cap = 1.0 - smoothstep(0.116, 0.146, mark.y);
      let slope = cap * delta * (0.00325 * pressed / 0.00008649 - 0.0009 * shoulder / 0.000289);

      let grainScale = min(1.0, viewport.y / 490.0);
      let yarnX = 142.0 * sheet.x + 226.0 * sheet.y;
      let yarnY = 283.0 * sheet.x - 154.0 * sheet.y;
      let tuft = sin(393.0 * sheet.x + 362.0 * sheet.y);
      let fibre = sin(yarnX + 1.8 * sin(yarnY)) * sin(yarnY + 0.9 * sin(yarnX));
      let detail = grainScale * vec2f(0.053 * fibre + 0.025 * tuft, 0.048 * sin(yarnY + tuft));
      let grainCell = floor(sheet * min(490.0, viewport.y * 0.83));
      let speckle = fract(sin(dot(grainCell, vec2f(127.1, 311.7))) * 43758.5453) - 0.5;
      let fiberDepth = slope * grad + detail;

      let slopeV = tan(theta) + fiberDepth.y;
      let surfaceNormal = normalize(vec3f(-across * fiberDepth.x - down * slopeV, 1.0));
      let diffuse = max(dot(surfaceNormal, light), 0.0);
      let sheen = pow(max(dot(surfaceNormal, normalize(light + vec3f(0.0, 0.0, 1.0))), 0.0), 12.0);
      let edgeBounce = 0.025 * smoothstep(hinge, edgeY, pos.y);
      let bounce = vec3f(1.0, 0.53, 0.30) * edgeBounce;
      let material = vec3f(0.91, 0.825, 0.685) * (1.0 + 0.022 * fibre + 0.036 * speckle - 0.039 * cap * pressed);
      let surface = material * (vec3f(0.27, 0.28, 0.30) + lightColor * (0.22 + 0.48 * diffuse));
      let lit = surface + bounce + lightColor * (0.045 * sheen);
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
