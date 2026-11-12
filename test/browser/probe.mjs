import assert from "node:assert/strict";

export async function observe(page) {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType(), method: request.method() }));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /WebGPU validation|GPUValidationError/i.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript(() => {
    const probe = window.__visualProbe = { textures: 0, devices: 0, calls: [], violations: [], gpuErrors: [] };
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
      const getTexture = GPUCanvasContext.prototype.getCurrentTexture;
      GPUCanvasContext.prototype.getCurrentTexture = function () {
        const texture = getTexture.call(this);
        probe.textures++;
        return texture;
      };
    }
    if (window.GPUAdapter) {
      const requestDevice = GPUAdapter.prototype.requestDevice;
      GPUAdapter.prototype.requestDevice = async function (...args) {
        const device = await requestDevice.apply(this, args);
        probe.devices++;
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
  });
  return {
    requests,
    async assertPrivate(origin) {
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
        assert.ok(["document", "stylesheet", "image", "script", "other"].includes(request.type), JSON.stringify(request));
        assert.doesNotMatch(new URL(request.url).pathname, /telemetry|analytics|collect/);
      }
    },
  };
}

export async function pixelEvidence(page, stage, file) {
  await stage.evaluate((element) => {
    element.querySelector("img").style.visibility = "hidden";
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
      for (let i = 0; i < rgba.length; i += 4) {
        colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
        for (let channel = 0; channel < 3; channel++) total[channel] += rgba[i + channel];
      }
      return { colors: colors.size, average: total.map((value) => Math.round(value / 576)) };
    }, png.toString("base64"));
  } finally {
    await stage.evaluate((element) => {
      element.querySelector("img").style.removeProperty("visibility");
      const canvas = element.querySelector("canvas");
      canvas.style.removeProperty("opacity");
      canvas.style.removeProperty("mix-blend-mode");
    });
  }
}
