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
