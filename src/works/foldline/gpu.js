import { assemblyStage, boatScene, duration, hullStride, mirrorStride, modeTimes } from "./geometry.mjs";
import program from "./foldline.wgsl?raw";

const maxVertices = 8192;
const layerFormat = "rgba8unorm";
const depthFormat = "depth24plus";
const samples = 4;
const transparent = [0, 0, 0, 0];
const usage = () => GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC;

async function loadPhoto(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function makeDevice(canvas, obsolete, lake, shore, atlas) {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || obsolete()) return null;
  const device = await adapter.requestDevice();
  if (obsolete()) {
    device.destroy();
    return null;
  }

  let context;
  try {
    const format = navigator.gpu.getPreferredCanvasFormat();
    const shader = device.createShaderModule({ code: program, label: "Foldline panels and water" });
    const pipeline = (vertex, fragment, target, geometry = {}) =>
      device.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module: shader, entryPoint: vertex, buffers: geometry.buffers },
        fragment: { module: shader, entryPoint: fragment, targets: [{ format: target }] },
        depthStencil: geometry.depthStencil,
        multisample: geometry.multisample,
      });
    const hullPipeline = {
      buffers: [{
        arrayStride: hullStride * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          { shaderLocation: 1, offset: 12, format: "float32x3" },
          { shaderLocation: 2, offset: 24, format: "float32x2" },
          { shaderLocation: 3, offset: 32, format: "float32" },
        ],
      }],
      depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: "less" },
    };
    const [water, panels, mirror, compose, composeMotion] = await Promise.all([
      pipeline("waterVertex", "waterFragment", layerFormat),
      pipeline("panelVertex", "panelFragment", layerFormat, { ...hullPipeline, multisample: { count: samples } }),
      pipeline("mirrorVertex", "mirrorFragment", layerFormat, {
        depthStencil: hullPipeline.depthStencil,
        buffers: [{ arrayStride: mirrorStride * 4, attributes: hullPipeline.buffers[0].attributes.slice(0,2) }],
      }),
      pipeline("waterVertex", "composeFragment", format),
      pipeline("waterVertex", "composeMotionFragment", format),
    ]);
    if (obsolete()) {
      device.destroy();
      return null;
    }

    const vertices = device.createBuffer({
      size: maxVertices * hullStride * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const reflections = device.createBuffer({
      size: maxVertices * mirrorStride * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const indices = device.createBuffer({
      size: maxVertices * 2, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    const frame = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const photoTexture = (source, premultipliedAlpha) => {
      const size = [source.naturalWidth, source.naturalHeight];
      const texture = device.createTexture({
        size, format: layerFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      device.queue.copyExternalImageToTexture({ source }, { texture, premultipliedAlpha }, size);
      return texture;
    };
    const photo = photoTexture(lake, false);
    const rock = photoTexture(shore, true);
    const material = photoTexture(atlas, false);
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const materials = device.createBindGroup({
      layout: panels.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: frame } },
        { binding: 3, resource: sampler },
        { binding: 7, resource: material.createView() },
      ],
    });
    context = canvas.getContext("webgpu");
    if (!context) throw new Error("Unable to acquire canvas context");
    context.configure({ device, format, alphaMode: "opaque", usage: usage() });
    let targets = [];
    let coverage, depth, resolve, waterView, mirrored, mirrorDepth, layers, surface;
    let movingCoverage, movingDepth, movingResolve, motionLayers;
    let reducedMotionTarget = false;
    let lastMoving;
    let geometryDirty = true;
    let topologyReady = false;
    let cropWidth, cropHeight;
    function colorPass(encoder, view) {
      return encoder.beginRenderPass({
        colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: transparent }],
      });
    }
    return {
      lost: device.lost,
      resize(width, height) {
        canvas.width = width;
        canvas.height = height;
        for (const texture of targets) texture.destroy();
        targets = [];
        const create = (size, format, sampleCount, usage) => {
          const texture = device.createTexture({ size, format, sampleCount, usage });
          targets.push(texture);
          return texture.createView();
        };
        const attachment = GPUTextureUsage.RENDER_ATTACHMENT;
        const sampled = attachment | GPUTextureUsage.TEXTURE_BINDING;
        // The framing limits hull bounds to 90.5% × 75.5%. Resolve only that
        // area, retaining one texel per display pixel and room for AA coverage.
        cropWidth = Math.min(width,Math.ceil(width*.905)+4);
        cropHeight = Math.min(height,Math.ceil(height*.755)+4);
        const hullSize = [cropWidth,cropHeight];
        const waterScale = Math.min(1, 680 / width);
        const waterSize = [Math.round(width * waterScale), Math.max(1, Math.round(height * waterScale))];
        coverage = create(hullSize, layerFormat, samples, attachment);
        depth = create(hullSize, depthFormat, samples, attachment);
        resolve = create(hullSize, layerFormat, 1, sampled);
        // Only the moving intermediate shrinks on wide screens. Manual and
        // final poses keep native dimensions and an unfiltered colour resolve.
        const motionScale = Math.min(1, 768/width);
        reducedMotionTarget = motionScale < 1;
        if (reducedMotionTarget) {
          const motionSize = hullSize.map(dimension=>Math.max(1,Math.ceil(dimension*motionScale)));
          movingCoverage = create(motionSize,layerFormat,samples,attachment);
          movingDepth = create(motionSize,depthFormat,samples,attachment);
          movingResolve = create(motionSize,layerFormat,1,sampled);
        }
        waterView = create(waterSize, layerFormat, 1, sampled);
        mirrored = create(waterSize, layerFormat, 1, sampled);
        mirrorDepth = create(waterSize, depthFormat, 1, attachment);
        surface = device.createBindGroup({
          layout: water.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: frame } },
            { binding: 3, resource: sampler },
            { binding: 4, resource: photo.createView() },
            { binding: 5, resource: mirrored },
            { binding: 6, resource: rock.createView() },
          ],
        });
        const composite = (pipeline,hull) => device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: frame } },
            { binding: 1, resource: hull },
            { binding: 2, resource: waterView },
            { binding: 3, resource: sampler },
          ],
        });
        layers = composite(compose,resolve);
        if (reducedMotionTarget) motionLayers = composite(composeMotion,movingResolve);
        geometryDirty = true;
      },
      draw(mesh, uniforms, geometryChanged, animating) {
        const { hull: data, mirror: reflected, topology, indexCount, vertexCount, reflects, yOffset } = mesh;
        uniforms[10] = canvas.width;
        uniforms[11] = canvas.height;
        uniforms[12] = Math.floor((canvas.width-cropWidth)/2);
        uniforms[13] = Math.max(0,Math.min(canvas.height-cropHeight,
          Math.round(((1-yOffset)*canvas.height-cropHeight)/2)));
        uniforms[14] = cropWidth;
        uniforms[15] = cropHeight;
        device.queue.writeBuffer(frame, 0, uniforms);
        const encoder = device.createCommandEncoder();
        const moving = reducedMotionTarget && animating;
        if (geometryChanged || geometryDirty || moving !== lastMoving) {
          if (!topologyReady) {
            device.queue.writeBuffer(indices,0,topology,0,indexCount+(indexCount%2));
            topologyReady = true;
          }
          device.queue.writeBuffer(vertices,0,data,0,vertexCount*hullStride);
          const hull = encoder.beginRenderPass({
            colorAttachments: [{
              view: moving ? movingCoverage : coverage, resolveTarget: moving ? movingResolve : resolve,
              loadOp: "clear", storeOp: "discard", clearValue: transparent,
            }],
            depthStencilAttachment: {
              view: moving ? movingDepth : depth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1,
            },
          });
          hull.setPipeline(panels);
          hull.setBindGroup(0, materials);
          hull.setVertexBuffer(0, vertices);
          hull.setIndexBuffer(indices,"uint16");
          hull.drawIndexed(indexCount);
          hull.end();
          if (reflects) {
            device.queue.writeBuffer(reflections,0,reflected,0,vertexCount*mirrorStride);
            const reflection = encoder.beginRenderPass({
              colorAttachments: [{ view: mirrored, loadOp: "clear", storeOp: "store", clearValue: transparent }],
              depthStencilAttachment: { view: mirrorDepth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
            });
            reflection.setPipeline(mirror);
            reflection.setVertexBuffer(0,reflections);
            reflection.setIndexBuffer(indices,"uint16");
            reflection.drawIndexed(indexCount);
            reflection.end();
          }
          geometryDirty = false;
          lastMoving = moving;
        }
        const tide = colorPass(encoder, waterView);
        tide.setPipeline(water);
        tide.setBindGroup(0, surface);
        tide.draw(3);
        tide.end();
        const presentation = colorPass(encoder, context.getCurrentTexture().createView());
        presentation.setPipeline(moving ? composeMotion : compose);
        presentation.setBindGroup(0,moving ? motionLayers : layers);
        presentation.draw(3);
        presentation.end();
        device.queue.submit([encoder.finish()]);
      },
      close() {
        for (const texture of targets) texture.destroy();
        vertices.destroy();
        reflections.destroy();
        indices.destroy();
        frame.destroy();
        photo.destroy();
        rock.destroy();
        material.destroy();
        context.unconfigure();
        device.destroy();
      },
    };
  } catch (error) {
    context?.unconfigure();
    device.destroy();
    throw error;
  }
}

