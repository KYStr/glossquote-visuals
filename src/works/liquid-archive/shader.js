import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";

export const SWEEP_SECONDS = 12;

// All distances are in scene units. The same solid model is used by the
// camera ray, finite-difference normals and the light's shadow ray.
const geometry = (point, distance, identify = false) => `
  let local = ${point} - vec3f(0.0, 0.805, 0.0);
  let tube = length(vec2f(length(local.xy) - 0.585, local.z * 1.10)) - 0.151;
  let foot = abs(${point} - vec3f(0.0, 0.113, 0.0)) - vec3f(0.319, 0.071, 0.182);
  let footDistance = length(max(foot, vec3f(0.0))) + min(max(foot.x, max(foot.y, foot.z)), 0.0) - 0.037;
  let cup = abs(vec2f(length(${point}.xz), ${point}.y - 1.561)) - vec2f(0.104, 0.065);
  let cupBody = length(max(cup, vec2f(0.0))) + min(max(cup.x, cup.y), 0.0) - 0.009;
  let opening = max(length(${point}.xz) - 0.082, 1.608 - ${point}.y);
  let cupDistance = max(cupBody, -opening);
  let candle = abs(vec2f(length(${point}.xz), ${point}.y - 1.751)) - vec2f(0.072, 0.153);
  let wax = length(max(candle, vec2f(0.0))) + min(max(candle.x, candle.y), 0.0) - 0.006;
  let wickY = clamp(${point}.y, 1.895, 1.949);
  let wickCenter = vec3f(0.008 + (wickY - 1.895) * 0.33, wickY, 0.009);
  let wick = length(${point} - wickCenter) - 0.007;
  let blend = max(0.135 - abs(tube - footDistance), 0.0) / 0.135;
  let metal = min(min(tube, footDistance) - blend * blend * 0.03375, cupDistance);
  ${distance} = min(min(metal, wax), wick);
  ${identify ? "material = select(select(1, 2, wax < metal), 3, wick < min(wax, metal));" : ""}
`;

