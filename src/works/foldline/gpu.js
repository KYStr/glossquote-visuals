import { assemblyStage, boatScene, duration, modeTimes } from "./geometry.mjs";
import program from "./foldline.wgsl?raw";

const stride = 9;
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
        arrayStride: stride * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          { shaderLocation: 1, offset: 12, format: "float32x3" },
          { shaderLocation: 2, offset: 24, format: "float32x2" },
          { shaderLocation: 3, offset: 32, format: "float32" },
        ],
      }],
      depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: "less" },
    };
    const [water, panels, mirror, compose] = await Promise.all([
      pipeline("waterVertex", "waterFragment", layerFormat),
      pipeline("panelVertex", "panelFragment", layerFormat, { ...hullPipeline, multisample: { count: samples } }),
      pipeline("panelVertex", "mirrorFragment", layerFormat, hullPipeline),
      pipeline("waterVertex", "composeFragment", format),
    ]);
    if (obsolete()) {
      device.destroy();
      return null;
    }

    const vertices = device.createBuffer({
      size: maxVertices * stride * 4 * 2, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const frame = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
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
    let geometryDirty = true;
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
        const size = [width, height];
        const waterScale = Math.min(1, 680 / width);
        const waterSize = [Math.round(width * waterScale), Math.max(1, Math.round(height * waterScale))];
        coverage = create(size, layerFormat, samples, attachment);
        depth = create(size, depthFormat, samples, attachment);
        resolve = create(size, layerFormat, 1, sampled);
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
        layers = device.createBindGroup({
          layout: compose.getBindGroupLayout(0),
          entries: [
            { binding: 1, resource: resolve },
            { binding: 2, resource: waterView },
            { binding: 3, resource: sampler },
          ],
        });
        geometryDirty = true;
      },
      draw(data, count, uniforms, geometryChanged) {
        device.queue.writeBuffer(frame, 0, uniforms);
        const encoder = device.createCommandEncoder();
        if (geometryChanged || geometryDirty) {
          device.queue.writeBuffer(vertices, 0, data, 0, count * stride * 2);
          const hull = encoder.beginRenderPass({
            colorAttachments: [{ view: coverage, resolveTarget: resolve, loadOp: "clear", storeOp: "discard", clearValue: transparent }],
            depthStencilAttachment: { view: depth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
          });
          hull.setPipeline(panels);
          hull.setBindGroup(0, materials);
          hull.setVertexBuffer(0, vertices);
          hull.draw(count);
          hull.end();
          const reflection = encoder.beginRenderPass({
            colorAttachments: [{ view: mirrored, loadOp: "clear", storeOp: "store", clearValue: transparent }],
            depthStencilAttachment: { view: mirrorDepth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
          });
          reflection.setPipeline(mirror);
          reflection.setVertexBuffer(0, vertices, count * stride * 4, count * stride * 4);
          reflection.draw(count);
          reflection.end();
          geometryDirty = false;
        }
        const tide = colorPass(encoder, waterView);
        tide.setPipeline(water);
        tide.setBindGroup(0, surface);
        tide.draw(3);
        tide.end();
        const presentation = colorPass(encoder, context.getCurrentTexture().createView());
        presentation.setPipeline(compose);
        presentation.setBindGroup(0, layers);
        presentation.draw(3);
        presentation.end();
        device.queue.submit([encoder.finish()]);
      },
      close() {
        for (const texture of targets) texture.destroy();
        vertices.destroy();
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
  const data = new Float32Array(maxVertices * stride * 2);
  const uniforms = new Float32Array(12);
  uniforms[7] = lake.naturalWidth / lake.naturalHeight;
  let cachedAspect, cachedTime, vertexCount;
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
        const { triangles, shadow, reflection, slope } = boatScene({ aspect, seconds });
        vertexCount = triangles.length * 3;
        if (vertexCount > maxVertices || reflection.length !== triangles.length) throw new RangeError("Hull vertex count");
        let index = 0;
        for (const mesh of [triangles, reflection]) {
          for (const { points, tint, uv, material } of mesh) {
            for (let i = 0; i < points.length; i++) {
              data.set(points[i], index);
              data.set(tint, index + 3);
              data.set(uv[i], index + 6);
              data[index + 8] = material;
              index += stride;
            }
          }
        }
        uniforms.set(shadow);
        uniforms[8] = slope;
        cachedTime = seconds;
        cachedAspect = aspect;
      }
      uniforms[4] = .65 * Math.sin(time * .74);
      uniforms[5] = aspect;
      uniforms[6] = Math.max(0, (seconds - 4.05) / (duration - 4.05));
      uniforms[9] = seconds;
      target.draw(data, vertexCount, uniforms, geometryChanged);
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