export async function initializeFoldline(canvas, options) {
  let closed = false;
  const obsolete = () => closed || options.signal.aborted;
  const [lake, shore, atlas] = await Promise.all([loadPhoto(options.lake), loadPhoto(options.shore), loadPhoto(options.atlas)]);
  if (obsolete()) return null;
  let target = await makeDevice(canvas, obsolete, lake, shore, atlas);
  if (!target || obsolete()) {
    target?.close();
    return null;
  }

  let width = options.width, height = options.height;
  let time = 0, elapsed = 0, previous = 0, raf = 0;
  let settings = options.settings;
  let failure = null;
  let ready = false;
  let active = false;
  let recovered = false;
  const meshes = {
    hull: new Float32Array(maxVertices*hullStride),
    mirror: new Float32Array(maxVertices*mirrorStride),
    attributes: new Float32Array(maxVertices*3),
    topology: new Uint16Array(maxVertices), indexCount: 0,
    shadow: new Float32Array(4),
  };
  const uniforms = new Float32Array(16);
  uniforms[7] = lake.naturalWidth / lake.naturalHeight;
  let cachedAspect, cachedTime;
  let reportedStage, reportedSettings, reportedCheckpoint;

  function allocate() {
    // Keep a 1296 CSS px desktop stage at native width at DPR 1.
    const density = Math.min(1.3, window.devicePixelRatio || 1, 1344 / width);
    target?.resize(Math.max(1, Math.round(width * density)), Math.max(1, Math.round(height * density)));
  }
  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    previous = 0;
  }
  function fail(reason) {
    failure = reason;
    stop();
    options.onError();
  }
  async function restore(lostTarget) {
    if (target !== lostTarget || obsolete()) return;
    stop();
    target = null;
    lostTarget.close();
    if (recovered) {
      fail("device-lost");
      return;
    }
    recovered = true;
    options.onError();
    if (obsolete()) return;
    try {
      const replacement = await makeDevice(canvas, obsolete, lake, shore, atlas);
      if (obsolete()) {
        replacement?.close();
        return;
      }
      if (!replacement) {
        fail("device-unavailable");
        return;
      }
      target = replacement;
      watch();
      allocate();
      ready = false;
      resume();
    } catch {
      if (!obsolete()) fail("device-unavailable");
    }
  }
  function watch() {
    const current = target;
    void current.lost.then(() => restore(current));
  }
  function render(now) {
    if (!active || obsolete() || !target) return;
    if (previous) {
      const delta = Math.min(.10, (now - previous) / 1000);
      time += delta;
      elapsed = Math.min(duration, elapsed + delta);
    }
    previous = now;
    try {
      const aspect = width / height;
      const seconds = settings.mode === null ? elapsed : modeTimes[settings.mode];
      const geometryChanged = seconds !== cachedTime || aspect !== cachedAspect;
      if (geometryChanged) {
        boatScene({ aspect, seconds, buffers: meshes });
        uniforms.set(meshes.shadow);
        uniforms[8] = meshes.slope;
        cachedTime = seconds;
        cachedAspect = aspect;
      }
      uniforms[4] = .65 * Math.sin(time * .74);
      uniforms[5] = aspect;
      uniforms[6] = Math.max(0, (seconds - 4.05) / (duration - 4.05));
      uniforms[9] = seconds;
      target.draw(meshes, uniforms, geometryChanged,settings.mode === null && seconds < duration);
      const phase = settings.mode === 1 ? "half" : assemblyStage(seconds);
      const checkpoint = phase === "releasing" && seconds >= .62 ||
        phase === "extending" && seconds >= 1.87 ||
        phase === "raising" && seconds >= 3.43 ? phase : "";
      if (phase !== reportedStage || settings !== reportedSettings || checkpoint !== reportedCheckpoint) {
        reportedStage = phase;
        reportedSettings = settings;
        reportedCheckpoint = checkpoint;
        options.onPose(phase, settings, checkpoint);
      }
      if (!ready) {
        ready = true;
        options.onReady();
      }
    } catch {
      fail("render-failed");
    }
    if (active) raf = requestAnimationFrame(render);
  }
  function resume() {
    if (active || !target) return;
    active = true;
    raf = requestAnimationFrame(render);
  }
  allocate();
  watch();
  resume();

  return {
    pause: stop,
    resume,
    set(next) {
      if (next.run !== settings.run) {
        elapsed = 0;
        previous = 0;
      }
      settings = next;
    },
    resize(w, h) { width = w; height = h; allocate(); },
    getFailureReason() { return failure; },
    destroy() {
      closed = true;
      stop();
      target?.close();
      target = null;
    },
  };
}
