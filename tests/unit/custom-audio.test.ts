import assert from "node:assert/strict";
import test from "node:test";
import {
  clipPolicy,
  recordingKey,
  validateAudio,
  validateRecording,
  type CustomRecording,
} from "../../lib/audio/custom-audio";
import { customAudioStorage } from "../../lib/audio/custom-audio-storage";
import { createRecordingSession } from "../../lib/audio/recording-session";
import { priorityPrompts, recordingLessons } from "../../features/settings/recording-data";
const unexpected = (value: unknown) => assert.fail(String(value));

test("recording identity preserves tone, polyphonic readings and whole-word boundaries", () => {
  assert.notEqual(recordingKey("長", "ㄓㄤˇ"), recordingKey("長", "ㄔㄤˊ"));
  assert.notEqual(recordingKey("狸", "ㄌㄧˊ"), recordingKey("狸", "ㄌㄧˇ"));
  assert.notEqual(recordingKey("半路", "ㄅㄢˋ|ㄌㄨˋ"), recordingKey("半", "ㄅㄢˋ"));
  assert.equal(recordingKey(" 半 ", " ㄅㄢˋ "), recordingKey("半", "ㄅㄢˋ"));
});

test("only confirmed custom audio uses normal speed and never synthetic fallback", () => {
  assert.deepEqual(clipPolicy(true, false, 0.7), { playbackRate: 1, allowSynthesis: false });
  assert.deepEqual(clipPolicy(false, true), { playbackRate: 1, allowSynthesis: false });
  assert.deepEqual(clipPolicy(false, false), { playbackRate: 1, allowSynthesis: true });
});

test("audio rejects empty, oversized, invalid-duration, non-audio and mismatched records", () => {
  const blob = new Blob(["audio"], { type: "audio/mp4" });
  assert.doesNotThrow(() => validateAudio(blob, 1));
  assert.throws(() => validateAudio(new Blob([], { type: "audio/mp4" }), 1));
  assert.throws(() =>
    validateAudio(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "audio/wav" }), 1),
  );
  for (const duration of [0, Infinity, NaN, 21]) assert.throws(() => validateAudio(blob, duration));
  assert.throws(() => validateAudio(new Blob(["html"], { type: "text/html" }), 1));
  assert.throws(() =>
    validateRecording({
      key: "wrong",
      text: "半",
      pronunciation: "ㄅㄢˋ",
      blob,
      duration: 1,
      mimeType: blob.type,
      updatedAt: Date.now(),
    }),
  );
});

test("recording catalog contains half/tone contrast and all nine lessons, no basic symbol replacement", () => {
  assert.equal(priorityPrompts[0].text, "半");
  assert.equal(priorityPrompts[0].pronunciation, "ㄅㄢˋ");
  assert.ok(priorityPrompts.some((item) => item.text === "狸" && item.pronunciation === "ㄌㄧˊ"));
  assert.ok(priorityPrompts.some((item) => item.text === "裡" && item.pronunciation === "ㄌㄧˇ"));
  assert.equal(recordingLessons.length, 9);
  for (const lesson of recordingLessons) {
    assert.ok(lesson.prompts.length > 0);
    assert.ok(lesson.prompts.every((item) => ["characters", "words"].includes(item.category)));
    assert.ok(lesson.prompts.every((item) => !/^[\u3105-\u3129]+$/.test(item.text)));
    assert.equal(new Set(lesson.prompts.map((item) => item.key)).size, lesson.prompts.length);
  }
});

function microphone() {
  let released = 0;
  const stream = {
    getTracks: () => [
      {
        stop: () => {
          released++;
        },
      },
    ],
  } as unknown as MediaStream;
  const recorder = {
    state: "inactive",
    mimeType: "audio/webm",
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    start() {
      this.state = "recording";
    },
    stop() {
      this.state = "inactive";
    },
    finish() {
      this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
      this.onstop?.();
    },
  };
  return { stream, recorder, released: () => released };
}

