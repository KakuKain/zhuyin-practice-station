// Keep only the clips children are likely to play. Blob URLs make playback use
// the bytes we already fetched, even when the browser's media cache differs
// from its normal HTTP cache.
export function createAudioPreloader(maxClips = 64) {
  const ready = new Map<string, string>();
  const pending = new Map<string, AbortController>();
  let disposed = false;

  const warm = (urls: readonly string[]) => {
    if (
      disposed ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    )
      return;
    for (const url of new Set(urls)) {
      if (ready.has(url) || pending.has(url)) continue;
      const controller = new AbortController();
      pending.set(url, controller);
      void fetch(url, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Audio preload failed: ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (disposed || controller.signal.aborted) return;
          ready.set(url, URL.createObjectURL(blob));
          if (ready.size > maxClips) {
            const oldest = ready.keys().next().value;
            if (oldest) {
              URL.revokeObjectURL(ready.get(oldest)!);
              ready.delete(oldest);
            }
          }
        })
        .catch(() => {
          // A failed warm-up must never prevent normal on-demand playback.
        })
        .finally(() => pending.delete(url));
    }
  };

  const playbackUrl = (url: string) => {
    const cached = ready.get(url);
    if (!cached) return url;
    ready.delete(url);
    ready.set(url, cached);
    return cached;
  };

  const dispose = () => {
    disposed = true;
    pending.forEach((controller) => controller.abort());
    pending.clear();
    ready.forEach((url) => URL.revokeObjectURL(url));
    ready.clear();
  };

  return { warm, playbackUrl, dispose };
}
