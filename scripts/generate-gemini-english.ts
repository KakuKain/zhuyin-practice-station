/**
 * The English lessons' clips, voiced by Gemini (`gemini-3.8-flash-tts`, as the other clips) into
 * public/english-audio/: the Chinese instructions in voice Fola like the math ones, the letters'
 * names and the words in English, and each dialogue with two voices. Only what a built lesson
 * uses is voiced: its letters, words and dialogues, and every instruction.
 *
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-english.ts                 # until the quota ends
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-english.ts --requests 2
 *   npx tsx scripts/generate-gemini-english.ts --plan                           # no requests
 *   npx tsx scripts/generate-gemini-english.ts --prompts                        # what would be sent
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-english.ts --redo word-cat # voice one again
 *
 * Instructions, letters and words go several to a request, read with a long pause between
 * items and cut at those pauses (`split`), since the free quota allows few requests a day; a
 * dialogue is one request. A batch is kept only when every item has one piece of a plausible
 * length. Each clip is recorded in features/english/english-audio-gemini.json, whose version
 * goes into the clip URL; the raw audio stays in the git-ignored outputs/gemini-english/.
 * Listen before committing.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  englishClips,
  englishPromptReadings,
  englishPrompts,
} from "../features/english/english-audio";
import { englishDialogues, englishLessons } from "../features/english/english-lessons";
import {
  type Audio,
  generate,
  model,
  QuotaError,
  split,
  voice,
  wav,
  writeM4a,
} from "./gemini-audio";

const root = process.cwd();
const audioDir = join(root, "public/english-audio");
const rawDir = join(root, "outputs/gemini-english");
const manifestPath = join(root, "features/english/english-audio-gemini.json");
/** The second voice of a dialogue answers the first. */
const dialogueVoices = [voice, "Leda"];

const option = (name: string) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
};
const requests = Number(option("--requests") ?? Infinity);
const redo = option("--redo");

type Kind = "prompt" | "letter" | "word" | "dialogue";
const kindOf = (id: string) => id.split("-")[0] as Kind;

type Entry = {
  version: number;
  text: string;
  prompt: string;
  duration: number;
  voicedDuration: number;
  createdAt: string;
  origin: string;
};
const manifest: Record<string, Entry> = JSON.parse(readFileSync(manifestPath, "utf8"));

/** Every clip a built lesson plays. */
const needed = [
  ...Object.keys(englishPrompts).map((id) => `prompt-${id}`),
  ...englishLessons.flatMap((lesson) => lesson.letters.map((letter) => `letter-${letter}`)),
  ...englishLessons.flatMap((lesson) => lesson.words.map((word) => `word-${word}`)),
  ...englishLessons.flatMap((lesson) => lesson.dialogues.map((id) => `dialogue-${id}`)),
];
for (const id of needed) if (!englishClips[id]) throw new Error(`No clip text for ${id}`);
const waiting = redo ? [redo] : needed.filter((id) => !manifest[id]);
if (redo && !englishClips[redo]) throw new Error(`Unknown clip: ${redo}`);

/** Items per request: short items read well in longer lists. */
const batchSize: Record<Kind, number> = { prompt: 5, letter: 7, word: 7, dialogue: 1 };
const queue: string[][] = [];
for (const kind of ["prompt", "letter", "word", "dialogue"] as const) {
  const items = waiting.filter((id) => kindOf(id) === kind);
  for (let at = 0; at < items.length; at += batchSize[kind])
    queue.push(items.slice(at, at + batchSize[kind]));
}

if (process.argv.includes("--plan")) {
  for (const kind of ["prompt", "letter", "word", "dialogue"] as const)
    console.log(`${kind}: ${waiting.filter((id) => kindOf(id) === kind).length} clips`);
  console.log(`${queue.length} requests in all`);
  process.exit(0);
}

/** Letter names spelled the way they sound, so 「A」 is never read as the word 「a」. */
const letterSounds: Record<string, string> = {
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "jee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "el",
  m: "em",
};

/** Characters whose reading in an instruction is easy to get wrong. */
const polyphones = new Set([..."個了來都把看"]);

