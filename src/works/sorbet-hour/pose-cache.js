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
const shadowOffset = settledOffset + regionStride * regionCapacity;
let material;

export async function prepareJellyMaterial() {
  if (material) return;
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}media/sorbet-hour/morning-material.webp`;
  await image.decode();
  material = image;
}

const geometryModule = `
@group(0) @binding(0) var<uniform> pose: array<vec4f, 3>;
@group(0) @binding(1) var morning: texture_2d<f32>;
@group(0) @binding(2) var stationary: texture_2d<f32>;
@group(0) @binding(3) var displacement: texture_2d<f32>;
@group(0) @binding(4) var interpolatePixels: sampler;

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

fn shadePose(frame: JellyFrame, viewport: vec2f, markSteel: bool) -> vec4f {
  let uv = frame.pixel.xy / viewport;
  let flavor = pose[0].z;
  let biteTime = pose[0].w;
  let scooped = pose[1].x;
  let cutX = pose[1].y;
  let cutZ = pose[1].z;
  let retained = u32(pose[1].w);
${geometry}
}

@fragment fn drawPose(frame: JellyFrame) -> @location(0) vec4f {
  return shadePose(frame, pose[0].xy, false);
}

fn gloss(alpha: f32) -> f32 {
  let code = round(alpha * 255.0);
  let mixed = max(0.0, code - 1.0);
  return select((mixed % 31.0) / 30.0, (code - 128.0) / 127.0, code >= 128.0);
}

@fragment fn drawDisplacement(frame: JellyFrame) -> @location(0) vec4f {
  let grid = pose[2].xy;
  let uv = frame.pixel.xy / grid;
  let base = textureSampleLevel(stationary, interpolatePixels, uv, 0.0);
  let current = shadePose(frame, grid, true);
  if (current.a < 0.0) { return vec4f(current.rgb, 1.00390625); }
  let change = abs(current.rgb - base.rgb);
  let coverage = smoothstep(0.005, 0.035, max(change.x, max(change.y, change.z)));
  return vec4f(current.rgb * coverage, coverage);
}

@fragment fn applyDisplacement(frame: JellyFrame) -> @location(0) vec4f {
  let uv = frame.pixel.xy / pose[0].xy;
  let moving = textureSampleLevel(displacement, interpolatePixels, uv, 0.0);
  if (moving.a <= 0.0) { discard; }
  if (moving.a > 1.003) {
    let screen = (uv - vec2f(0.50, 0.56)) * vec2f(1.77, -1.18) - vec2f(0.25, -0.192);
    let bowl = frame.bowl.xyz;
    let fromBowl = screen - vec2f(bowl.x, bowl.y * 0.83516465 - bowl.z * 0.55);
    let along = dot(fromBowl, frame.spoonAxis);
    let across = dot(fromBowl, vec2f(-frame.spoonAxis.y, frame.spoonAxis.x));
    let spoonUv = vec2f((along + 0.228) / 1.185, 0.50 - across / 0.276);
    let steel = photoRGBA(vec2f(0.0, 1440.0), vec2f(1200.0, 256.0), spoonUv);
    if (steel.a >= 0.999) {
      return vec4f(steel.rgb * (0.92 + 0.08 * frame.timing.x + 0.09 * frame.timing.y), 0.0);
    }
  }
  let base = textureLoad(stationary, vec2i(frame.pixel.xy), 0);
  let remaining = max(0.0, 1.0 - moving.a);
  let color = vec4f(moving.rgb + base.rgb * remaining, gloss(base.a) * remaining);
  return cacheColor(color, 2.0, 0.0);
}

