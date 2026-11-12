import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { test } from "node:test";
import { createMotion } from "../src/shared/motion.js";

const eligible = { active: true, visible: true, inView: true, reduced: false, paused: false, width: 700, height: 500 };
const initialSettings = { angle: 38, preset: "dawn" };

function setup(supported = true) {
  const starts = [];
  const states = [];
  const calls = [];
  const motion = createMotion({
    supported, initialSettings,
    initialize(options) {
      const deferred = Promise.withResolvers();
      starts.push({ ...options, ...deferred });
      return deferred.promise;
    },
    applySettings(renderer, settings) { calls.push(["settings", settings]); },
    renderState(state) { states.push(state); },
  });
  function renderer() {
    return {
      failure: null,
      getFailureReason() { return this.failure; },
      resize(width, height) { calls.push(["resize", width, height]); },
      pause() { calls.push(["pause"]); },
      resume() { calls.push(["resume"]); },
      destroy() { calls.push(["destroy"]); },
    };
  }
  return { starts, states, calls, motion, renderer };
}

test("unsupported and reduced/hidden/offscreen stages never initialize", () => {
  for (const [supported, constraints] of [
    [false, {}], [true, { reduced: true }], [true, { visible: false }],
    [true, { inView: false }], [true, { paused: true }], [true, { width: 0 }],
  ]) {
    const { motion, starts } = setup(supported);
    motion.update({ ...eligible, ...constraints });
    assert.equal(starts.length, 0);
  }
});

test("exposes the canvas only after the current first frame and applies new controls", async () => {
  const { starts, states, calls, motion, renderer } = setup();
  motion.update(eligible);
  const next = { angle: 78, preset: "overcast" };
  motion.setSettings(next);
  motion.update({ width: 390, height: 290 });
  const [start] = starts;
  assert.equal(starts.length, 1);
  assert.equal(start.settings, initialSettings);
  start.resolve(renderer());
  await setImmediate();
  assert.equal(states.at(-1), "starting");
  start.onReady();
  assert.equal(states.at(-1), "running");
  assert.deepEqual(calls, [["resize", 390, 290], ["settings", next]]);
});

test("serializes stale initialization across quick visibility and page transitions", async () => {
  for (const gate of [{ visible: false }, { active: false }, { inView: false }, { reduced: true }, { paused: true }]) {
    const { starts, states, calls, motion, renderer } = setup();
    motion.update(eligible);
    const [first] = starts;
    motion.update(gate);
    motion.update(eligible);
    first.onReady();
    assert.equal(first.signal.aborted, true);
    assert.equal(starts.length, 1);
    assert.equal(states.includes("running"), false);
    first.resolve(renderer());
    await setImmediate();
    assert.deepEqual(calls, [["destroy"]]);
    assert.equal(starts.length, 2);
    first.onReady();
    assert.equal(states.includes("running"), false);
    starts[1].onReady();
    starts[1].resolve(renderer());
    await setImmediate();
    assert.equal(states.at(-1), "running");
  }
});

test("disposes terminal instances and keeps a readable fallback after a rejection", async () => {
  const failure = setup();
  failure.motion.update(eligible);
  failure.starts[0].reject(new Error("adapter rejected"));
  await setImmediate();
  assert.equal(failure.states.at(-1), "unavailable");
  failure.motion.update({ visible: false });
  failure.motion.update(eligible);
  assert.equal(failure.starts.length, 1);

  const terminal = setup();
  terminal.motion.update(eligible);
  const instance = terminal.renderer();
  instance.failure = "no-device";
  terminal.starts[0].onError();
  terminal.starts[0].resolve(instance);
  await setImmediate();
  assert.deepEqual(terminal.calls, [["destroy"]]);
  assert.equal(terminal.states.at(-1), "unavailable");
});

test("pause wins over visibility and defers shader writes until running again", async () => {
  const { starts, states, calls, motion, renderer } = setup();
  motion.update(eligible);
  starts[0].onReady();
  starts[0].resolve(renderer());
  await setImmediate();
  const next = { angle: 180, preset: "honey" };
  motion.update({ inView: false });
  motion.update({ paused: true });
  motion.setSettings(next);
  motion.update({ width: 600, height: 420, inView: true });
  assert.equal(states.at(-1), "paused");
  assert.deepEqual(calls, [["pause"]]);
  motion.update({ paused: false });
  assert.deepEqual(calls, [["pause"], ["resize", 600, 420], ["settings", next], ["resume"]]);
  assert.equal(states.at(-1), "running");
  motion.update({ reduced: true });
  assert.equal(states.at(-1), "reduced");
  assert.deepEqual(calls.at(-1), ["destroy"]);
});

test("reapplies settings on recovery, then falls back after a terminal loss", async () => {
  const { starts, states, calls, motion, renderer } = setup();
  motion.update(eligible);
  const instance = renderer();
  const [start] = starts;
  start.onReady();
  start.resolve(instance);
  await setImmediate();
  start.onError();
  assert.equal(states.at(-1), "starting");
  const next = { angle: 4, preset: "dawn" };
  motion.setSettings(next);
  assert.deepEqual(calls, []);
  start.onReady();
  assert.deepEqual(calls, [["resize", 700, 500], ["settings", next]]);
  assert.equal(states.at(-1), "running");
  instance.failure = "unrecoverable";
  start.onError();
  assert.equal(states.at(-1), "unavailable");
  assert.deepEqual(calls.at(-1), ["destroy"]);
});

test("leaving during recovery releases the instance and return starts cleanly", async () => {
  const { starts, states, calls, motion, renderer } = setup();
  motion.update(eligible);
  const [start] = starts;
  start.onReady();
  start.resolve(renderer());
  await setImmediate();
  start.onError();
  motion.update({ active: false });
  start.onReady();
  assert.deepEqual(calls, [["destroy"]]);
  assert.equal(states.at(-1), "still");
  motion.update(eligible);
  assert.equal(starts.length, 2);
  assert.equal(states.at(-1), "starting");
});
