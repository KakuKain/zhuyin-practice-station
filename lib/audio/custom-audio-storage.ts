import {
  recordingKey,
  validateRecording,
  type CustomRecording,
  type RecordingInfo,
} from "./custom-audio";
import { customAudioDatabase } from "../storage/storage-keys";

const databaseName = customAudioDatabase;
const storeName = "recordings";
type StoredRecording = Omit<CustomRecording, "blob"> & { blob: Blob | ArrayBuffer };
function hydrateRecording(value: StoredRecording): CustomRecording {
  const recording = {
    ...value,
    blob:
      value.blob instanceof ArrayBuffer
        ? new Blob([value.blob], { type: value.mimeType })
        : value.blob,
  };
  validateRecording(recording);
  return recording;
}
async function serializeRecording(recording: CustomRecording): Promise<StoredRecording> {
  validateRecording(recording);
  const { key, text, pronunciation, mimeType, duration, updatedAt } = recording;
  // Byte storage avoids WebKit's Blob/File preparation failure. Old Blob records remain readable.
  return {
    key,
    text,
    pronunciation,
    mimeType,
    duration,
    updatedAt,
    blob: await recording.blob.arrayBuffer(),
  };
}

/** Resolve on transaction completion: a successful request can still fail to commit. */
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  if (typeof indexedDB === "undefined")
    throw new Error("這個瀏覽器無法儲存錄音，請換一般瀏覽器模式再試。");
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let expired = false;
    const timeout = setTimeout(() => {
      expired = true;
      reject(new Error("錄音儲存區無法開啟，請關閉其他相同網站的分頁後再試。"));
    }, 8000);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName, { keyPath: "key" });
    };
    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error ?? new Error("無法開啟裝置錄音儲存區。"));
    };
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (expired) request.result.close();
      else resolve(request.result);
    };
  });
  return new Promise<T>((resolve, reject) => {
    let value: T;
    const tx = db.transaction(storeName, mode);
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("錄音沒有儲存成功，原本的錄音仍保留。"));
    };
    tx.onerror = () => {
      /* Abort reports the final error; never report an early success. */
    };
    try {
      action(tx.objectStore(storeName), (result) => {
        value = result;
      });
    } catch (error) {
      tx.abort();
      db.close();
      reject(error);
    }
  });
}

export const customAudioStorage = {
  all(): Promise<CustomRecording[]> {
    return transaction<StoredRecording[]>("readonly", (store, result) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const recordings = request.result as StoredRecording[];
        result(recordings);
      };
    }).then((recordings) => recordings.map(hydrateRecording));
  },
  /** Clear and insert in one transaction: an aborted import keeps all old recordings. */
  async replaceAll(recordings: CustomRecording[]): Promise<void> {
    const stored = await Promise.all(recordings.map(serializeRecording));
    return transaction("readwrite", (store, result) => {
      store.clear();
      stored.forEach((recording) => store.put(recording));
      result(undefined);
    });
  },
  async get(text: string, pronunciation: string): Promise<CustomRecording | null> {
    const value = await transaction<StoredRecording | undefined>("readonly", (store, result) => {
      const request = store.get(recordingKey(text, pronunciation));
      request.onsuccess = () => result(request.result);
    });
    if (!value) return null;
    return hydrateRecording(value);
  },
  /** Identities only: playback needs to know what exists without reading any audio. */
  keys(): Promise<string[]> {
    return transaction("readonly", (store, result) => {
      const request = store.getAllKeys();
      request.onsuccess = () => result(request.result.map(String));
    });
  },
  list(): Promise<RecordingInfo[]> {
    return transaction("readonly", (store, result) => {
      const entries: RecordingInfo[] = [];
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        if (!cursor.result) {
          result(entries);
          return;
        }
        const recording = cursor.result.value as CustomRecording;
        // List metadata only: do not retain all audio blobs in React's state.
        entries.push({
          key: recording.key,
          text: recording.text,
          pronunciation: recording.pronunciation,
          mimeType: recording.mimeType,
          duration: recording.duration,
          updatedAt: recording.updatedAt,
        });
        cursor.result.continue();
      };
    });
  },
  async put(recording: CustomRecording): Promise<void> {
    const stored = await serializeRecording(recording);
    return transaction("readwrite", (store, result) => {
      // Do not persist UI-only object URLs or other incidental fields.
      store.put(stored);
      result(undefined);
    });
  },
  remove(key: string): Promise<void> {
    return transaction("readwrite", (store, result) => {
      store.delete(key);
      result(undefined);
    });
  },
};
