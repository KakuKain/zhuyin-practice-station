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
import { validateFillDraft } from "../../features/fill/fill-storage";
import { readBoardDraft } from "../ink/free-board";
import { fillDraftKeyIndex, ownsStorageKey, storageKeys } from "./storage-keys";
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
    /** Values this version cannot read; they are restored unchanged instead of blocking the file. */
    unreadable: number;
  };
};
export { ownsStorageKey };
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
    storage[key] = text;
  }
  // The app reads every key leniently and migrates old shapes, so a backup restores the
  // exact saved text. Validators only describe the contents; an older settings shape, a
  // corrected lesson reading or a value this version cannot read must not block the file.
  const parse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  let unreadable = 0;
  let materials = initialMaterials;
  if (storage[materialsStorageKey] !== undefined) {
    try {
      materials = validateMaterials(JSON.parse(storage[materialsStorageKey]));
    } catch {
      unreadable++;
    }
  }
  const catalog = buildCatalog(materials);
  // The app reads the newest practice key that exists; older ones are migration input only.
  const practiceKeys = [
    [storageKeys.practice, 4],
    [storageKeys.practiceV3, 3],
    [storageKeys.practiceV2, 2],
    [storageKeys.practiceV1, 1],
  ] as const;
  const activePracticeKey = practiceKeys.find(([key]) => storage[key] !== undefined)?.[0];
  let saved = 0,
    drafts = 0,
    strokes = 0;
  for (const [key, text] of Object.entries(storage)) {
    if (key === materialsStorageKey) continue;
    const parsed = parse(text);
    const record =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    const practiceVersion = practiceKeys.find(([practiceKey]) => practiceKey === key)?.[1];
    const draftIndex = fillDraftKeyIndex(key);
    if (practiceVersion) {
      if (!record || !Array.isArray(record.savedQuestions)) unreadable++;
      else if (key === activePracticeKey)
        saved += validatePracticeState(record, practiceVersion, catalog, true).savedQuestions
          .length;
    } else if (key === storageKeys.fillFavorites) {
      if (!Array.isArray(parsed)) unreadable++;
      else saved += validatedFillFavorites(parsed, catalog, true).length;
    } else if (key === storageKeys.listeningSettings) {
      if (!record) unreadable++;
    } else if (draftIndex !== null) {
      const lesson = catalog.find((l) => l.index === draftIndex);
      if (lesson && validateFillDraft(parsed, draftIndex, lesson.exercise.lines.flat().length))
        drafts++;
      else unreadable++;
    } else if (key === storageKeys.freeBoard) {
      const board = readBoardDraft(parsed, 304);
      if (board) strokes = board.strokes.length;
      else unreadable++;
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
      unreadable,
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
}
