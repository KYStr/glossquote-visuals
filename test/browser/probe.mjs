import assert from "node:assert/strict";

export async function observe(page, { readPixels = false, localFont } = {}) {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType(), method: request.method() }));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /WebGPU validation|GPUValidationError/i.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript((readPixels) => {
    const probe = window.__visualProbe = { textures: 0, devices: 0, configurations: 0, calls: [], violations: [], gpuErrors: [] };
    window.addEventListener("securitypolicyviolation", (event) => {
      probe.violations.push({ directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile, line: event.lineNumber });
    });
    const observeCall = (object, method, label) => {
      const native = object[method];
      object[method] = function (...args) {
        probe.calls.push(label);
        return native.apply(this, args);
      };
    };
    observeCall(window, "fetch", "fetch");
    observeCall(Navigator.prototype, "sendBeacon", "beacon");
    observeCall(XMLHttpRequest.prototype, "open", "XHR");
    for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
      observeCall(Storage.prototype, method, `storage.${method}`);
    }
    window.WebSocket = new Proxy(window.WebSocket, {
      construct(target, args, newTarget) {
        probe.calls.push("WebSocket");
        return Reflect.construct(target, args, newTarget);
      },
    });
    if (window.GPUCanvasContext) {
      let currentTexture;
      const getTexture = GPUCanvasContext.prototype.getCurrentTexture;
      GPUCanvasContext.prototype.getCurrentTexture = function () {
        const texture = getTexture.call(this);
        currentTexture = texture;
        probe.textures++;
        return texture;
      };
      if (readPixels) {
        const configure = GPUCanvasContext.prototype.configure;
        GPUCanvasContext.prototype.configure = function (options) {
          probe.configurations++;
          const usage = (options.usage ?? GPUTextureUsage.RENDER_ATTACHMENT) | GPUTextureUsage.COPY_SRC;
          return configure.call(this, { ...options, usage });
        };
        const captures = new Set();
        probe.readFrame = (includeImage = false) => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            captures.delete(capture);
            reject(new Error("No canvas texture submitted for readback"));
          }, 8000);
          const capture = (texture, device, submittedAt) => {
            clearTimeout(timeout);
            const { width, height, format } = texture;
            if (!["bgra8unorm", "rgba8unorm"].includes(format)) {
              reject(new Error(`Unsupported readback format ${format}`));
              return;
            }
            const bytesPerRow = Math.ceil(width * 4 / 256) * 256;
            const buffer = device.createBuffer({ size: bytesPerRow * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
            const encoder = device.createCommandEncoder();
            encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, { width, height });
            submit.call(device.queue, [encoder.finish()]);
            buffer.mapAsync(GPUMapMode.READ).then(() => {
              const bytes = new Uint8Array(buffer.getMappedRange());
              const values = [];
              for (let y = 0; y < 24; y++) {
                for (let x = 0; x < 24; x++) {
                  const offset = Math.floor((y + 0.5) * height / 24) * bytesPerRow + Math.floor((x + 0.5) * width / 24) * 4;
                  const red = bytes[offset + (format === "bgra8unorm" ? 2 : 0)];
                  const blue = bytes[offset + (format === "bgra8unorm" ? 0 : 2)];
                  values.push([red, bytes[offset + 1], blue, bytes[offset + 3]]);
                }
              }
              const stats = {
                width, height, format, submittedAt,
                colors: new Set(values.map((value) => value.join(","))).size,
                average: values[0].map((_, i) => Math.round(values.reduce((sum, value) => sum + value[i], 0) / values.length)),
              };
              if (includeImage) {
                const pixels = new Uint8ClampedArray(width * height * 4);
                for (let row = 0; row < height; row++) {
                  pixels.set(bytes.subarray(row * bytesPerRow, row * bytesPerRow + width * 4), row * width * 4);
                }
                if (format === "bgra8unorm") {
                  for (let offset = 0; offset < pixels.length; offset += 4) {
                    const blue = pixels[offset];
                    pixels[offset] = pixels[offset + 2];
                    pixels[offset + 2] = blue;
                  }
                }
                const output = document.createElement("canvas");
                output.width = width;
                output.height = height;
                output.getContext("2d", { willReadFrequently: true }).putImageData(new ImageData(pixels, width, height), 0, 0);
                return new Promise((done) => output.toBlob(done, "image/png")).then(async (blob) => {
                  if (!blob) throw new Error("Could not encode the captured GPU frame");
                  const png = new Uint8Array(await blob.arrayBuffer());
                  stats.png = png.toBase64();
                  resolve(stats);
                });
              }
              resolve(stats);
            }).catch(reject).finally(() => buffer.destroy());
          };
          captures.add(capture);
        });
        const submit = GPUQueue.prototype.submit;
        GPUQueue.prototype.submit = function (commands) {
          submit.call(this, commands);
          const texture = currentTexture;
          currentTexture = undefined;
          if (texture && captures.size && this === probe.device?.queue) {
            const snapshots = [...captures];
            captures.clear();
            const submittedAt = performance.now();
            for (const snapshot of snapshots) snapshot(texture, probe.device, submittedAt);
          }
        };
      }
    }
    if (window.GPUDevice) {
      const pop = GPUDevice.prototype.popErrorScope;
      GPUDevice.prototype.popErrorScope = async function () {
        const error = await pop.call(this);
        if (error) probe.gpuErrors.push(error.message);
        return error;
      };
    }
    if (window.GPUAdapter) {
      const requestDevice = GPUAdapter.prototype.requestDevice;
      GPUAdapter.prototype.requestDevice = async function (...args) {
        const device = await requestDevice.apply(this, args);
        probe.devices++;
        probe.device = device;
        const unknownLoss = Promise.withResolvers();
        Object.defineProperty(device, "lost", { value: Promise.race([device.lost, unknownLoss.promise]) });
        probe.loseDevice = async () => {
          // The SDK intentionally ignores the "destroyed" reason. Deliver an
          // unknown-loss notification and destroy the actual device afterwards.
          unknownLoss.resolve({ reason: "unknown", message: "Injected isolated test loss" });
          await new Promise((resolve) => setTimeout(resolve, 0));
          device.destroy();
        };
        device.addEventListener("uncapturederror", (event) => probe.gpuErrors.push(event.error.message));
        return device;
      };
    }
  }, readPixels);
  return {
    requests,
    async assertPrivate(origin, { fontPaths = [] } = {}) {
      const probe = await page.evaluate(async () => {
        const { calls, violations, gpuErrors } = window.__visualProbe;
        return {
          calls, violations, gpuErrors,
          stored: localStorage.length + sessionStorage.length + (await indexedDB.databases()).length + (await caches.keys()).length,
        };
      });
      assert.deepEqual(errors, []);
      assert.deepEqual(probe, { calls: [], violations: [], gpuErrors: [], stored: 0 });
      assert.deepEqual(await page.context().cookies(), []);
      for (const request of requests) {
        assert.equal(new URL(request.url).origin, origin);
        assert.equal(request.method, "GET");
        const pathname = new URL(request.url).pathname;
        const allowedFont = request.type === "font" && (fontPaths.includes(pathname) || pathname === localFont);
        assert.ok(allowedFont || ["document", "stylesheet", "image", "script", "other"].includes(request.type), JSON.stringify(request));
        assert.doesNotMatch(new URL(request.url).pathname, /telemetry|analytics|collect/);
      }
    },
  };
}

