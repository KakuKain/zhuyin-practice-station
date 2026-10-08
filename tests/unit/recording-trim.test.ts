import assert from "node:assert/strict";
import { test } from "node:test";
import {
  downsample,
  encodeWav,
  silenceBounds,
  speechSampleRate,
} from "../../lib/audio/recording-session";

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

test("trimmed takes are stored as speech-rate mono WAV", async () => {
  const input = new Float32Array(48000);
  for (let index = 0; index < input.length; index++)
    input[index] = Math.sin((2 * Math.PI * 440 * index) / 48000) * 0.5;
  const output = downsample(input, 48000);
  assert.equal(output.length, Math.floor(48000 / (48000 / speechSampleRate)));
  assert.ok(Math.max(...output) > 0.45 && Math.max(...output) <= 0.5);
  assert.equal(downsample(input, 16000), input);
  const wav = encodeWav(output, speechSampleRate);
  assert.equal(wav.size, 44 + output.length * 2);
  const view = new DataView(await wav.arrayBuffer());
  assert.equal(view.getUint32(24, true), speechSampleRate);
  assert.equal(view.getUint16(22, true), 1);
});
