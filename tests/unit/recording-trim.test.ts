import assert from "node:assert/strict";
import { test } from "node:test";
import { silenceBounds } from "../../lib/audio/recording-session";

test("edge trim preserves padding, quiet tail and interior silence", () => {
  const samples = new Float32Array(4000);
  samples.fill(0.2, 1000, 1500);
  samples.fill(0.1, 2000, 2300);
  samples.fill(0.005, 2300, 2500);
  const [start, end] = silenceBounds(samples, 1000);
  assert.equal(start, 700);
  assert.equal(end, 2800);
  assert.ok(start < 1500 && end > 2000);
});
test("silence and low level recordings keep their full duration", () => {
  assert.deepEqual(silenceBounds(new Float32Array(1000), 1000), [0, 1000]);
  assert.deepEqual(silenceBounds(new Float32Array(1000).fill(0.003), 1000), [0, 1000]);
});
