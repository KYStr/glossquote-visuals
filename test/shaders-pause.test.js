import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { preservePausedFrame } from "../scripts/shaders-csp.mjs";

const core = readFileSync(new URL("../node_modules/shaders/dist/core/index.js", import.meta.url), "utf8");
const standalone = readFileSync(new URL("../node_modules/shaders/dist/js/createShader.js", import.meta.url), "utf8");

test("interactive frame lock retains animation state and cancels pending pointer rendering", () => {
  const patched = preservePausedFrame(core, "core");
  const start = patched.indexOf("setFrameLocked: (");
  const end = patched.indexOf("\n\t\tsetOnReady:", start);
  const state = {
    frameLocked: false, lastRenderTime: 500, globalElapsedTime: 6.5,
    pendingRenderRAF: 42, nodes: new Map([["animated", { definition: { animatedTime: true,
      extraAnimatedTimes: { drift: "driftSpeed" } } }]]), stopped: 0, cancelled: [],
  };
  const times = new Map([["primary", { value: 3.25 }], ["driftSpeed", { value: 1.75 }]]);
  const writes = [];
  state.animatedTimeKey = () => "primary";
  state.extraAnimatedTimeKey = (_, speedProp) => speedProp;
  state.getAnimatedTimeState = (key) => times.get(key);
  state.writeSyntheticScalar = (_, key, value) => writes.push([key, value]);
  state.stopAnimation = () => state.stopped++;
  state.cancelAnimationFrame = (id) => state.cancelled.push(id);
  const api = runInNewContext(`({${patched.slice(start, end)}})`, state);
  api.setFrameLocked(true, true);
  assert.equal(state.frameLocked, true);
  assert.equal(state.globalElapsedTime, 6.5);
  assert.equal(state.pendingRenderRAF, null);
  assert.deepEqual(state.cancelled, [42]);
  api.setFrameLocked(false, true);
  assert.equal(state.frameLocked, false);
  assert.equal(state.lastRenderTime, 0);
  assert.equal(state.globalElapsedTime, 6.5);
  assert.equal(times.get("primary").value, 3.25);
  assert.equal(times.get("driftSpeed").value, 1.75);
  assert.deepEqual(writes, []);
  api.setFrameLocked(true);
  assert.equal(state.globalElapsedTime, 0, "offline deterministic rendering retains upstream reset behavior");
  assert.equal(times.get("primary").value, 0);
  assert.equal(times.get("driftSpeed").value, 0);
});

test("standalone pause locks frames and resume unlocks before restarting", () => {
  const patched = preservePausedFrame(standalone, "standalone");
  const start = patched.indexOf("\tfunction pause() {");
  const end = patched.indexOf("\n\treturn {", start);
  const calls = [];
  const current = { renderer: {
    setFrameLocked: (...args) => calls.push(["lock", ...args]),
    startAnimation: () => calls.push(["start"]),
  } };
  const api = runInNewContext(`${patched.slice(start, end)}; ({pause, resume})`, { current });
  api.pause();
  api.resume();
  assert.deepEqual(calls, [["lock", true, true], ["lock", false, true], ["start"]]);
  assert.throws(() => preservePausedFrame(core + "\n", "core"), /hash changed/);
  assert.throws(() => preservePausedFrame(standalone + "\n", "standalone"), /hash changed/);
});
