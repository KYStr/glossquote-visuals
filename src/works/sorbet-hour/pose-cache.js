import { asLocal, expr, math } from "shaders/std";
import geometry from "./jelly.wgsl?raw";

const format = "rgba8unorm-srgb";
const geometryModule = `
@group(0) @binding(0) var<uniform> pose: array<vec4f, 2>;

@vertex fn fullscreen(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let triangle = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(triangle[vertexIndex], 0, 1);
}

@fragment fn drawPose(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let viewport = pose[0].xy;
  let uv = pixel.xy / viewport;
  let flavor = pose[0].z;
  let biteTime = pose[0].w;
  let scooped = pose[1].x;
  let cutX = pose[1].y;
  let cutZ = pose[1].z;
${geometry}
}
`;

export function paintCachedPose(params) {
  params.noteCustomWgsl?.();
  const { canvas, gpu: { device } } = params;
  const shader = device.createShaderModule({ code: geometryModule });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shader, entryPoint: "fullscreen" },
    fragment: { module: shader, entryPoint: "drawPose", targets: [{ format }] },
  });
  const pose = new Float32Array(8);
  const uniform = device.createBuffer({
    size: pose.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniform } }],
  });

  function allocate(width, height) {
    return params.createMediaTexture({ width, height, format });
  }

  let width = Math.max(1, canvas.width);
  let height = Math.max(1, canvas.height);
  let cached = allocate(width, height);
  let target = cached.unwrap().createView();
  let dirty = true;
  const cacheTexture = params.registerMediaTexture(() => cached.texture);

  params.onBeforeRender(() => {
    const time = params.getCpuValue("_animTime") ?? 0;
    params.setExtraField("glintDrift", Math.sin(time * 0.45) * 0.055);
    const nextWidth = Math.max(1, canvas.width);
    const nextHeight = Math.max(1, canvas.height);
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      cached.destroy();
      cached = allocate(width, height);
      target = cached.unwrap().createView();
      dirty = true;
    }
    const timeOfBite = params.getCpuValue("biteTime") ?? 0;
    const spoonInScene = params.getCpuValue("scooped") > 0.5 && timeOfBite > 0.22;
    // The initial hold and end of the lift are both stationary in the WGSL.
    const current = [
      width, height, params.getCpuValue("flavor") ?? 0,
      spoonInScene ? Math.min(timeOfBite, 3.56) : 0,
      Number(spoonInScene),
      spoonInScene ? params.getCpuValue("cutX") ?? 0 : 0,
      spoonInScene ? params.getCpuValue("cutZ") ?? 0 : 0,
    ];
    for (const [index, value] of current.entries()) {
      const rounded = Math.fround(value);
      if (pose[index] !== rounded) {
        pose[index] = rounded;
        dirty = true;
      }
    }
    if (!dirty) return;

    // Before the visible canvas pass, write the precise current pose once.
    // The fixed shape remains in GPU memory until a pose input changes.
    device.queue.writeBuffer(uniform, 0, pose);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: target, clearValue: [0, 0, 0, 0], loadOp: "clear", storeOp: "store",
    }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    dirty = false;
  });

  params.onCleanup(() => {
    cached.destroy();
    uniform.destroy();
  });

  const { add, sub, mul, abs, max, vec4 } = math;
  const uv = params.ctx.uv;
  // Both passes use the same pixel lattice. A direct texel read preserves
  // subpixel coverage and avoids the sampler's work on software adapters.
  const source = cacheTexture.accessor();
  const pixel = mul(uv, params.ctx.viewportSize);
  // The pinned composer exposes no textureLoad builder. Emit through its
  // accessor so the media binding is still recorded in the fragment layout.
  const texel = new source.constructor(context =>
    `textureLoad(${source._emit(context)}, vec2i(${pixel._emit(context)}), 0)`);
  const sample = asLocal(texel, "jellyPose");
  // Reconstruct the stationary mold crown's optical coordinate. The stored
  // alpha masks the live difference to the glossy gel, preserving occlusion.
  const x = mul(sub(uv.member("x"), 0.50), 1.77);
  const y = mul(sub(0.56, uv.member("y")), 1.18);
  const stripe = add(add(x, 0.312), mul(sub(mul(sub(0.32822, y), 1 / 0.55), 0.026), 0.28));
  const drift = params.uniforms.glintDrift;
  const sheen = offset => {
    const falloff = max(0, sub(1, mul(abs(offset), 12)));
    return mul(falloff, falloff);
  };
  const difference = mul(sub(sheen(add(stripe, drift)), sheen(stripe)), mul(sample.member("a"), 0.065));
  return vec4(add(sample.member("rgb"), mul(expr("vec3f(1.0, 0.960, 0.875)"), difference)), 1);
}