test("stopping returns one clip and releases microphone; canceled clips never escape", async () => {
  const mic = microphone();
  const clips: Blob[] = [];
  const session = createRecordingSession(
    { status: () => {}, ready: (blob) => clips.push(blob), error: unexpected },
    {
      getStream: async () => mic.stream,
      makeRecorder: () => mic.recorder as unknown as MediaRecorder,
    },
  );
  await session.start();
  session.stop();
  assert.equal(mic.released(), 1);
  mic.recorder.finish();
  assert.equal(clips.length, 1);
  await session.start();
  session.cancel();
  mic.recorder.finish();
  assert.equal(clips.length, 1);
});

test("late permission after cancel releases the stream without starting a recorder", async () => {
  const mic = microphone();
  let accept!: (stream: MediaStream) => void;
  const session = createRecordingSession(
    { status: () => {}, ready: unexpected, error: unexpected },
    {
      getStream: () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
      makeRecorder: () => {
        assert.fail("must not record after cancel");
      },
    },
  );
  const pending = session.start();
  session.cancel();
  accept(mic.stream);
  await pending;
  assert.equal(mic.released(), 1);
});

test("stale recorder stop event cannot close a newer microphone session", async () => {
  const first = microphone(),
    second = microphone();
  let calls = 0;
  const session = createRecordingSession(
    { status: () => {}, ready: () => {}, error: unexpected },
    {
      getStream: async () => (++calls === 1 ? first.stream : second.stream),
      makeRecorder: (stream) =>
        (stream === first.stream ? first.recorder : second.recorder) as unknown as MediaRecorder,
    },
  );
  await session.start();
  session.cancel();
  await session.start();
  first.recorder.finish();
  assert.equal(second.released(), 0);
  session.cancel();
  assert.equal(second.released(), 1);
});

test("recorder errors release the microphone and report failure", async () => {
  const mic = microphone();
  const errors: unknown[] = [];
  const session = createRecordingSession(
    { status: () => {}, ready: unexpected, error: (cause) => errors.push(cause) },
    {
      getStream: async () => mic.stream,
      makeRecorder: () => mic.recorder as unknown as MediaRecorder,
    },
  );
  await session.start();
  mic.recorder.onerror?.();
  assert.equal(mic.released(), 1);
  assert.equal(errors.length, 1);
});

test("IndexedDB save waits for commit and rejects a late quota abort", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  let tx!: {
    oncomplete: (() => void) | null;
    onabort: (() => void) | null;
    onerror: (() => void) | null;
    error: Error | null;
  };
  const fake = {
    open() {
      const request = {
        onupgradeneeded: null,
        onerror: null,
        onsuccess: null as (() => void) | null,
        result: {
          transaction() {
            tx = { oncomplete: null, onabort: null, onerror: null, error: null };
            return Object.assign(tx, { objectStore: () => ({ put() {} }) });
          },
          close() {},
        },
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  Object.defineProperty(globalThis, "indexedDB", { value: fake, configurable: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "indexedDB", descriptor);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  });
  const recording: CustomRecording = {
    key: recordingKey("半", "ㄅㄢˋ"),
    text: "半",
    pronunciation: "ㄅㄢˋ",
    blob: new Blob(["voice"], { type: "audio/mp4" }),
    duration: 1,
    updatedAt: Date.now(),
    mimeType: "audio/mp4",
  };
  let committed = false;
  const save = customAudioStorage.put(recording).then(() => {
    committed = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(committed, false);
  tx.oncomplete?.();
  await save;
  assert.equal(committed, true);
  const failedSave = customAudioStorage.put(recording);
  const rejected = assert.rejects(failedSave, /quota/);
  await new Promise((resolve) => setImmediate(resolve));
  tx.error = new Error("quota exceeded");
  tx.onabort?.();
  await rejected;
});
