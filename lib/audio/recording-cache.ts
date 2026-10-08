import { recordingKey, type CustomRecording, type RecordingInfo } from "./custom-audio";

type Storage = {
  list: () => Promise<RecordingInfo[]>;
  get: (text: string, pronunciation: string) => Promise<CustomRecording | null>;
};

const info = ({ key, text, pronunciation, mimeType, duration, updatedAt }: RecordingInfo) => ({
  key,
  text,
  pronunciation,
  mimeType,
  duration,
  updatedAt,
});

/**
 * Missing identities need no database lookup; retain only a small LRU of blobs.
 *
 * When the recording database cannot be opened at all (blocked site data, a damaged
 * store), playback lookups resolve to "no custom recording" so official clips keep
 * working, and the database is retried after a pause rather than on every tap. `list()`
 * still rejects so the recording manager can explain the problem. A recording that is
 * known to exist but fails to load is still an error: it must not be replaced silently.
 */
export function createRecordingCache(storage: Storage, limit = 12, retryMs = 30000, now = Date.now) {
  let metadata: Map<string, RecordingInfo> | null = null;
  let pending: Promise<RecordingInfo[]> | null = null;
  let unavailableUntil = 0;
  const clips = new Map<string, Promise<CustomRecording | null>>();
  let generation = 0;
  const list = () => {
    if (metadata) return Promise.resolve([...metadata.values()]);
    if (pending) return pending;
    const token = generation;
    const request = storage
      .list()
      .then((items) => {
        if (generation === token) metadata = new Map(items.map((item) => [item.key, info(item)]));
        unavailableUntil = 0;
        return items;
      })
      .finally(() => {
        if (pending === request) pending = null;
      });
    pending = request;
    return request;
  };
  return {
    list,
    async get(text: string, pronunciation: string) {
      if (!metadata) {
        if (now() < unavailableUntil) return null;
        try {
          await list();
        } catch {
          unavailableUntil = now() + retryMs;
          return null;
        }
      }
      const key = recordingKey(text, pronunciation);
      if (!metadata?.has(key)) return null;
      let request = clips.get(key);
      if (!request) {
        request = storage.get(text, pronunciation).catch((error) => {
          clips.delete(key);
          throw error;
        });
        clips.set(key, request);
      } else {
        clips.delete(key);
        clips.set(key, request);
      }
      if (clips.size > limit) clips.delete(clips.keys().next().value!);
      return request;
    },
    saved(recording: CustomRecording) {
      generation++;
      pending = null;
      // Keep metadata only; the bytes stay in IndexedDB and the small clip LRU.
      metadata?.set(recording.key, info(recording));
      clips.delete(recording.key);
    },
    removed(key: string) {
      generation++;
      pending = null;
      metadata?.delete(key);
      clips.delete(key);
    },
    invalidate() {
      generation++;
      pending = null;
      metadata = null;
      unavailableUntil = 0;
      clips.clear();
    },
  };
}
