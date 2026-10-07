import { recordingKey, type CustomRecording, type RecordingInfo } from "./custom-audio";

type Storage = {
  list: () => Promise<RecordingInfo[]>;
  get: (text: string, pronunciation: string) => Promise<CustomRecording | null>;
};

/** Missing identities need no database lookup; retain only a small LRU of blobs. */
export function createRecordingCache(storage: Storage, limit = 12) {
  let metadata: Map<string, RecordingInfo> | null = null;
  let pending: Promise<RecordingInfo[]> | null = null;
  const clips = new Map<string, Promise<CustomRecording | null>>();
  let generation = 0;
  const list = () => {
    if (metadata) return Promise.resolve([...metadata.values()]);
    if (pending) return pending;
    const token = generation;
    const request = storage
      .list()
      .then((items) => {
        if (generation === token) metadata = new Map(items.map((item) => [item.key, item]));
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
      if (!metadata) await list();
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
      metadata?.set(recording.key, recording);
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
      clips.clear();
    },
  };
}
