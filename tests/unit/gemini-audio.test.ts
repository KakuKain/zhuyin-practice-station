import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { dictationAudioUrl } from "../../features/listening/listening-data";
import { mathPromptUrl } from "../../features/math/math-audio";

const manifest = JSON.parse(readFileSync("public/listening-audio/gemini/manifest.json", "utf8"));

test("all nine lesson readings and 21 complete rhyme clips are shipped (ㄧㄤ retired)", () => {
  assert.equal(manifest.lessons.length, 9);
  assert.equal(manifest.rhymes.length, 21);
  assert.equal(new Set(manifest.rhymes.map((clip: { text: string }) => clip.text)).size, 21);
  // ㄧㄤ was heard as ㄧㄤˊ; it now plays the dictionary's 「央」 (see audio-registry.ts).
  assert.deepEqual(
    manifest.retired.map((clip: { text: string }) => clip.text),
    ["ㄧㄤ"],
  );
  for (const clip of [...manifest.lessons, ...manifest.rhymes]) {
    assert.ok(statSync(`public${clip.path}`).size > 4000);
    assert.ok(clip.duration > 1.3);
  }
});

test("every combined rhyme uses its Gemini clip, or the dictionary's character, without narration", () => {
  for (const clip of manifest.rhymes) {
    assert.equal(new URL(dictationAudioUrl(clip.text), "http://test").pathname, clip.path);
    assert.match(dictationAudioUrl(clip.text), /[?]v=[a-f0-9]{12}$/);
    assert.ok(clip.voicedDuration >= 0.7);
    assert.ok(clip.duration - clip.voicedDuration >= 0.5);
  }
  // The dictionary's 「央」 stops before the recording reads its radical and strokes.
  assert.equal(dictationAudioUrl("ㄧㄤ"), "listening-audio/moe-examples/6160.mp3#t=0,0.7");
  assert.equal(
    manifest.rhymes.find((clip: { text: string }) => clip.text === "ㄧㄞ").tone,
    "第二聲",
  );
});

test("batch-voiced clips play their Gemini file, replace Meijia, and name a logged batch", () => {
  const batches: { id: string; items: string[] }[] = JSON.parse(
    readFileSync("assets/gemini-batches.json", "utf8"),
  ).batches;
  const items = new Map(batches.map((batch) => [batch.id, new Set(batch.items)]));
  const words = manifest.words.filter((clip: { batch?: string }) => clip.batch);
  assert.ok(words.length >= 300);
  for (const clip of words) {
    assert.ok(items.get(clip.batch)?.has(clip.text), `${clip.text} is not in ${clip.batch}`);
    assert.equal(new URL(dictationAudioUrl(clip.text), "http://test").pathname, clip.path);
    assert.ok(statSync(`public${clip.path}`).size > 1000);
    const name = [...clip.text].map((c) => c.codePointAt(0)!.toString(16)).join("-");
    assert.ok(!existsSync(`public/listening-audio/${name}.m4a`), `${clip.text} still has Meijia`);
  }
  const math: Record<string, { version: number; batch?: string }> = JSON.parse(
    readFileSync("features/math/math-audio-gemini.json", "utf8"),
  );
  for (const [id, clip] of Object.entries(math)) {
    if (!clip.batch) continue;
    assert.ok(items.get(clip.batch)?.has(id), `${id} is not in ${clip.batch}`);
    assert.ok(mathPromptUrl(id).endsWith(`g${clip.version}`));
  }
});
