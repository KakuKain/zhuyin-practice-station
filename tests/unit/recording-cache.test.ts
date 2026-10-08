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
test("an unavailable database leaves official clips playable and is retried after a pause", async () => {
  let failed = true,
    lists = 0,
    time = 0;
  const clip: CustomRecording = {
    key: recordingKey("半", "ㄅㄢˋ"),
    text: "半",
    pronunciation: "ㄅㄢˋ",
    blob: new Blob(["audio"], { type: "audio/wav" }),
    mimeType: "audio/wav",
    duration: 1,
    updatedAt: 1,
  };
  const cache = createRecordingCache(
    {
      list: async () => {
        lists++;
        if (failed) throw new Error("blocked");
        return [clip];
      },
      get: async () => clip,
    },
    12,
    1000,
    () => time,
  );
  // The manager still sees the failure; playback lookups fall back to official clips.
  await assert.rejects(cache.list(), /blocked/);
  assert.equal(await cache.get("ㄅ", "ㄅ"), null);
  assert.equal(await cache.get("半", "ㄅㄢˋ"), null);
  assert.equal(lists, 2);
  failed = false;
  time = 500;
  assert.equal(await cache.get("半", "ㄅㄢˋ"), null);
  assert.equal(lists, 2, "no repeated slow database opens during the pause");
  time = 1500;
  assert.equal(await cache.get("半", "ㄅㄢˋ"), clip);
});

test("a known recording that fails to load is still an error", async () => {
  const cache = createRecordingCache({
    list: async () => [
      {
        key: recordingKey("半", "ㄅㄢˋ"),
        text: "半",
        pronunciation: "ㄅㄢˋ",
        mimeType: "audio/wav",
        duration: 1,
        updatedAt: 1,
      },
    ],
    get: async () => {
      throw new Error("read failed");
    },
  });
  await assert.rejects(cache.get("半", "ㄅㄢˋ"), /read failed/);
});

test("saved recordings keep only metadata in the lookup map", async () => {
  const cache = createRecordingCache({ list: async () => [], get: async () => null });
  await cache.list();
  cache.saved({
    key: recordingKey("狸", "ㄌㄧˊ"),
    text: "狸",
    pronunciation: "ㄌㄧˊ",
    blob: new Blob(["audio"], { type: "audio/wav" }),
    mimeType: "audio/wav",
    duration: 1,
    updatedAt: 1,
  });
  const [item] = await cache.list();
  assert.equal("blob" in item, false);
});
