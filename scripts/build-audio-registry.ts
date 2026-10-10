import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { builtinCatalog } from "../features/courses/materials";
import { combinedRhymeExamples } from "../features/symbols/combined-rhyme-audio";
import {
  extraWordQuestions,
  legacyCircledVocabulary,
  legacyReviewVocabulary,
} from "../features/courses/legacy-content";
const root = process.cwd();
const audioDir = join(root, "public/listening-audio");
const gemini = JSON.parse(readFileSync(join(audioDir, "gemini/manifest.json"), "utf8"));
const readings = new Map<string, Set<string>>();
const add = (text: string, pronunciation: string) => {
  const values = readings.get(text) ?? new Set();
  values.add(pronunciation);
  readings.set(text, values);
};
for (const lesson of builtinCatalog) {
  lesson.symbols.forEach((s) => add(s, s));
  lesson.terms.forEach((t) => add(t.text, t.syllables.join("|")));
  lesson.exercise.lines.flat().forEach((c) => add(c.character, c.zhuyin));
  lesson.exercise.questions.forEach((q) => add(q.audioText, q.answer));
}
[...legacyCircledVocabulary, ...legacyReviewVocabulary]
  .flat()
  .forEach((t) => add(t.text, t.syllables.join("|")));
Object.values(extraWordQuestions)
  .flat()
  .forEach((q) => add(q.audioText, q.answer));
combinedRhymeExamples.forEach((x) => add(x.rhyme, x.rhyme));
function duration(bytes: Buffer): number {
  const visit = (start: number, end: number): number => {
    for (let offset = start; offset + 8 <= end;) {
      const size = bytes.readUInt32BE(offset),
        type = bytes.toString("ascii", offset + 4, offset + 8);
      if (size < 8 || offset + size > end) break;
      if (type === "mdhd") {
        const v = bytes[offset + 8],
          base = offset + (v === 1 ? 28 : 20);
        const scale = bytes.readUInt32BE(base);
        const ticks =
          v === 1 ? Number(bytes.readBigUInt64BE(base + 4)) : bytes.readUInt32BE(base + 4);
        return Math.round((ticks / scale) * 1000) / 1000;
      }
      if (["moov", "trak", "mdia"].includes(type)) {
        const value = visit(offset + 8, offset + size);
        if (value) return value;
      }
      offset += size;
    }
    return 0;
  };
  return visit(0, bytes.length);
}
const standalone: Record<string, string> = {
  一: "ㄧ",
  寶: "ㄅㄠˇ",
  弟: "ㄉㄧˋ",
  得: "ㄉㄜˊ",
  翹: "ㄑㄧㄠˋ",
  謝: "ㄒㄧㄝˋ",
};
const clips: Record<string, unknown>[] = [];
const index: Record<string, [string[], string, boolean]> = {};
const lessonIndex: Record<string, string> = {};
function scan(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      scan(path);
      continue;
    }
    if (!entry.endsWith(".m4a")) continue;
    const url = "/" + relative(join(root, "public"), path);
    const lesson = /gemini\/lessons\/(\d+)\.m4a$/.exec(url);
    const isRhyme = url.includes("/gemini/rhymes/");
    const text = lesson
      ? builtinCatalog.find((l) => l.index === Number(lesson[1]) - 1)!.title
      : entry
          .slice(0, -4)
          .split("-")
          .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
          .join("");
    const bytes = readFileSync(path),
      hash = createHash("sha256").update(bytes).digest("hex");
    const seconds = duration(bytes);
    if (!seconds || !Number.isFinite(seconds)) throw new Error(`Missing duration: ${url}`);
    if (lesson) lessonIndex[Number(lesson[1]) - 1] = hash.slice(0, 12);
    const observedReadings = [...(readings.get(text) ?? [])];
    const pronunciation = standalone[text] ? [standalone[text]] : observedReadings;
    const source =
      lesson || isRhyme
        ? "Gemini Fola"
        : /^[\u3105-\u3129]$/.test(text)
          ? "MOE CC BY 4.0"
          : "macOS Meijia (legacy synthesis)";
    clips.push({
      text,
      pronunciation,
      observedReadings,
      url,
      source,
      duration: seconds,
      bytes: bytes.length,
      sha256: hash,
      version: hash.slice(0, 12),
      review: source.startsWith("MOE")
        ? "official source"
        : lesson || isRhyme
          ? "timing checked; human pronunciation review recommended"
          : "legacy; pronunciation not certified",
      ...(isRhyme
        ? {
            voicedDuration: gemini.rhymes.find((r: { text: string }) => r.text === text)
              ?.voicedDuration,
          }
        : {}),
    });
    if (!lesson && (isRhyme || !combinedRhymeExamples.some((r) => r.rhyme === text)))
      index[text] = [pronunciation, hash.slice(0, 12), isRhyme];
  }
}
scan(audioDir);
writeFileSync(
  join(audioDir, "registry.json"),
  JSON.stringify({ schemaVersion: 1, clips }, null, 2) + "\n",
);
writeFileSync(join(root, "lib/audio/audio-index.json"), JSON.stringify(index) + "\n");
writeFileSync(join(root, "lib/audio/lesson-audio-index.json"), JSON.stringify(lessonIndex) + "\n");
console.log(`Registered ${clips.length} clips, ${Object.keys(index).length} playback identities.`);
