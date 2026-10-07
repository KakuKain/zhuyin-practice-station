import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareDeviceBackup,
  restoreDeviceBackup,
  snapshotStorage,
  type DeviceBackup,
} from "../../lib/storage/device-backup";
import { recordingKey } from "../../lib/audio/custom-audio";
const backup = (): DeviceBackup => ({
  format: "zhuyin-device-backup",
  version: 1,
  createdAt: 1,
  storage: {
    "zhuyin-listening-settings-v1": JSON.stringify({
      repeatCount: 3,
      intervalSeconds: 5,
      answerTime: "relaxed",
    }),
  },
  recordings: [],
});
function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  } satisfies Storage;
}
test("backup keeps recording bytes and their exact pronunciation identity", () => {
  const value = backup();
  value.recordings.push({
    key: recordingKey("教", "ㄐㄧㄠ"),
    text: "教",
    pronunciation: "ㄐㄧㄠ",
    mimeType: "audio/wav",
    duration: 1,
    updatedAt: 1,
    base64: btoa("sound"),
  });
  const prepared = prepareDeviceBackup(value);
  assert.equal(prepared.recordings[0].blob.size, 5);
  assert.equal(prepared.summary.recordings, 1);
});
test("unsupported keys, invalid settings, broken drafts and mismatched audio cannot be restored", () => {
  const patches: Record<string, string>[] = [
    { other: "{}" },
    { "zhuyin-listening-settings-v1": "{}" },
    { "zhuyin-fill-draft-v1-0": "{}" },
  ];
  for (const patch of patches) {
    const value = backup();
    value.storage = patch;
    assert.throws(() => prepareDeviceBackup(value));
  }
  const value = backup();
  value.recordings.push({
    key: "wrong",
    text: "教",
    pronunciation: "ㄐㄧㄠ",
    mimeType: "audio/wav",
    duration: 1,
    updatedAt: 1,
    base64: btoa("sound"),
  });
  assert.throws(() => prepareDeviceBackup(value));
});
test("a late database abort rolls local values back and leaves unrelated application data intact", async () => {
  const storage = memory({ "zhuyin-listening-settings-v1": "old", unrelated: "keep" });
  await assert.rejects(
    restoreDeviceBackup(prepareDeviceBackup(backup()), storage, async () => {
      throw new Error("database aborted");
    }),
  );
  assert.equal(storage.getItem("zhuyin-listening-settings-v1"), "old");
  assert.equal(storage.getItem("unrelated"), "keep");
});
test("quota failure aborts before any recording mutation", async () => {
  const storage = memory({ "zhuyin-listening-settings-v1": "old" });
  const set = storage.setItem;
  storage.setItem = (key, value) => {
    if (value !== "old") throw new Error("quota");
    set(key, value);
  };
  let called = false;
  await assert.rejects(
    restoreDeviceBackup(prepareDeviceBackup(backup()), storage, async () => {
      called = true;
    }),
  );
  assert.equal(called, false);
  assert.deepEqual(snapshotStorage(storage), { "zhuyin-listening-settings-v1": "old" });
});
