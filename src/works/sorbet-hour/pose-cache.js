import { asLocal, expr, math } from "shaders/std";
import geometry from "./jelly.wgsl?raw";
import motion from "./jelly-motion.wgsl?raw";
import { poseRegions } from "./pose-regions.js";
import positions from "./scoop-positions.json" with { type: "json" };

const format = "rgba8unorm-srgb";
const regionStride = 4 * Float32Array.BYTES_PER_ELEMENT;
// Up to eleven projected boxes yield at most 21 rows of eleven spans.
const regionCapacity = 231;
const settledOffset = regionStride * (1 + regionCapacity);
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
@group(0) @binding(2) var stationary: texture_2d<f32>;

fn photoRGBA(origin: vec2f, extent: vec2f, uv: vec2f) -> vec4f {
  let texel = vec2i(origin + clamp(uv, vec2f(0.0), vec2f(1.0)) * (extent - 1.0));
  return textureLoad(morning, texel, 0);
}

fn photo(origin: vec2f, extent: vec2f, uv: vec2f) -> vec3f {
  return photoRGBA(origin, extent, uv).rgb;
}

fn cacheColor(color: vec4f, kind: f32) -> vec4f {
  let code = select(1.0 + round(color.a * 126.0), 128.0 + round(color.a * 127.0), kind == 2.0);
  return vec4f(color.rgb, select(code / 255.0, 0.0, kind == 0.0));
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
  const movingPose = new Float32Array(8);
  const dummy = device.createTexture({ size: [1, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING });
  const dummyView = dummy.createView();
  function bindPose(buffer, view) {
    return device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }, { binding: 1, resource: atlasView },
        { binding: 2, resource: view }],
    });
  }
  function poseUniform() {
    const buffer = device.createBuffer({
      size: pose.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    return { buffer, bind: bindPose(buffer, dummyView) };
  }
  const intact = poseUniform();
  const settled = poseUniform();
  const moving = poseUniform();
  const vertices = device.createBuffer({
    size: settledOffset + regionStride * regionCapacity,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const bounds = new Float32Array(4 * regionCapacity);

  function allocate() {
    const cached = params.createMediaTexture({ width, height, format });
    const target = cached.unwrap();
    const base = device.createTexture({
      size: [width, height], format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    });
    const sculpted = device.createTexture({
      size: [width, height], format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
    });
    const baseView = base.createView();
    const sculptedView = sculpted.createView();
    return { cached, target, targetView: target.createView(), base, baseView,
      sculpted, sculptedView, baseMotion: bindPose(moving.buffer, baseView),
      sculptedMotion: bindPose(moving.buffer, sculptedView) };
  }

  let width = Math.max(1, canvas.width);
  let height = Math.max(1, canvas.height);
  let surfaces = allocate();
  let baseDirty = true;
  let baked = 0;
  const cacheTexture = params.registerMediaTexture(() => surfaces.cached.texture);

  function releaseSurfaces() {
    surfaces.cached.destroy();
    surfaces.base.destroy();
    surfaces.sculpted.destroy();
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

  function writeRegions(regions, offset) {
    for (const [index, region] of regions.entries()) bounds.set(region, index * 4);
    device.queue.writeBuffer(vertices, offset, bounds.subarray(0, regions.length * 4));
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
      baked = 0;
    }
    const index = spoonInScene
      ? positions.findIndex(cut => Math.fround(cut.x) === pose[5] && Math.fround(cut.z) === pose[6])
      : -1;
    const activeCut = index < 0 ? 0 : 1 << index;
    const openCut = pose[3] >= 1.94 ? activeCut : 0;
    const stableCuts = pose[7] | openCut;
    // Prepare the undeformed first cut while the empty spoon approaches.
    // Keep existing cuts visible when preparing any subsequent bite.
    const prepareCuts = stableCuts || activeCut;
    if (prepareCuts && baked !== prepareCuts) {
      encoder.copyTextureToTexture({ texture: surfaces.base }, { texture: surfaces.sculpted }, [width, height]);
      const regions = poseRegions(width, height, 0, 0, 0, prepareCuts);
      if (regions.length > 0) {
        device.queue.writeBuffer(settled.buffer, 0, new Float32Array([width, height, pose[2], 0, 0, 0, 0, prepareCuts]));
        writeRegions(regions, settledOffset);
        draw(encoder, surfaces.sculptedView, settled.bind, "load", regions.length, settledOffset);
      }
      baked = prepareCuts;
    }
    encoder.copyTextureToTexture({ texture: stableCuts ? surfaces.sculpted : surfaces.base },
      { texture: surfaces.target }, [width, height]);
    if (spoonInScene) {
      const regions = poseRegions(width, height, pose[3], pose[5], pose[6], pose[7], stableCuts);
      if (regions.length > 0) {
        movingPose.set(pose);
        // Values 2 and 3 identify an overlay with its stationary plate and
        // retained cuts already present. Value 3 also has the latest cut.
        movingPose[4] = openCut ? 3 : 2;
        device.queue.writeBuffer(moving.buffer, 0, movingPose);
        writeRegions(regions, regionStride);
        draw(encoder, surfaces.targetView, stableCuts ? surfaces.sculptedMotion : surfaces.baseMotion,
          "load", regions.length, regionStride);
      }
    }
    device.queue.submit([encoder.finish()]);
  });

  params.onCleanup(() => {
    releaseSurfaces();
    intact.buffer.destroy();
    settled.buffer.destroy();
    moving.buffer.destroy();
    vertices.destroy();
    atlas.destroy();
    dummy.destroy();
  });

  const { add, sub, mul, abs, max, mix, step, vec4 } = math;
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
  const code = mul(sample.member("a"), 255);
  const glint = mix(max(0, mul(sub(code, 1), 1 / 126)),
    mul(sub(code, 128), 1 / 127), step(128 - 0.5, code));
  const difference = mul(sub(sheen(add(stripe, drift)), sheen(stripe)), mul(glint, 0.065));
  return vec4(add(sample.member("rgb"), mul(expr("vec3f(1.0, 0.960, 0.875)"), difference)), 1);
}
