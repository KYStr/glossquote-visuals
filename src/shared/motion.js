// Keep one initialization in flight. Shaders can start drawing before its promise
// resolves, so an invalidated result must be destroyed before starting a new one.
export function createMotion({ supported, initialize, applySettings, renderState, initialSettings }) {
  const view = { active: false, visible: false, inView: false, reduced: false, paused: false, width: 0, height: 0 };
  let settings = initialSettings;
  let pending = null;
  let current = null;
  let failed = false;
  let phase;

  function report(next) {
    if (phase === next) return;
    phase = next;
    renderState(next);
  }

  function destroyCurrent() {
    const previous = current;
    current = null;
    previous?.renderer.destroy();
  }

  function blockedPhase() {
    if (!view.active) return "still";
    if (view.reduced) return "reduced";
    if (!supported || failed) return "unavailable";
    if (view.paused) return "paused";
    if (!view.visible || !view.inView || !view.width || !view.height) return "still";
    return null;
  }

  function sync() {
    const blocked = blockedPhase();
    if (blocked) {
      pending?.abort.abort();
      if (!view.active || view.reduced || current?.recovering) {
        destroyCurrent();
      } else if (current && !current.stopped) {
        current.renderer.pause();
        current.stopped = true;
      }
      report(blocked);
      return;
    }

    if (!current) {
      report("starting");
      if (!pending) void start();
      return;
    }
    if (current.recovering) {
      report("starting");
      return;
    }

    const session = current;
    const { renderer } = session;
    if (view.width !== session.width || view.height !== session.height) {
      session.width = view.width;
      session.height = view.height;
      renderer.resize(view.width, view.height);
    }
    if (current !== session || session.recovering) return;
    if (settings !== session.settings) {
      session.settings = settings;
      applySettings(renderer, settings);
    }
    if (current !== session || session.recovering) return;
    if (session.stopped) {
      session.stopped = false;
      renderer.resume();
    }
    if (current === session && !session.recovering) report(session.ready ? "running" : "starting");
  }

  async function start() {
    const request = {
      abort: new AbortController(),
      ready: false,
      recovering: false,
      stopped: false,
      settings,
      width: view.width,
      height: view.height,
      renderer: null,
    };
    pending = request;
    const isRelevant = () => !request.abort.signal.aborted && (pending === request || current === request);
    try {
      const renderer = await initialize({
        signal: request.abort.signal,
        settings: request.settings,
        width: request.width,
        height: request.height,
        onReady() {
          if (!isRelevant()) return;
          request.ready = true;
          if (request.recovering) {
            // A rebuilt renderer starts on its own. Reapply the current size and
            // controls to the new device, then honor the current visibility gates.
            request.recovering = false;
            request.stopped = false;
            request.settings = null;
            request.width = 0;
          }
          if (current === request) sync();
        },
        onError() {
          if (!isRelevant()) return;
          request.ready = false;
          request.recovering = true;
          if (current !== request) return;
          if (request.renderer.getFailureReason()) {
            failed = true;
            destroyCurrent();
          }
          sync();
        },
      });
      if (request.abort.signal.aborted) {
        renderer?.destroy();
      } else if (!renderer || renderer.getFailureReason()) {
        renderer?.destroy();
        failed = true;
      } else {
        request.renderer = renderer;
        current = request;
      }
    } catch {
      if (!request.abort.signal.aborted) failed = true;
    } finally {
      pending = null;
      sync();
    }
  }

  return {
    update(next) {
      Object.assign(view, next);
      sync();
    },
    setSettings(next) {
      settings = next;
      sync();
    },
  };
}

export function observeMotion(stage, motion, preference) {
  let disconnect;

  function connect() {
    if (disconnect) return;
    let active = true;
    const updateVisibility = () => motion.update({ visible: document.visibilityState === "visible" });
    const updatePreference = () => motion.update({ reduced: preference.matches });
    const intersection = new IntersectionObserver(([entry]) => {
      if (active) motion.update({ inView: entry.isIntersecting && entry.intersectionRatio >= 0.01 });
    }, { threshold: 0.01 });
    const resize = new ResizeObserver(([entry]) => {
      if (active) motion.update({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });

    motion.update({ active: true, visible: document.visibilityState === "visible", reduced: preference.matches });
    intersection.observe(stage);
    resize.observe(stage);
    document.addEventListener("visibilitychange", updateVisibility);
    preference.addEventListener("change", updatePreference);
    disconnect = () => {
      active = false;
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
      preference.removeEventListener("change", updatePreference);
      motion.update({ active: false, inView: false, width: 0, height: 0 });
      disconnect = undefined;
    };
  }

  window.addEventListener("pagehide", () => disconnect?.());
  window.addEventListener("pageshow", connect);
  connect();
}
