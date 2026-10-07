import test from "node:test";
import assert from "node:assert/strict";
import { createRecordingCache } from "../../lib/audio/recording-cache";
import { recordingKey, type CustomRecording } from "../../lib/audio/custom-audio";

test("missing recordings skip individual reads and concurrent reads share one lookup", async () => {
  let lists = 0,
    gets = 0;
  const clip: CustomRecording = {
    key: recordingKey("教", "ㄐㄧㄠ"),
    text: "教",
    pronunciation: "ㄐㄧㄠ",
    blob: new Blob(["audio"], { type: "audio/wav" }),
    mimeType: "audio/wav",
    duration: 1,
    updatedAt: 1,
  };
  const cache = createRecordingCache({
    list: async () => {
      lists++;
      return [clip];
    },
    get: async () => {
      gets++;
      return clip;
    },
  });
  await Promise.all([
    cache.get("教", "ㄐㄧㄠ"),
    cache.get("教", "ㄐㄧㄠ"),
    cache.get("教", "ㄐㄧㄠˋ"),
    cache.get("ㄅ", "ㄅ"),
  ]);
  assert.equal(lists, 1);
  assert.equal(gets, 1);
  await cache.get("教", "ㄐㄧㄠ");
  assert.equal(gets, 1);
  cache.removed(clip.key);
  assert.equal(await cache.get("教", "ㄐㄧㄠ"), null);
  cache.saved(clip);
  await cache.get("教", "ㄐㄧㄠ");
  assert.equal(gets, 2);
});
test("database failures are surfaced and a later lookup can retry", async () => {
  let failed = true;
  const cache = createRecordingCache({
    list: async () => {
      if (failed) throw new Error("blocked");
      return [];
    },
    get: async () => null,
  });
  await assert.rejects(cache.get("ㄅ", "ㄅ"), /blocked/);
  failed = false;
  assert.equal(await cache.get("ㄅ", "ㄅ"), null);
});