const HaloStudio = registerShader(defineShader({
  name: "FormeHaloStudio",
  props: {
    lightAngle: { default: 28 },
    sweep: { default: 1 },
    brushed: { default: 0 },
    compact: { default: 0 },
  },
  paint: wgsl`
    // Camera and studio coordinates. We orbit the light; the camera and sculpture are fixed.
    let tau = 6.28318530718;
    let shot = (uv - vec2f(mix(0.68, 0.51, compact), mix(0.50, 0.48, compact))) * vec2f(aspect, -1.0);
    let forward = normalize(vec3f(0.0, -0.087, -1.0));
    let right = vec3f(1.0, 0.0, 0.0);
    let up = cross(right, forward);
    let camera = vec3f(0.0, 1.49, 4.85);
    let ray = normalize(forward * mix(1.98, 1.84, compact) + right * shot.x + up * shot.y);
    let yaw = -0.35;
    let pose = mat3x3f(vec3f(cos(yaw), 0.0, -sin(yaw)), vec3f(0.0, 1.0, 0.0), vec3f(sin(yaw), 0.0, cos(yaw)));
    let objectCamera = transpose(pose) * camera;
    let objectRay = transpose(pose) * ray;
    let orbit = 90.0 - 62.0 * cos(time * tau / ${SWEEP_SECONDS}.0);
    let azimuth = radians(mix(lightAngle, orbit, sweep) - 90.0);
    let lightPosition = vec3f(sin(azimuth) * 2.6, 2.65, cos(azimuth) * 2.6 + 0.11);
    let lightRight = normalize(vec3f(cos(azimuth), 0.0, -sin(azimuth)));
    let keyColor = vec3f(1.0, 0.86, 0.72);

    // Analytic floor and rear wall limit the object march and receive the studio lights.
    let wallT = (-1.65 - camera.z) / ray.z;
    let floorT = -camera.y / min(-0.00001, ray.y);
    let roomT = min(floorT, wallT);
    let sphereOrigin = objectCamera - vec3f(0.0, 0.98, 0.0);
    let sphereB = dot(sphereOrigin, objectRay);
    let sphereH = sphereB * sphereB - dot(sphereOrigin, sphereOrigin) + 1.09;
    var t = max(0.0, -sphereB - sqrt(max(sphereH, 0.0)));
    let farT = min(roomT, -sphereB + sqrt(max(sphereH, 0.0)));
    var material = 0;
    var struck = false;
    if (sphereH > 0.0) {
      for (var i = 0; i < 68; i += 1) {
        if (t > farT) { break; }
        let q = objectCamera + objectRay * t;
        var d = 0.0;
        ${geometry("q", "d", true)}
        if (d < 0.00048) { struck = true; break; }
        t += max(0.00065, d * 0.91);
      }
    }

    if (!struck) {
      let p = camera + ray * roomT;
      let onFloor = floorT < wallT;
      let roomNormal = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), onFloor);
      let toLight = lightPosition - p;
      let lightDir = normalize(toLight);
      let stone = sin(p.x * 119.3 + p.y * 93.1) * sin(p.z * 86.5 + p.y * 78.8 - p.x * 128.2);
      let oak = sin(p.z * 112.0 + sin(p.x * 2.8 + p.z * 17.0) * 1.6) * sin(p.z * 46.0 + p.x * 0.5);
      let grain = 0.98 + select(stone * 0.023, oak * 0.066, onFloor);
      let upper = exp(-0.27 * dot(p - vec3f(0.5, 1.40, -1.65), p - vec3f(0.5, 1.40, -1.65)));
      let falloff = max(0.0, dot(roomNormal, lightDir)) / (1.0 + 0.15 * dot(toLight, toLight));
      var shadow = 1.0;
      if (onFloor && length(p.xz) < 2.1) {
        let localOrigin = transpose(pose) * (p + roomNormal * 0.013);
        let localLight = transpose(pose) * lightDir;
        var travel = 0.035;
        for (var j = 0; j < 21; j += 1) {
          if (travel > length(toLight) || shadow < 0.025) { break; }
          let s = localOrigin + localLight * travel;
          var separation = 0.0;
          ${geometry("s", "separation")}
          shadow = min(shadow, 9.0 * max(separation, 0.0) / travel);
          travel += clamp(separation, 0.023, 0.35);
        }
      }
      let contact = select(1.0, mix(0.43, 1.0, smoothstep(0.18, 0.80, length(p.xz * vec2f(1.0, 1.6)))), onFloor);
      let backdrop = mix(vec3f(0.021, 0.030, 0.035), vec3f(0.113, 0.125, 0.122), upper);
      let shelf = mix(vec3f(0.025, 0.023, 0.021), vec3f(0.071, 0.057, 0.044), exp(-0.2 * dot(p.xz, p.xz)));
      let base = select(backdrop, shelf, onFloor);
      let setLight = exp(-0.73 * pow(p.x - p.y * 0.40 - 0.72, 2.0)) * smoothstep(0.0, 2.05, p.y);
      let wallFill = select(vec3f(0.056, 0.066, 0.063) * setLight, vec3f(0.0), onFloor);
      let pool = keyColor * falloff * shadow * select(0.085, 0.20, onFloor);
      let seam = select(1.0, mix(0.63, 1.0, smoothstep(0.0, 0.16, p.y)), !onFloor);
      return vec4f((base + wallFill + pool) * grain * contact * seam, 1.0);
    }

    let q = objectCamera + objectRay * t;
    let p = pose * q;
    var normalParts = vec3f(0.0);
    // Central differences follow each actual curved surface, including the inner wall.
    for (var axis = 0; axis < 3; axis += 1) {
      for (var side = -1; side <= 1; side += 2) {
        var samplePoint = q;
        samplePoint[axis] += f32(side) * 0.0012;
        var sampleDistance = 0.0;
        ${geometry("samplePoint", "sampleDistance")}
        normalParts[axis] += sampleDistance * f32(side);
      }
    }
    var localNormal = normalize(normalParts);
    let toLight = lightPosition - p;
    let direct = normalize(toLight);
    if (material == 3) { return vec4f(0.024, 0.018, 0.013, 1.0); }
    if (material == 2) {
      let diffuse = max(0.0, dot(pose * localNormal, direct));
      let waxRim = smoothstep(1.82, 1.91, q.y);
      return vec4f(vec3f(0.84, 0.75, 0.62) * (0.32 + diffuse * 0.37 + waxRim * 0.14), 1.0);
    }

    // Tool marks follow the section around the tube. The base and cup use straight passes.
    let ring = q.xy - vec2f(0.0, 0.805);
    let ringDirection = normalize(ring);
    let crossSection = atan2(q.z * 1.10, length(ring) - 0.585);
    let onRing = smoothstep(0.23, 0.34, q.y) * (1.0 - smoothstep(1.49, 1.58, q.y));
    let brushAxis = mix(q.y * 9.5 + q.z * 2.2, crossSection + 0.07 * ringDirection.x, onRing);
    let hairlines = 0.62 * sin(brushAxis * 137.0 + 1.9 * sin(q.x * 18.0 + q.z * 7.0)) +
      0.38 * sin(brushAxis * 91.0 + q.z * 49.0);
    let tooling = mix(vec3f(0.0, 1.0, 0.4), vec3f(ringDirection, 0.55), onRing);
    localNormal = normalize(localNormal + brushed * hairlines * 0.012 * tooling);
    let normal = pose * localNormal;
    let reflection = reflect(ray, normal);
    let ndv = max(0.0, dot(normal, -ray));
    let fresnel = pow(1.0 - ndv, 4.0);

    // Project the reflected ray onto the same rectangular light that illuminates the room.
    // Broadness grows on brushed steel, peak intensity decreases.
    let lightNormal = normalize(vec3f(0.0, 1.05, 0.0) - lightPosition);
    let lightUp = normalize(cross(lightNormal, lightRight));
    let towardEmitter = dot(reflection, lightNormal);
    let reflectedT = dot(toLight, lightNormal) / min(-0.0001, towardEmitter);
    let reflectedP = reflection * reflectedT - toLight;
    let emitterUV = vec2f(dot(reflectedP, lightRight), dot(reflectedP, lightUp));
    let roughness = mix(0.19, 0.55, brushed);
    let strip = (1.0 - smoothstep(0.29, 0.29 + roughness, abs(emitterUV.x))) *
      (1.0 - smoothstep(0.95, 1.18 + roughness, abs(emitterUV.y)));
    let grazingLight = smoothstep(0.0, 0.16, -towardEmitter) * step(0.0, reflectedT);
    let specular = strip * grazingLight;
    let softbox = exp(-1.55 * pow(emitterUV.x, 2.0) - 0.48 * pow(emitterUV.y, 2.0)) * grazingLight;

    // Reflection of the environment: the camera-side wall has a broad paper
    // sweep, a two-pane studio window and narrow flags. The opposite half is
    // the warm tabletop. These stay fixed when the key light travels.
    let bounce = 0.5 + 0.5 * reflection.y;
    let horizon = smoothstep(-0.36, 0.05, reflection.y);
    let ground = mix(vec3f(0.075, 0.051, 0.034), vec3f(0.29, 0.224, 0.159),
      smoothstep(0.12, 0.80, -reflection.y));
    let wall = mix(vec3f(0.118, 0.131, 0.132), vec3f(0.238, 0.257, 0.26), bounce);
    let wallShadow = exp(-22.0 * pow(reflection.x + 0.36 + reflection.y * 0.16, 2.0));
    let lighting = mix(ground, wall, horizon) * (1.0 - wallShadow * mix(0.72, 0.37, brushed));

    let towardFront = smoothstep(0.08, 0.38, reflection.z);
    let projection = reflection.xy / max(0.19, reflection.z);
    let windowUV = projection - vec2f(0.32, 0.21);
    let softness = mix(0.15, 0.47, brushed);
    let mainWindow = (1.0 - smoothstep(0.57, 0.57 + softness, abs(windowUV.x))) *
      (1.0 - smoothstep(0.62, 0.62 + softness, abs(windowUV.y)));
    let mullion = 1.0 - smoothstep(mix(0.022, 0.07, brushed), mix(0.058, 0.22, brushed), abs(windowUV.x + 0.08));
    let sill = smoothstep(-0.62, -0.24, windowUV.y);
    let panes = mainWindow * sill * (1.0 - mullion * mix(0.66, 0.22, brushed)) * towardFront;
    let card = exp(-2.6 * pow(projection.x + 0.71 - projection.y * 0.15, 2.0)) *
      (1.0 - smoothstep(0.64, 1.17, abs(projection.y + 0.24))) * towardFront;
    let lightWell = pow(max(0.0, dot(reflection, normalize(vec3f(0.19, 0.91, -0.37)))), mix(13.0, 4.5, brushed));
    let rim = pow(max(0.0, dot(reflection, normalize(vec3f(-0.79, 0.19, -0.58)))), mix(58.0, 14.0, brushed));
    let neutral = vec3f(0.90, 0.94, 0.95) * (panes * mix(0.82, 0.45, brushed) + card * 0.26 + lightWell * 0.40 + rim * 0.20);
    let warm = keyColor * (specular * mix(0.76, 0.36, brushed) + softbox * mix(0.14, 0.24, brushed) + brushed * max(0.0, dot(normal, direct)) * 0.13);
    let silver = (lighting + neutral + warm) * (0.82 + 0.18 * fresnel);
    let mapped = silver * (1.0 + silver * 0.29) / (1.0 + silver * 0.53);
    return vec4f(mapped * (1.0 + hairlines * brushed * 0.048), 1.0);
  `,
}));

function props({ finish, angle, auto, compact }) {
  return { lightAngle: angle, sweep: Number(auto), brushed: Number(finish === "satin"), compact: Number(compact) };
}

export function applyLiquid(renderer, settings) {
  renderer.update("halo", props(settings));
}

function renderSize(width, height) {
  // Limit the software-rasterization workload without changing the shot's aspect ratio.
  const scale = Math.min(1, 840 / width, 540 / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function initializeLiquid(canvas, options) {
  const renderer = await initializeStandalone(
    canvas,
    [{ id: "halo", type: HaloStudio.name, props: props(options.settings) }],
    {
      ...options,
      ...renderSize(options.width, options.height),
      onReady() {
        canvas.dataset.sized = "";
        options.onReady();
      },
    },
  );
  if (!renderer) return null;
  return {
    ...renderer,
    destroy() {
      delete canvas.dataset.sized;
      renderer.destroy();
    },
    resize(width, height) {
      const size = renderSize(width, height);
      renderer.resize(size.width, size.height);
    },
  };
}