export async function pixelEvidence(page, stage, file) {
  await stage.evaluate((element) => {
    const image = element.querySelector("img");
    if (image) image.style.visibility = "hidden";
    const canvas = element.querySelector("canvas");
    canvas.style.opacity = "1";
    canvas.style.mixBlendMode = "normal";
  });
  try {
    const png = await stage.screenshot({ path: file });
    return await page.evaluate(async (encoded) => {
      const raw = Uint8Array.from(atob(encoded), (letter) => letter.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([raw], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 24;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, 24, 24);
      bitmap.close();
      const rgba = context.getImageData(0, 0, 24, 24).data;
      const colors = new Set();
      const total = [0, 0, 0];
      const center = [0, 0];
      let bright = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
        for (let channel = 0; channel < 3; channel++) total[channel] += rgba[i + channel];
        if ((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3 > 64) {
          center[0] += (i / 4) % 24;
          center[1] += Math.floor(i / 96);
          bright++;
        }
      }
      return {
        colors: colors.size,
        average: total.map((value) => Math.round(value / 576)),
        brightCenter: bright ? center.map((value) => Number((value / bright).toFixed(2))) : null,
      };
    }, png.toString("base64"));
  } finally {
    await stage.evaluate((element) => {
      element.querySelector("img")?.style.removeProperty("visibility");
      const canvas = element.querySelector("canvas");
      canvas.style.removeProperty("opacity");
      canvas.style.removeProperty("mix-blend-mode");
    });
  }
}
