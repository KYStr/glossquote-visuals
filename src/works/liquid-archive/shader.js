import { defineShader, registerShader, wgsl } from "shaders/std";
import { initializeStandalone } from "../../shared/standalone.js";

export const SWEEP_SECONDS = 12;

// All distances are in scene units. The same solid model is used by the
// camera ray, finite-difference normals and the light's shadow ray.
const geometry = (point, distance, identify = false) => `
  let local = ${point} - vec3f(0.0, 0.805, 0.0);
  let tube = length(vec2f(length(local.xy) - 0.585, local.z * 1.16)) - 0.151;
  let foot = abs(${point} - vec3f(0.0, 0.113, 0.0)) - vec3f(0.353, 0.078, 0.21);
  let footDistance = length(max(foot, vec3f(0.0))) + min(max(foot.x, max(foot.y, foot.z)), 0.0) - 0.031;
  let cup = abs(vec2f(length(${point}.xz), ${point}.y - 1.573)) - vec2f(0.104, 0.073);
  let cupBody = length(max(cup, vec2f(0.0))) + min(max(cup.x, cup.y), 0.0) - 0.009;
  let opening = max(length(${point}.xz) - 0.082, 1.608 - ${point}.y);
  let cupDistance = max(cupBody, -opening);
  let candle = abs(vec2f(length(${point}.xz), ${point}.y - 1.785)) - vec2f(0.070, 0.171);
  let wax = length(max(candle, vec2f(0.0))) + min(max(candle.x, candle.y), 0.0) - 0.006;
  let wick = length(${point} - vec3f(0.0, clamp(${point}.y, 1.95, 1.999), 0.0)) - 0.009;
  let flame = (length((${point} - vec3f(0.012, 2.055, 0.0)) * vec3f(2.7, 1.0, 2.5)) - 0.071) * 0.36;
  let blend = max(0.053 - abs(tube - footDistance), 0.0) / 0.053;
  let footJoint = min(tube, footDistance) - blend * blend * 0.01325;
  let metal = min(footJoint, cupDistance);
  ${distance} = min(min(metal, wax), min(wick, flame));
  ${identify ? "material = select(select(1, 2, wax < metal), select(3, 4, flame < wick), min(wick, flame) < min(wax, metal));" : ""}
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
    let shot = (uv - vec2f(mix(0.68, 0.51, compact), mix(0.52, 0.49, compact))) * vec2f(aspect, -1.0);
    let forward = normalize(vec3f(0.0, -0.087, -1.0));
    let right = vec3f(1.0, 0.0, 0.0);
    let up = cross(right, forward);
    let camera = vec3f(0.0, 1.49, 4.85);
    let ray = normalize(forward * mix(1.92, 1.78, compact) + right * shot.x + up * shot.y);
    let yaw = -0.29;
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
    let sphereOrigin = objectCamera - vec3f(0.0, 1.07, 0.0);
    let sphereB = dot(sphereOrigin, objectRay);
    let sphereH = sphereB * sphereB - dot(sphereOrigin, sphereOrigin) + 1.22;
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
        if (d < 0.0009) { struck = true; break; }
        t += max(0.001, d * 0.90);
      }
    }

    if (!struck) {
      let p = camera + ray * roomT;
      let onFloor = floorT < wallT;
      let roomNormal = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), onFloor);
      let toLight = lightPosition - p;
      let lightDir = normalize(toLight);
      let paintNoise = sin(p.x * 141.3 + p.y * 233.2 + p.z * 63.1) * sin(p.z * 123.5 + p.x * 113.2);
      let grain = 0.96 + 0.04 * paintNoise;
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
      let base = mix(vec3f(0.012, 0.022, 0.029), vec3f(0.051, 0.069, 0.080), upper);
      let setLight = exp(-0.73 * pow(p.x - p.y * 0.40 - 0.72, 2.0)) * smoothstep(0.0, 2.05, p.y);
      let wallFill = select(vec3f(0.025, 0.045, 0.049) * setLight, vec3f(0.0), onFloor);
      let pool = keyColor * falloff * shadow * select(0.085, 0.20, onFloor);
      let seam = select(1.0, mix(0.63, 1.0, smoothstep(0.0, 0.16, p.y)), !onFloor);
      let flameAxis = normalize(vec3f(0.012, 2.055, 0.0) - camera);
      let halo = exp(-175.0 * length(ray - flameAxis)) * vec3f(0.22, 0.11, 0.035);
      return vec4f((base + wallFill + pool) * grain * contact * seam + halo, 1.0);
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
    if (material == 4) {
      let edge = pow(max(0.0, dot(pose * localNormal, -ray)), 0.52);
      let tip = smoothstep(2.025, 2.111, q.y);
      return vec4f(mix(vec3f(1.0, 0.86, 0.46), vec3f(0.91, 0.40, 0.095), tip * 0.6 + (1.0 - edge) * 0.24), 1.0);
    }
    if (material == 3) { return vec4f(0.024, 0.018, 0.013, 1.0); }
    if (material == 2) {
      let diffuse = max(0.0, dot(pose * localNormal, direct));
      let flameBounce = exp(-32.0 * max(0.0, 1.962 - q.y));
      return vec4f(vec3f(0.76, 0.66, 0.51) * (0.25 + diffuse * 0.46) + keyColor * flameBounce * 0.20, 1.0);
    }

    // Concentric tooling marks on the ring and horizontal ones on the turned cup.
    let ringRadius = length(q.xy - vec2f(0.0, 0.805));
    let brushAxis = mix(q.y, ringRadius, smoothstep(0.18, 0.27, q.y) * (1.0 - smoothstep(1.52, 1.60, q.y)));
    let hairlines = (0.57 * sin(brushAxis * 876.0 + 0.43 * sin(q.x * 17.0)) + 0.43 * sin(brushAxis * 473.0 + q.z * 39.0));
    localNormal = normalize(localNormal + brushed * hairlines * 0.016 * vec3f(0.0, 1.0, 0.6));
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
    let roughness = mix(0.11, 0.36, brushed);
    let strip = (1.0 - smoothstep(0.24, 0.24 + roughness, abs(emitterUV.x))) *
      (1.0 - smoothstep(0.95, 1.18 + roughness, abs(emitterUV.y)));
    let specular = strip * smoothstep(0.0, 0.09, -towardEmitter) * step(0.0, reflectedT);

    // Stationary ceiling and a cool rim are actual directions in the studio.
    let ceiling = pow(max(0.0, dot(reflection, normalize(vec3f(-0.29, 0.92, 0.26)))), mix(9.0, 4.0, brushed));
    let edgePanel = pow(max(0.0, dot(reflection, normalize(vec3f(-0.77, 0.14, -0.62)))), mix(38.0, 11.0, brushed));
    let floorBounce = 0.042 * smoothstep(0.0, 0.73, -reflection.y);
    let glow = exp(-11.0 * length(p - vec3f(0.0, 2.07, 0.0))) * keyColor;
    // Large stationary photographic cards give the steel a readable broad face and dark flags.
    let cardNormal = normalize(vec3f(-0.52, -0.10, -0.85));
    let cardRight = normalize(cross(vec3f(0.0, 1.0, 0.0), cardNormal));
    let cardUp = normalize(cross(cardNormal, cardRight));
    let cardFront = normalize(vec3f(0.48, 0.28, 0.82));
    let across = dot(reflection, cardRight);
    let vertical = dot(reflection, cardUp);
    let largeCard = smoothstep(0.32, 0.58, dot(reflection, cardFront)) *
      (1.0 - smoothstep(mix(0.17, 0.30, brushed), mix(0.33, 0.57, brushed), abs(across))) *
      (1.0 - smoothstep(0.55, 0.80, abs(vertical)));
    let darkFlag = 1.0 - smoothstep(0.0, 0.26, abs(across + 0.32));
    let ambient = (vec3f(0.036, 0.045, 0.049) + floorBounce * vec3f(1.0, 0.89, 0.78)) *
      (1.0 - 0.32 * darkFlag);
    let cool = vec3f(0.84, 0.93, 0.97) * (ceiling * 0.36 + edgePanel * 0.20 + largeCard * mix(0.67, 0.33, brushed));
    let warm = keyColor * (specular * mix(0.79, 0.38, brushed) + brushed * max(0.0, dot(normal, direct)) * 0.10);
    let silver = (ambient + cool + warm + glow * 0.4) * (0.77 + 0.23 * fresnel);
    return vec4f(silver * (1.0 + hairlines * brushed * 0.041), 1.0);
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
