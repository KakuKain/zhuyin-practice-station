import { recordingKey, type CustomRecording, type RecordingInfo } from "./custom-audio";

type Storage = {
  keys: () => Promise<string[]>;
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
 * Playback only needs to know which identities exist, read once as keys, so the app never
 * reads every recording's audio at start-up. The full list is loaded when the recording
 * manager asks for it. A small LRU keeps recently played blobs.
 *
 * When the recording database cannot be opened at all (blocked site data, a damaged
 * store), playback lookups resolve to "no custom recording" so official clips keep
 * working, and the database is retried after a pause rather than on every tap. `list()`
 * still rejects so the recording manager can explain the problem. A recording that is
 * known to exist but fails to load is still an error: it must not be replaced silently.
 */
export function createRecordingCache(
  storage: Storage,
  limit = 12,
  retryMs = 30000,
  now = Date.now,
) {
  let known: Set<string> | null = null;
  let pendingKeys: Promise<Set<string>> | null = null;
  let infos: Map<string, RecordingInfo> | null = null;
  let pendingList: Promise<RecordingInfo[]> | null = null;
  let unavailableUntil = 0;
  const clips = new Map<string, Promise<CustomRecording | null>>();
  let generation = 0;
  const loadKeys = () => {
    if (known) return Promise.resolve(known);
    if (pendingKeys) return pendingKeys;
    const token = generation;
    const request = storage
      .keys()
      .then((keys) => {
        const result = new Set(keys);
        if (generation === token) known = result;
        unavailableUntil = 0;
        return result;
      })
      .finally(() => {
        if (pendingKeys === request) pendingKeys = null;
      });
    pendingKeys = request;
    return request;
  };
  const list = () => {
    if (infos) return Promise.resolve([...infos.values()]);
    if (pendingList) return pendingList;
    const token = generation;
    const request = storage
      .list()
      .then((items) => {
        if (generation === token) {
          infos = new Map(items.map((item) => [item.key, info(item)]));
          known = new Set(infos.keys());
        }
        unavailableUntil = 0;
        return items.map(info);
      })
      .finally(() => {
        if (pendingList === request) pendingList = null;
      });
    pendingList = request;
    return request;
  };
  return {
    list,
    async get(text: string, pronunciation: string) {
      let identities = known;
      if (!identities) {
        if (now() < unavailableUntil) return null;
        try {
          identities = await loadKeys();
        } catch {
          unavailableUntil = now() + retryMs;
          return null;
        }
      }
      const key = recordingKey(text, pronunciation);
      if (!identities.has(key)) return null;
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
      pendingKeys = pendingList = null;
      known?.add(recording.key);
      // Keep metadata only; the bytes stay in IndexedDB and the small clip LRU.
      infos?.set(recording.key, info(recording));
      clips.delete(recording.key);
    },
    removed(key: string) {
      generation++;
      pendingKeys = pendingList = null;
      known?.delete(key);
      infos?.delete(key);
      clips.delete(key);
    },
    invalidate() {
      generation++;
      pendingKeys = pendingList = null;
      known = null;
      infos = null;
      unavailableUntil = 0;
      clips.clear();
    },
  };
}
