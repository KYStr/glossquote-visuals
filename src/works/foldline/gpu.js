import { assemblyStage, boatScene, duration, modeTimes } from "./geometry.mjs";
import program from "./foldline.wgsl?raw";

const stride = 6;
const maxVertices = 4608;
const layerFormat = "rgba8unorm";
const depthFormat = "depth24plus";
const samples = 4;
const transparent = [0, 0, 0, 0];
const usage = () => GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC;

async function makeDevice(canvas, obsolete) {
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
    const [water, panels, compose] = await Promise.all([
      pipeline("waterVertex", "waterFragment", layerFormat),
      pipeline("panelVertex", "panelFragment", layerFormat, {
        buffers: [{
          arrayStride: stride * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 12, format: "float32x3" },
          ],
        }],
        depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: "less" },
        multisample: { count: samples },
      }),
      pipeline("waterVertex", "composeFragment", format),
    ]);
    if (obsolete()) {
      device.destroy();
      return null;
    }

    const vertices = device.createBuffer({
      size: maxVertices * stride * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const frame = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const surface = device.createBindGroup({
      layout: water.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: frame } }],
    });
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    context = canvas.getContext("webgpu");
    if (!context) throw new Error("Unable to acquire canvas context");
    context.configure({ device, format, alphaMode: "opaque", usage: usage() });
    let targets = [];
    let coverage, depth, resolve, waterView, layers;
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
          device.queue.writeBuffer(vertices, 0, data, 0, count * stride);
          const hull = encoder.beginRenderPass({
            colorAttachments: [{ view: coverage, resolveTarget: resolve, loadOp: "clear", storeOp: "discard", clearValue: transparent }],
            depthStencilAttachment: { view: depth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
          });
          hull.setPipeline(panels);
          hull.setVertexBuffer(0, vertices);
          hull.draw(count);
          hull.end();
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
  let target = await makeDevice(canvas, obsolete);
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
  const data = new Float32Array(maxVertices * stride);
  const uniforms = new Float32Array(8);
  let cachedAspect, cachedTime, cachedShadow, vertexCount;
  let reportedStage, reportedSettings;

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
      const replacement = await makeDevice(canvas, obsolete);
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
        const { triangles, shadow } = boatScene({ aspect, seconds });
        let index = 0;
        for (const { points, tint } of triangles) {
          for (const p of points) {
            data.set(p, index);
            data.set(tint, index + 3);
            index += stride;
          }
        }
        cachedShadow = shadow;
        cachedTime = seconds;
        cachedAspect = aspect;
        vertexCount = index / stride;
      }
      uniforms.set(cachedShadow);
      uniforms[4] = .65 * Math.sin(time * .74);
      uniforms[5] = aspect;
      uniforms[6] = Math.max(0, (seconds - 4.05) / (duration - 4.05));
      target.draw(data, vertexCount, uniforms, geometryChanged);
      const phase = settings.mode === 1 ? "half" : assemblyStage(seconds);
      if (phase !== reportedStage || settings !== reportedSettings) {
        reportedStage = phase;
        reportedSettings = settings;
        options.onPose(phase, settings);
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
