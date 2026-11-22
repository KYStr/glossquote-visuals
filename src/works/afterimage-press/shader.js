import source from "./press.wgsl?raw";

const textureNames = ["bed-texture.webp", "ink-plates.webp", "plate-both.webp", "tool-texture.webp"];

async function loadImage(file, base) {
  const image = new Image();
  image.src = new URL(file, base).href;
  await image.decode();
  return image;
}

function upload(device, image) {
  const size = [image.naturalWidth, image.naturalHeight];
  const texture = device.createTexture({
    size, format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture({ source: image }, { texture, premultipliedAlpha: true }, size);
  return texture;
}

export async function initializePress(canvas, options) {
  const { signal, onReady, onError, onFrame, assetBase } = options;
  const context = canvas.getContext("webgpu");
  if (!context) return null;
  const stage = canvas.parentElement;
  const images = Promise.all(textureNames.map(file => loadImage(file, assetBase)));
  const format = navigator.gpu.getPreferredCanvasFormat();
  const uniforms = new Float32Array(8);
  let settings = options.settings;
  let state;
  let failure = null;
  let destroyed = false;
  let stopped = false;
  let resizePending = true;
  let raf = 0;
  let last = null;
  let lightTime = 0;
  let recoveries = 0;

  async function createState() {
    const [adapter, assets] = await Promise.all([navigator.gpu.requestAdapter(), images]);
    if (!adapter || signal.aborted || destroyed) return null;
    const device = await adapter.requestDevice();
    try {
      if (signal.aborted || destroyed) {
        device.destroy();
        return null;
      }
      const shader = device.createShaderModule({ code: source });
      const pipeline = await device.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module: shader, entryPoint: "triangle" },
        fragment: { module: shader, entryPoint: "printFrame", targets: [{ format }] },
      });
      if (signal.aborted || destroyed) {
        device.destroy();
        return null;
      }
      const buffer = device.createBuffer({
        size: uniforms.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
      const textures = assets.map(image => upload(device, image));
      const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer } },
          { binding: 1, resource: sampler },
          ...textures.map((texture, index) => ({ binding: index + 2, resource: texture.createView() })),
        ],
      });
      context.configure({ device, format, alphaMode: "opaque", colorSpace: "srgb" });
      return { device, pipeline, buffer, group, pending: false, ready: false, completion: Promise.resolve() };
    } catch (error) {
      device.destroy();
      throw error;
    }
  }

  function resize() {
    const box = stage.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return false;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const left = Math.floor(box.left * scale);
    const top = Math.floor(box.top * scale);
    const width = Math.ceil(box.right * scale) - left;
    const height = Math.ceil(box.bottom * scale) - top;
    canvas.style.left = `${left / scale - box.left}px`;
    canvas.style.top = `${top / scale - box.top}px`;
    canvas.style.width = `${width / scale}px`;
    canvas.style.height = `${height / scale}px`;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    uniforms.set([box.left * scale - left, box.top * scale - top, box.width * scale, box.height * scale]);
    resizePending = false;
    return true;
  }

  function schedule() {
    if (!raf && state && !stopped && !destroyed) raf = requestAnimationFrame(draw);
  }

  function stopFrames() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = null;
  }

  function draw(time) {
    raf = 0;
    const gpu = state;
    if (!gpu || stopped || destroyed || signal.aborted) return;
    // Bound outstanding GPU work on software adapters as well as real GPUs.
    if (gpu.pending || (last !== null && time - last < 15) || (resizePending && !resize())) {
      schedule();
      return;
    }

    lightTime += last === null ? 0 : Math.min((time - last) / 1000, .08);
    last = time;
    settings = onFrame(time) ?? settings;
    const drawnPlate = settings.plate;
    uniforms.set([drawnPlate, settings.edge, Number(settings.tool), lightTime * 1.2], 4);
    const { device, pipeline, group, buffer } = gpu;
    device.queue.writeBuffer(buffer, 0, uniforms);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: context.getCurrentTexture().createView(), loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0, a: 1 }, storeOp: "store",
    }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    gpu.pending = true;
    gpu.completion = device.queue.onSubmittedWorkDone().then(() => {
      if (state !== gpu || destroyed || signal.aborted) return;
      gpu.pending = false;
      if (canvas.dataset.plate !== String(drawnPlate)) canvas.dataset.plate = String(drawnPlate);
      if (!gpu.ready) {
        gpu.ready = true;
        onReady();
      }
    }, () => { gpu.pending = false; });
    schedule();
  }

  function attach(next) {
    state = next;
    if (!next) return;
    resizePending = true;
    void next.device.lost.then(() => recover(next));
    schedule();
  }

  async function recover(lost) {
    if (destroyed || state !== lost) return;
    stopFrames();
    state = null;
    context.unconfigure();
    lost.device.destroy();
    onError();
    if (destroyed || signal.aborted) return;
    try {
      if (++recoveries > 2) throw new Error("WebGPU recovery limit");
      attach(await createState());
      if (!state && !destroyed && !signal.aborted) throw new Error("WebGPU unavailable");
    } catch {
      if (destroyed || signal.aborted) return;
      failure = "device-lost";
      onError();
    }
  }

  attach(await createState());
  if (!state) return null;
  return {
    update(next) { settings = next; },
    resize() { resizePending = true; },
    pause() { stopped = true; stopFrames(); },
    resume() { stopped = false; schedule(); },
    settled() { return state?.completion ?? Promise.resolve(); },
    getFailureReason() { return failure; },
    destroy() {
      destroyed = true;
      stopFrames();
      context.unconfigure();
      state?.device.destroy();
      state = null;
    },
  };
}
