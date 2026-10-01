import assert from "node:assert/strict";
import test from "node:test";
import { createAudioPreloader } from "../../lib/audio/audio-preload";

async function untilReady(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(check(), "warm-up completed");
}

test("audio cache dedupes, evicts, disposes and falls back after a failed warmup", async (t) => {
  const fetched: string[] = [],
    revoked: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    fetched.push(url);
    if (url === "/missing") throw new Error("offline");
    return new Response(new Blob(["audio"]));
  });
  t.mock.method(URL, "createObjectURL", () => `blob:clip-${fetched.length}`);
  t.mock.method(URL, "revokeObjectURL", (url: string) => revoked.push(url));
  const cache = createAudioPreloader(1);
  cache.warm(["/first", "/first"]);
  await untilReady(() => cache.playbackUrl("/first").startsWith("blob:"));
  assert.deepEqual(fetched, ["/first"]);
  assert.equal(cache.playbackUrl("/first"), "blob:clip-1");
  cache.warm(["/missing", "/second"]);
  await untilReady(() => cache.playbackUrl("/second").startsWith("blob:"));
  assert.equal(cache.playbackUrl("/missing"), "/missing");
  assert.equal(cache.playbackUrl("/second"), "blob:clip-3");
  cache.dispose();
  cache.warm(["/third"]);
  assert.deepEqual(revoked, ["blob:clip-1", "blob:clip-3"]);
  assert.equal(fetched.length, 3);
});

test("audio warmup limits connections and prioritizes explicit playback", async (t) => {
  const started: string[] = [],
    aborted: string[] = [];
  let active = 0,
    peak = 0;
  t.mock.method(globalThis, "fetch", (url: string, { signal }: { signal: AbortSignal }) => {
    started.push(url);
    peak = Math.max(peak, ++active);
    return new Promise<Response>((_, reject) => {
      signal.addEventListener(
        "abort",
        () => {
          active--;
          aborted.push(url);
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
  });
  const cache = createAudioPreloader();
  cache.warm(["/first", "/second", "/third", "/fourth", "/first"]);
  assert.deepEqual(started, ["/first", "/second"]);
  cache.cancelWarmup("/first");
  assert.equal(cache.playbackUrl("/first"), "/first");
  await untilReady(() => started.length === 3);
  assert.deepEqual(aborted, ["/first"]);
  assert.equal(peak, 2);
  cache.dispose();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(active, 0);
  assert.equal(started.length, 3, "queued work must not restart after dispose");
});

test("a stalled warmup times out and allows the next clip to load", async (t) => {
  let aborted = false;
  t.mock.method(globalThis, "fetch", (url: string, { signal }: { signal: AbortSignal }) => {
    if (url === "/second") return Promise.resolve(new Response(new Blob(["audio"])));
    return new Promise<Response>((_, reject) => {
      signal.addEventListener(
        "abort",
        () => {
          aborted = true;
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
  });
  t.mock.method(URL, "createObjectURL", () => "blob:second");
  t.mock.method(URL, "revokeObjectURL", () => {});
  const cache = createAudioPreloader(2, { concurrency: 1, timeoutMs: 15 });
  cache.warm(["/stalled", "/second"]);
  await untilReady(() => aborted);
  await untilReady(() => cache.playbackUrl("/second") === "blob:second");
  assert.equal(cache.playbackUrl("/stalled"), "/stalled");
  cache.dispose();
});
