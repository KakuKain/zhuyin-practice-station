/**
 * Voices every English clip a built lesson plays with this Mac's voices, until Gemini's are made
 * (scripts/generate-gemini-english.ts): the Chinese instructions with Meijia, as the math ones,
 * letters and words with Samantha, and dialogues with Samantha and Reed answering her. Clips that
 * Gemini voiced (features/english/english-audio-gemini.json) are never touched; others are kept
 * unless --refresh is given. Each clip is recorded in features/english/english-audio-local.json.
 * The macOS voices are licensed for personal, non-commercial use.
 *
 *   npx tsx scripts/generate-english-audio.ts [--refresh]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { englishClips, englishPrompts } from "../features/english/english-audio";
import { englishDialogues, englishLessons } from "../features/english/english-lessons";
import geminiClips from "../features/english/english-audio-gemini.json";
import { type Audio, parseWav, writeM4a } from "./gemini-audio";

const output = join(process.cwd(), "public/english-audio");
const manifestPath = join(process.cwd(), "features/english/english-audio-local.json");
const refresh = process.argv.includes("--refresh");
const voices = { zh: "Meijia", en: "Samantha", answer: "Reed (英文（美國）)" };
/** Words per minute: calm, for children who are just starting. */
const rates = { zh: "150", en: "140" };

const needed = [
  ...Object.keys(englishPrompts).map((id) => `prompt-${id}`),
  ...englishLessons.flatMap((lesson) => lesson.letters.map((letter) => `letter-${letter}`)),
  ...englishLessons.flatMap((lesson) => lesson.words.map((word) => `word-${word}`)),
  ...englishLessons.flatMap((lesson) => lesson.dialogues.map((id) => `dialogue-${id}`)),
];

type Entry = { version: number; text: string; voice: string };
const manifest: Record<string, Entry> = JSON.parse(readFileSync(manifestPath, "utf8"));
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "english-audio-"));

/** One line spoken by one voice, as 24 kHz mono samples. */
function speak(text: string, voice: string, rate: string, name: string): Audio {
  const aiff = join(temporary, `${name}.aiff`);
  const pcm = join(temporary, `${name}.wav`);
  execFileSync("say", ["-v", voice, "-r", rate, "-o", aiff, text]);
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", aiff, pcm]);
  return parseWav(readFileSync(pcm), pcm);
}

/** Lines one after another with a short pause, as two people talking. */
function together(lines: Audio[]): Audio {
  const rate = lines[0].rate;
  const pause = Math.round(rate * 0.45);
  const length =
    lines.reduce((sum, line) => sum + line.samples.length, 0) + pause * (lines.length - 1);
  const samples = new Float32Array(length);
  let at = 0;
  for (const line of lines) {
    samples.set(line.samples, at);
    at += line.samples.length + pause;
  }
  return { samples, rate };
}

let created = 0;
try {
  for (const id of needed) {
    const destination = join(output, `${id}.m4a`);
    if (id in geminiClips || (existsSync(destination) && manifest[id] && !refresh)) continue;
    const kind = id.split("-")[0];
    let audio: Audio;
    let voice: string;
    if (kind === "prompt") {
      voice = voices.zh;
      audio = speak(englishClips[id].text, voice, rates.zh, id);
    } else if (kind === "dialogue") {
      const lines = englishDialogues[id.slice("dialogue-".length)].lines;
      voice = lines.length > 1 ? `${voices.en}, ${voices.answer}` : voices.en;
      audio = together(
        lines.map((line, index) =>
          speak(line, index ? voices.answer : voices.en, rates.en, `${id}-${index}`),
        ),
      );
    } else {
      voice = voices.en;
      // A letter alone with a full stop is read as its name: 「A.」 is "ay", not the word "a".
      audio = speak(
        kind === "letter" ? `${englishClips[id].text}.` : englishClips[id].text,
        voice,
        rates.en,
        id,
      );
    }
    writeM4a(audio, join(temporary, `${id}-out.wav`), destination);
    manifest[id] = {
      version: (manifest[id]?.version ?? 0) + 1,
      text: englishClips[id].text,
      voice,
    };
    created++;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
}
console.log(`Checked ${needed.length} English clips; generated ${created}.`);
