// Keep only the clips children are likely to play. Blob URLs make playback use
// the bytes we already fetched, even when the browser's media cache differs
// from its normal HTTP cache.
export function createAudioPreloader(
  maxClips = 64,
  { concurrency = 2, timeoutMs = 8000 }: { concurrency?: number; timeoutMs?: number } = {},
) {
  const ready = new Map<string, string>();
  const pending = new Map<string, AbortController>();
  const queued = new Set<string>();
  let disposed = false;

  const pump = () => {
    // Leave connections and bandwidth for visible artwork/fonts and on-demand playback.
    while (!disposed && pending.size < concurrency && queued.size) {
      const url = queued.values().next().value!;
      queued.delete(url);
      const controller = new AbortController();
      pending.set(url, controller);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
        .finally(() => {
          clearTimeout(timeout);
          pending.delete(url);
          pump();
        });
    }
  };

  const warm = (urls: readonly string[]) => {
    if (
      disposed ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    )
      return;
    for (const url of urls) {
      if (!ready.has(url) && !pending.has(url)) queued.add(url);
    }
    pump();
  };

  const playbackUrl = (url: string) => {
    const cached = ready.get(url);
    if (!cached) return url;
    ready.delete(url);
    ready.set(url, cached);
    return cached;
  };

  const cancelWarmup = (url: string) => {
    // Prefer the child's explicit play request over a stalled background copy.
    queued.delete(url);
    pending.get(url)?.abort();
  };

  const dispose = () => {
    disposed = true;
    queued.clear();
    pending.forEach((controller) => controller.abort());
    pending.clear();
    ready.forEach((url) => URL.revokeObjectURL(url));
    ready.clear();
  };

  return { warm, playbackUrl, cancelWarmup, dispose };
}