function prompt(batch: string[]) {
  const kind = kindOf(batch[0]);
  if (kind === "dialogue") {
    const lines = englishDialogues[batch[0].slice("dialogue-".length)].lines;
    return [
      "## Director's notes:",
      "American English. Two friendly people at a primary school, speaking to six-year-olds who are just starting English: clear, warm and a little slower than usual, with a short natural pause between the two lines.",
      "",
      "## Transcript:",
      ...lines.map((line, index) => `Speaker ${index + 1}: ${line}`),
    ].join("\n");
  }
  if (kind === "prompt") {
    const hints = batch.flatMap((id) => {
      const key = id.slice("prompt-".length);
      const readings = englishPromptReadings[key].split(" ");
      return [...englishPrompts[key]]
        .filter((character) => /\p{Script=Han}/u.test(character))
        .flatMap((character, index) =>
          polyphones.has(character) ? [`「${character}」念${readings[index]}`] : [],
        );
    });
    return [
      "## Director's notes:",
      "台灣華語。像溫柔的國小老師對一年級小朋友說話：咬字清楚、語氣親切，速度比平常說話稍慢，標點的地方自然停頓，句尾念完整。每一行是一句獨立的話，念完一行停很久再念下一行。",
      ...(hints.length ? [`讀音照課本：${[...new Set(hints)].join("、")}。`] : []),
      "",
      "## Transcript:",
      batch.map((id) => englishClips[id].text).join("\n[long pause]\n"),
    ].join("\n");
  }
  return [
    "## Director's notes:",
    kind === "letter"
      ? `American English. A kind teacher saying the names of letters of the alphabet to six-year-olds, clearly and calmly, each on its own like a flash card, with a long pause between them. Say each letter's name only: ${batch.map((id) => `${englishClips[id].text} as "${letterSounds[id.slice(-1)]}"`).join(", ")}.`
      : "American English. A kind teacher saying single words to six-year-olds who are just starting English, clearly and calmly, each on its own like a flash card, with a long pause between them. Say each word once and nothing else.",
    "",
    "## Transcript:",
    batch.map((id) => `${englishClips[id].text}.`).join("\n[long pause]\n"),
  ].join("\n");
}

if (process.argv.includes("--prompts")) {
  for (const batch of queue.slice(0, requests)) console.log(`${prompt(batch)}\n`);
  process.exit(0);
}

/** Seconds of speech that sound right for an item; far outside means a cut-off or extra words. */
function plausible(id: string, voiced: number) {
  const kind = kindOf(id);
  if (kind === "prompt") {
    const characters = [...englishClips[id].text].filter((c) => /\p{Script=Han}/u.test(c)).length;
    return voiced >= characters * 0.15 && voiced <= characters * 0.45 + 1.5;
  }
  if (kind === "letter") return voiced >= 0.2 && voiced <= 1.6;
  if (kind === "word") return voiced >= 0.25 && voiced <= 2;
  return voiced >= 0.5 && voiced <= 6;
}

const round = (value: number) => Math.round(value * 100) / 100;
const today = new Date().toISOString().slice(0, 10);
mkdirSync(audioDir, { recursive: true });
mkdirSync(rawDir, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "gemini-english-"));

function keep(batch: string[], audio: Audio, text: string) {
  // A dialogue is one clip with its own pause inside, so it is trimmed rather than split.
  const pieces = split(audio, kindOf(batch[0]) === "dialogue" ? 1 : batch.length);
  if (typeof pieces === "string") {
    console.log(`Rejected ${batch.join(" ")}: ${pieces}`);
    return false;
  }
  const odd = batch.filter((id, index) => !plausible(id, pieces[index].voiced));
  if (odd.length) {
    console.log(`Rejected ${batch.join(" ")}: ${odd.join(" ")} has an unlikely length`);
    return false;
  }
  batch.forEach((id, index) => {
    const { clip, voiced } = pieces[index];
    writeM4a(clip, join(temporary, `${id}.wav`), join(audioDir, `${id}.m4a`));
    manifest[id] = {
      version: (manifest[id]?.version ?? 0) + 1,
      text: englishClips[id].text,
      prompt: text,
      duration: round(clip.samples.length / clip.rate),
      voicedDuration: round(voiced),
      createdAt: today,
      origin: `Gemini API (${model})`,
    };
  });
  // Saved after every batch, so a stop mid-run keeps what was made.
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Kept ${batch.join(" ")}`);
  return true;
}

let made = 0;
let kept = 0;
let rejected = 0;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY, or pass --plan or --prompts.");
  for (const batch of queue.slice(0, requests)) {
    const text = prompt(batch);
    const lines = kindOf(batch[0]) === "dialogue" ? englishDialogues[batch[0].slice(9)].lines : [];
    const speakers =
      lines.length > 1
        ? lines.map((_, index) => ({
            speaker: `Speaker ${index + 1}`,
            voice: dialogueVoices[index],
          }))
        : undefined;
    let audio: Audio | undefined;
    // A 429 may be the per-minute limit: wait a minute, twice, before calling it a day.
    for (let attempt = 1; !audio; attempt++) {
      try {
        audio = await generate(text, apiKey, speakers);
      } catch (error) {
        if (!(error instanceof QuotaError)) throw error;
        if (attempt === 3) break;
        console.log(`Quota reached (${error.message}); waiting a minute.`);
        await new Promise((resolve) => setTimeout(resolve, 65_000));
      }
    }
    if (!audio) {
      console.log("The free quota is used up for today. Run again tomorrow.");
      break;
    }
    made++;
    const id = `${today}-${batch[0]}`;
    if (!existsSync(join(rawDir, `${id}.wav`)))
      writeFileSync(join(rawDir, `${id}.wav`), wav(audio));
    writeFileSync(join(rawDir, `${id}.txt`), text + "\n");
    if (keep(batch, audio, text)) {
      kept++;
      rejected = 0;
    } else if (++rejected === 2) break;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(`${made} requests made, ${kept} batches kept, ${queue.length - kept} to go.`);
