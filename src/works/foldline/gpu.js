import { assemblyStage, boatScene, duration, modeTimes } from "./geometry.mjs";
import program from "./foldline.wgsl?raw";

const stride = 6;
const maxVertices = 4608;
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
    const pipeline = (vertex, fragment, buffers, depthWriteEnabled, depthCompare) =>
      device.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module: shader, entryPoint: vertex, buffers },
        fragment: { module: shader, entryPoint: fragment, targets: [{ format }] },
        depthStencil: { format: "depth24plus", depthWriteEnabled, depthCompare },
      });
    const [water, panels] = await Promise.all([
      pipeline("waterVertex", "waterFragment", [], false, "always"),
      pipeline("panelVertex", "panelFragment", [{
        arrayStride: stride * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          { shaderLocation: 1, offset: 12, format: "float32x3" },
        ],
      }], true, "less"),
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
    context = canvas.getContext("webgpu");
    if (!context) throw new Error("Unable to acquire canvas context");
    context.configure({ device, format, alphaMode: "opaque", usage: usage() });
    let depth;
    return {
      lost: device.lost,
      resize(width, height) {
        canvas.width = width;
        canvas.height = height;
        depth?.destroy();
        depth = device.createTexture({ size: [width, height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
      },
      draw(data, count, uniforms) {
        device.queue.writeBuffer(vertices, 0, data, 0, count * stride);
        device.queue.writeBuffer(frame, 0, uniforms);
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: [0, 0, 0, 1] }],
          depthStencilAttachment: { view: depth.createView(), depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
        });
        pass.setPipeline(water);
        pass.setBindGroup(0, surface);
        pass.draw(3);
        pass.setPipeline(panels);
        pass.setVertexBuffer(0, vertices);
        pass.draw(count);
        pass.end();
        device.queue.submit([encoder.finish()]);
      },
      close() {
        depth?.destroy();
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
  let reportedStage, reportedRun;

  function allocate() {
    // Limit fragment work in the panoramic desktop stage. Geometric edges
    // remain crisp at this resolution and the texture is already fine-grained.
    const density = Math.min(1.3, window.devicePixelRatio || 1, 1040 / width);
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
      if (seconds !== cachedTime || aspect !== cachedAspect) {
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
      target.draw(data, vertexCount, uniforms);
      const phase = settings.mode === 1 ? "half" : assemblyStage(seconds);
      if (phase !== reportedStage || settings.run !== reportedRun) {
        reportedStage = phase;
        reportedRun = settings.run;
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
