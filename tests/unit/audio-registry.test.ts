import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  clipEnd,
  registeredAudioUrl,
  registeredLessonAudioUrl,
} from "../../lib/audio/audio-registry";
import { builtinCatalog } from "../../features/courses/materials";
import { buildListeningSession } from "../../features/listening/listening-data";

test("audio metadata points to shipped bytes and hash versions match", () => {
  const registry = JSON.parse(readFileSync("public/listening-audio/registry.json", "utf8"));
  for (const clip of registry.clips) {
    const bytes = readFileSync(`public${clip.url}`);
    assert.equal(bytes.length, clip.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
    assert.ok(clip.duration > 0);
    assert.equal(clip.version, clip.sha256.slice(0, 12));
    const lesson = /gemini\/lessons\/(\d+)\.m4a$/.exec(clip.url);
    if (lesson)
      assert.equal(
        // Registry paths are rooted at public/; the app requests them page-relative.
        registeredLessonAudioUrl(Number(lesson[1]) - 1),
        `${clip.url.slice(1)}?v=${clip.version}`,
      );
  }
});
test("all fresh listening questions resolve their exact reading", () => {
  for (const lesson of builtinCatalog)
    for (const q of buildListeningSession(lesson.index))
      assert.ok(registeredAudioUrl(q.audioText, q.answer), `${q.audioText} (${q.answer})`);
});
test("a known alternate tone never selects a shared file", () => {
  assert.ok(registeredAudioUrl("翹", "ㄑㄧㄠˋ"));
  assert.equal(registeredAudioUrl("翹", "ㄑㄧㄠ"), null);
  assert.equal(registeredAudioUrl("教", "ㄐㄧㄠˋ"), null);
});

test("every playback identity resolves to a shipped file in its folder", () => {
  const index = JSON.parse(readFileSync("lib/audio/audio-index.json", "utf8"));
  for (const [text, [, , folder]] of Object.entries(index) as [
    string,
    [string[], string, string],
  ][]) {
    assert.ok(["", "gemini/rhymes/", "gemini/words/"].includes(folder), text);
    const url = registeredAudioUrl(text)!;
    assert.ok(url.startsWith(`listening-audio/${folder}`), text);
    readFileSync(`public/${url.split("?")[0]}`);
  }
});

test("ㄧㄤ plays the dictionary's 「央」 unchanged, stopping after the character", () => {
  // The parent heard the Gemini clip as ㄧㄤˊ. The dictionary's recording is CC BY-ND, so its file
  // is never cut: playback stops at 0.7 s, in the silence before it reads the radical (1.2 s).
  const url = registeredAudioUrl("ㄧㄤ")!;
  assert.equal(url, "listening-audio/moe-examples/6160.mp3#t=0,0.7");
  assert.equal(registeredAudioUrl("ㄧㄤ", "ㄧㄤ"), url);
  assert.equal(clipEnd(url), 0.7);
  assert.equal(clipEnd(registeredAudioUrl("ㄧㄢ")!), null);
});
