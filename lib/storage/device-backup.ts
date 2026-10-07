import {
  buildCatalog,
  initialMaterials,
  materialsStorageKey,
  validateMaterials,
} from "../../features/courses/materials";
import {
  validatePracticeState,
  validatedFillFavorites,
} from "../../features/practice/practice-storage";
import { validateFillDraft, fillDraftCookieKey } from "../../features/fill/fill-storage";
import { validateListeningSettings } from "../../features/settings/listening-settings";
import { freeBoardKey, readBoardDraft } from "../ink/free-board";
import { customAudioStorage } from "../audio/custom-audio-storage";
import {
  validateRecording,
  maxRecordingBytes,
  type CustomRecording,
  type RecordingInfo,
} from "../audio/custom-audio";

export const maxBackupBytes = 64 * 1024 * 1024;
type SerializedRecording = RecordingInfo & { base64: string };
export type DeviceBackup = {
  format: "zhuyin-device-backup";
  version: 1;
  createdAt: number;
  storage: Record<string, string>;
  recordings: SerializedRecording[];
};
export type PreparedBackup = {
  backup: DeviceBackup;
  recordings: CustomRecording[];
  summary: {
    materials: number;
    saved: number;
    drafts: number;
    strokes: number;
    recordings: number;
  };
};
export const ownsStorageKey = (key: string) =>
  /^zhuyin-(materials-v1|practice-state-v[1-4]|fill-favorites-v1|listening-settings-v1|fill-draft-v1-\d+)$/.test(
    key,
  ) || key === freeBoardKey;
export function snapshotStorage(storage: Storage): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!;
    if (ownsStorageKey(key)) values[key] = storage.getItem(key)!;
  }
  return values;
}
function base64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export async function createDeviceBackup(storage: Storage = localStorage): Promise<DeviceBackup> {
  const recordings = await customAudioStorage.all();
  return {
    format: "zhuyin-device-backup",
    version: 1,
    createdAt: Date.now(),
    storage: snapshotStorage(storage),
    recordings: await Promise.all(
      recordings.map(async ({ blob, ...info }) => ({
        ...info,
        base64: base64(new Uint8Array(await blob.arrayBuffer())),
      })),
    ),
  };
}
const fail = () => {
  throw new Error("備份內容不完整或格式不支援；目前資料沒有改動。");
};
export function prepareDeviceBackup(raw: unknown): PreparedBackup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
  const value = raw as DeviceBackup;
  if (
    value.format !== "zhuyin-device-backup" ||
    value.version !== 1 ||
    !Number.isFinite(value.createdAt) ||
    !value.storage ||
    typeof value.storage !== "object" ||
    Array.isArray(value.storage) ||
    Object.keys(value.storage).length > 2000 ||
    !Array.isArray(value.recordings) ||
    value.recordings.length > 1000
  )
    return fail();
  const storage: Record<string, string> = {};
  for (const [key, text] of Object.entries(value.storage)) {
    if (!ownsStorageKey(key) || typeof text !== "string" || text.length > 5 * 1024 * 1024)
      return fail();
    JSON.parse(text);
    storage[key] = text;
  }
  const materials = storage[materialsStorageKey]
    ? validateMaterials(JSON.parse(storage[materialsStorageKey]))
    : initialMaterials;
  const catalog = buildCatalog(materials);
  let saved = 0,
    drafts = 0,
    strokes = 0;
  for (const [key, text] of Object.entries(storage)) {
    const parsed = JSON.parse(text);
    const practice = /^zhuyin-practice-state-v([1-4])$/.exec(key);
    const draft = /^zhuyin-fill-draft-v1-(\d+)$/.exec(key);
    if (practice) {
      if (!parsed || !Array.isArray(parsed.savedQuestions)) return fail();
      const checked = validatePracticeState(
        parsed,
        Number(practice[1]) as 1 | 2 | 3 | 4,
        catalog,
        true,
      );
      if (
        checked.savedQuestions.length !== parsed.savedQuestions.length ||
        (parsed.history && checked.history.length !== parsed.history.length)
      )
        return fail();
      if (practice[1] === "4") saved += checked.savedQuestions.length;
    } else if (key === "zhuyin-fill-favorites-v1") {
      const checked = validatedFillFavorites(parsed, catalog, true);
      if (!Array.isArray(parsed) || checked.length !== parsed.length) return fail();
      saved += checked.length;
    } else if (key === "zhuyin-listening-settings-v1") {
      const checked = validateListeningSettings(parsed);
      if (Object.entries(checked).some(([k, v]) => parsed[k] !== v)) return fail();
    } else if (draft) {
      const index = Number(draft[1]),
        lesson = catalog.find((l) => l.index === index);
      if (!lesson || !validateFillDraft(parsed, index, lesson.exercise.lines.flat().length))
        return fail();
      drafts++;
    } else if (key === freeBoardKey) {
      const board = readBoardDraft(parsed, 304);
      if (!board) return fail();
      strokes = board.strokes.length;
    }
  }
  const keys = new Set<string>();
  const recordings = value.recordings.map((item) => {
    if (
      !item ||
      typeof item.base64 !== "string" ||
      item.base64.length > Math.ceil((maxRecordingBytes * 4) / 3) + 4 ||
      keys.has(item.key)
    )
      return fail();
    keys.add(item.key);
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.base64))
      return fail();
    const bytes = Uint8Array.from(atob(item.base64), (c) => c.charCodeAt(0));
    const { base64: _, ...info } = item;
    void _;
    const recording = { ...info, blob: new Blob([bytes], { type: item.mimeType }) };
    validateRecording(recording);
    return recording;
  });
  const backup: DeviceBackup = {
    format: value.format,
    version: 1,
    createdAt: value.createdAt,
    storage,
    recordings: value.recordings,
  };
  if (JSON.stringify(backup).length > maxBackupBytes) return fail();
  return {
    backup,
    recordings,
    summary: {
      materials: materials.materials.length,
      saved,
      drafts,
      strokes,
      recordings: recordings.length,
    },
  };
}

/** Local writes happen first; a quota/IDB failure restores the exact old local values. */
export async function restoreDeviceBackup(
  prepared: PreparedBackup,
  storage: Storage = localStorage,
  replaceAudio = customAudioStorage.replaceAll,
) {
  const checked = prepareDeviceBackup(prepared.backup);
  const before = snapshotStorage(storage);
  const replace = (values: Record<string, string>) => {
    Object.keys(snapshotStorage(storage)).forEach((key) => storage.removeItem(key));
    Object.entries(values).forEach(([key, text]) => storage.setItem(key, text));
  };
  try {
    replace(checked.backup.storage);
    await replaceAudio(checked.recordings);
  } catch (error) {
    try {
      replace(before);
    } catch {
      throw new Error("還原未完成，裝置空間不足。請保留下載的備份，釋放空間後再還原。");
    }
    throw error;
  }
  if (typeof document !== "undefined") {
    const indexes = new Set(
      [...Object.keys(before), ...Object.keys(checked.backup.storage)].flatMap((k) => {
        const m = /^zhuyin-fill-draft-v1-(\d+)$/.exec(k);
        return m ? [Number(m[1])] : [];
      }),
    );
    for (const index of indexes)
      document.cookie = `${fillDraftCookieKey(index)}=${checked.backup.storage[`zhuyin-fill-draft-v1-${index}`] ? "1" : ""}; path=/; max-age=${checked.backup.storage[`zhuyin-fill-draft-v1-${index}`] ? 2592000 : 0}; SameSite=Lax`;
  }
}