@fragment fn drawShadow(frame: JellyFrame) -> @location(0) vec4f {
  let stored = textureLoad(stationary, vec2i(frame.pixel.xy), 0);
  let code = round(stored.a * 255.0);
  if (code >= 94.0) { discard; }
  let uv = frame.pixel.xy / pose[0].xy;
  let screen = (uv - vec2f(0.50, 0.56)) * vec2f(1.77, -1.18) - vec2f(0.25, -0.192);
  let floorPosition = vec2f(screen.x, (0.018 * 0.83516465 - screen.y) / 0.55);
  let opacity = spoonShadow(floorPosition, frame.bowl.xz, frame.timing.y);
  if (opacity <= 0.0) { discard; }
  let floorCoverage = 1.0 - floor(max(0.0, code - 1.0) / 31.0) / 3.0;
  return vec4f(stored.rgb * (1.0 - opacity * floorCoverage), stored.a);
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
  const bindings = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
  ] });
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bindings] });
  const pipelineFor = (entryPoint, targetFormat = format) => device.createRenderPipeline({
    layout,
    vertex: { module: shader, entryPoint: "drawRegion", buffers: [{
      arrayStride: regionStride, stepMode: "instance",
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }],
    }] },
    primitive: { topology: "triangle-strip" },
    fragment: { module: shader, entryPoint, targets: [{ format: targetFormat }] },
  });
  const pipeline = pipelineFor("drawPose");
  const castShadow = pipelineFor("drawShadow");
  const traceDisplacement = pipelineFor("drawDisplacement", "rgba16float");
  const finishDisplacement = pipelineFor("applyDisplacement");
  const pose = new Float32Array(8);
  const basePose = new Float32Array(8);
  const movingPose = new Float32Array(12);
  const dummy = device.createTexture({ size: [1, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING });
  const dummyView = dummy.createView();
  const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
  function bindPose(buffer, view, delta = dummyView) {
    return device.createBindGroup({
      layout: bindings,
      entries: [{ binding: 0, resource: { buffer } }, { binding: 1, resource: atlasView },
        { binding: 2, resource: view }, { binding: 3, resource: delta }, { binding: 4, resource: sampler }],
    });
  }
  function poseUniform() {
    const buffer = device.createBuffer({
      size: movingPose.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    return { buffer, bind: bindPose(buffer, dummyView) };
  }
  const intact = poseUniform();
  const settled = poseUniform();
  const moving = poseUniform();
  const vertices = device.createBuffer({
    size: shadowOffset + regionStride,
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
    const grid = width > 450 ? [Math.ceil(width * 0.68), Math.ceil(height * 0.68)] : null;
    const delta = grid && device.createTexture({
      size: grid, format: "rgba16float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const deltaView = delta?.createView();
    return { cached, target, targetView: target.createView(), base, baseView,
      sculpted, sculptedView, baseMotion: bindPose(moving.buffer, baseView),
      sculptedMotion: bindPose(moving.buffer, sculptedView), delta, deltaView, grid,
      detail: deltaView && bindPose(moving.buffer, sculptedView, deltaView) };
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
    surfaces.delta?.destroy();
  }

  function begin(encoder, view, loadOp) {
    return encoder.beginRenderPass({ colorAttachments: [{
      view, clearValue: [0, 0, 0, 0], loadOp, storeOp: "store",
    }] });
  }

  function draw(pass, drawPipeline, bind, count, offset = 0) {
    pass.setPipeline(drawPipeline);
    pass.setBindGroup(0, bind);
    pass.setVertexBuffer(0, vertices, offset, count * regionStride);
    pass.draw(4, count);
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
      const pass = begin(encoder, surfaces.baseView, "clear");
      draw(pass, pipeline, intact.bind, 1);
      pass.end();
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
      const { regions } = poseRegions(width, height, 0, 0, 0, prepareCuts);
      if (regions.length > 0) {
        device.queue.writeBuffer(settled.buffer, 0, new Float32Array([width, height, pose[2], 0, 0, 0, 0, prepareCuts]));
        writeRegions(regions, settledOffset);
        const pass = begin(encoder, surfaces.sculptedView, "load");
        draw(pass, pipeline, settled.bind, regions.length, settledOffset);
        pass.end();
      }
      baked = prepareCuts;
    }
    encoder.copyTextureToTexture({ texture: stableCuts ? surfaces.sculpted : surfaces.base },
      { texture: surfaces.target }, [width, height]);
    if (spoonInScene) {
      const { regions, shadow } = poseRegions(width, height, pose[3], pose[5], pose[6], pose[7], stableCuts);
      if (regions.length > 0 || shadow) {
        movingPose.set(pose);
        // Values 2 and 3 identify an overlay with its stationary plate and
        // retained cuts already present. Value 3 also has the latest cut.
        movingPose[4] = openCut ? 3 : 2;
        const reconstruct = surfaces.grid && openCut && pose[3] < Math.fround(3.56) && regions.length > 0;
        if (surfaces.grid) movingPose.set(surfaces.grid, 8);
        device.queue.writeBuffer(moving.buffer, 0, movingPose);
        const bind = stableCuts ? surfaces.sculptedMotion : surfaces.baseMotion;
        if (regions.length > 0) writeRegions(regions, regionStride);
        if (reconstruct) {
          const trace = begin(encoder, surfaces.deltaView, "clear");
          draw(trace, traceDisplacement, bind, regions.length, regionStride);
          trace.end();
        }
        const pass = begin(encoder, surfaces.targetView, "load");
        if (shadow) {
          writeRegions([shadow], shadowOffset);
          draw(pass, castShadow, bind, 1, shadowOffset);
        }
        if (regions.length > 0) {
          draw(pass, reconstruct ? finishDisplacement : pipeline,
            reconstruct ? surfaces.detail : bind, regions.length, regionStride);
        }
        pass.end();
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

  const { add, sub, mul, abs, max, mix, step, floor, vec4 } = math;
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
  const mixed = max(0, sub(code, 1));
  const glint = mix(mul(sub(mixed, mul(floor(mul(add(mixed, 0.5), 1 / 31)), 31)), 1 / 30),
    mul(sub(code, 128), 1 / 127), step(128 - 0.5, code));
  const difference = mul(sub(sheen(add(stripe, drift)), sheen(stripe)), mul(glint, 0.065));
  return vec4(add(sample.member("rgb"), mul(expr("vec3f(1.0, 0.960, 0.875)"), difference)), 1);
}
