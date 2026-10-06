import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { dictationAudioUrl } from "../../features/listening/listening-data";

const manifest = JSON.parse(readFileSync("public/listening-audio/gemini/manifest.json", "utf8"));

test("all nine lesson readings and 22 complete rhyme clips are shipped", () => {
  assert.equal(manifest.lessons.length, 9);
  assert.equal(manifest.rhymes.length, 22);
  assert.equal(new Set(manifest.rhymes.map((clip: { text: string }) => clip.text)).size, 22);
  for (const clip of [...manifest.lessons, ...manifest.rhymes]) {
    assert.ok(statSync(`public${clip.path}`).size > 4000);
    assert.ok(clip.duration > 1.3);
  }
});

test("every combined rhyme uses its new Gemini clip, without dictionary narration", () => {
  for (const clip of manifest.rhymes) {
    assert.equal(dictationAudioUrl(clip.text), clip.path);
    assert.ok(clip.voicedDuration >= 0.7);
    assert.ok(clip.duration - clip.voicedDuration >= 0.5);
  }
  assert.equal(
    manifest.rhymes.find((clip: { text: string }) => clip.text === "ㄧㄞ").tone,
    "第二聲",
  );
});
