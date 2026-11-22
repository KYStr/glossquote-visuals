import { asLocal, expr, math } from "shaders/std";
import geometry from "./jelly.wgsl?raw";
import motion from "./jelly-motion.wgsl?raw";
import { poseRegions } from "./pose-regions.js";

const format = "rgba8unorm-srgb";
const regionStride = 4 * Float32Array.BYTES_PER_ELEMENT;
// Up to eleven projected boxes yield at most 21 rows of eleven spans.
const regionCapacity = 231;
let material;

export async function prepareJellyMaterial() {
  if (material) return;
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}media/sorbet-hour/morning-material.webp`;
  await image.decode();
  material = image;
}

const geometryModule = `
@group(0) @binding(0) var<uniform> pose: array<vec4f, 2>;
@group(0) @binding(1) var morning: texture_2d<f32>;

fn photoRGBA(origin: vec2f, extent: vec2f, uv: vec2f) -> vec4f {
  let texel = vec2i(origin + clamp(uv, vec2f(0.0), vec2f(1.0)) * (extent - 1.0));
  return textureLoad(morning, texel, 0);
}

fn photo(origin: vec2f, extent: vec2f, uv: vec2f) -> vec3f {
  return photoRGBA(origin, extent, uv).rgb;
}

${motion}

@vertex fn drawRegion(@builtin(vertex_index) index: u32, @location(0) bounds: vec4f) -> JellyFrame {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let uv = mix(bounds.xy, bounds.zw, corner) / pose[0].xy;
  var frame = jellyFrame(pose[0].w, pose[1].y, pose[1].z);
  frame.pixel = vec4f(uv * vec2f(2, -2) + vec2f(-1, 1), 0, 1);
  return frame;
}

@fragment fn drawPose(frame: JellyFrame) -> @location(0) vec4f {
  let viewport = pose[0].xy;
  let uv = frame.pixel.xy / viewport;
  let flavor = pose[0].z;
  let biteTime = pose[0].w;
  let scooped = pose[1].x;
  let cutX = pose[1].y;
  let cutZ = pose[1].z;
  let retained = u32(pose[1].w);
${geometry}
}
`;

export function paintCachedPose(params) {
  params.noteCustomWgsl?.();
  const { canvas, gpu: { device } } = params;
  const atlas = params.createMediaTexture({
    width: material.naturalWidth, height: material.naturalHeight, format,
  });
  atlas.write(material);
  const atlasView = atlas.unwrap().createView();
  const shader = device.createShaderModule({ code: geometryModule });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shader, entryPoint: "drawRegion", buffers: [{
      arrayStride: regionStride, stepMode: "instance",
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }],
    }] },
    primitive: { topology: "triangle-strip" },
    fragment: { module: shader, entryPoint: "drawPose", targets: [{ format }] },
  });
  const pose = new Float32Array(8);
  const basePose = new Float32Array(8);
  function poseUniform() {
    const buffer = device.createBuffer({
      size: pose.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }, { binding: 1, resource: atlasView }],
    });
    return { buffer, bind };
  }
  const intact = poseUniform();
  const moving = poseUniform();
  const vertices = device.createBuffer({
    size: regionStride * (1 + regionCapacity),
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const bounds = new Float32Array(4 * regionCapacity);

  function allocate() {
    const cached = params.createMediaTexture({ width, height, format });
    const target = cached.unwrap();
    const base = device.createTexture({
      size: [width, height], format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    return { cached, target, targetView: target.createView(), base, baseView: base.createView() };
  }

  let width = Math.max(1, canvas.width);
  let height = Math.max(1, canvas.height);
  let surfaces = allocate();
  let baseDirty = true;
  const cacheTexture = params.registerMediaTexture(() => surfaces.cached.texture);

  function releaseSurfaces() {
    surfaces.cached.destroy();
    surfaces.base.destroy();
  }

  function draw(encoder, view, bind, loadOp, count, offset = 0) {
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view, clearValue: [0, 0, 0, 0], loadOp, storeOp: "store",
    }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.setVertexBuffer(0, vertices, offset, count * regionStride);
    pass.draw(4, count);
    pass.end();
  }

  params.onBeforeRender(() => {
    const time = params.getCpuValue("_animTime") ?? 0;
    params.setExtraField("glintDrift", Math.sin(time * 0.45) * 0.055);
    const nextWidth = Math.max(1, canvas.width);
    const nextHeight = Math.max(1, canvas.height);
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      releaseSurfaces();
      surfaces = allocate();
      baseDirty = true;
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
      params.getCpuValue("retained") ?? 0,
    ];
    let dirty = baseDirty;
    for (const [index, value] of current.entries()) {
      const rounded = Math.fround(value);
      if (pose[index] !== rounded) {
        pose[index] = rounded;
        dirty = true;
      }
    }
    if (!dirty) return;

    const encoder = device.createCommandEncoder();
    if (baseDirty || basePose[2] !== pose[2]) {
      basePose.set(pose.subarray(0, 3));
      device.queue.writeBuffer(intact.buffer, 0, basePose);
      device.queue.writeBuffer(vertices, 0, new Float32Array([0, 0, width, height]));
      draw(encoder, surfaces.baseView, intact.bind, "clear", 1);
      baseDirty = false;
    }
    // Restoring the intact image also erases the previous spoon and cut.
    // Only pixels in the current pose's affected regions run the geometry.
    encoder.copyTextureToTexture({ texture: surfaces.base }, { texture: surfaces.target }, [width, height]);
    if (spoonInScene || pose[7]) {
      const regions = poseRegions(width, height, pose[3], pose[5], pose[6], pose[7]);
      if (regions.length > 0) {
        for (const [index, region] of regions.entries()) bounds.set(region, index * 4);
        device.queue.writeBuffer(moving.buffer, 0, pose);
        device.queue.writeBuffer(vertices, regionStride, bounds.subarray(0, regions.length * 4));
        draw(encoder, surfaces.targetView, moving.bind, "load", regions.length, regionStride);
      }
    }
    device.queue.submit([encoder.finish()]);
  });

  params.onCleanup(() => {
    releaseSurfaces();
    intact.buffer.destroy();
    moving.buffer.destroy();
    vertices.destroy();
    atlas.destroy();
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
  const x = sub(mul(sub(uv.member("x"), 0.50), 1.77), 0.25);
  const y = add(mul(sub(0.56, uv.member("y")), 1.18), 0.192);
  const stripe = add(add(x, 0.312), mul(sub(mul(sub(0.32822, y), 1 / 0.55), 0.026), 0.28));
  const drift = params.uniforms.glintDrift;
  const sheen = offset => {
    const falloff = max(0, sub(1, mul(abs(offset), 12)));
    return mul(falloff, falloff);
  };
  const difference = mul(sub(sheen(add(stripe, drift)), sheen(stripe)), mul(sample.member("a"), 0.065));
  return vec4(add(sample.member("rgb"), mul(expr("vec3f(1.0, 0.960, 0.875)"), difference)), 1);
}
