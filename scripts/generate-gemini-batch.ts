/**
 * Replaces the macOS Meijia clips with Gemini (`gemini-3.8-flash-tts`, voice Fola, as the other
 * Gemini clips), many clips per request: the free quota allows far fewer requests a day than
 * there are clips. Each request reads one batch with a long pause between items;
 * the batch is cut at its longest pauses and kept only when every item gets one piece of a
 * plausible length.
 *
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-batch.ts                 # until the quota ends
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-batch.ts --only words --requests 1
 *   npx tsx scripts/generate-gemini-batch.ts --plan                           # no requests
 *   npx tsx scripts/generate-gemini-batch.ts --prompts --requests 2           # what would be sent
 *   npx tsx scripts/generate-gemini-batch.ts --reuse 2026-10-20-01-words      # cut a saved batch again
 *
 * The queue starts with what children hear most: the math instructions without a number, then
 * each lesson's 生字 and circled words in lesson order, then the numbered math questions, then
 * the other characters of the lesson texts. Clips that only old records use stay Meijia. A
 * rerun continues where the quota stopped; a per-minute limit is waited out. A rejected batch
 * waits for the next run, and two in a row stop this one, so a bad prompt does not use up the
 * day. Each kept batch's prompt goes to assets/gemini-batches.json; the raw audio stays in the git-ignored outputs/gemini-batch/. Run `npm run assets:audio-registry`
 * afterwards, and listen before committing.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builtinCatalog } from "../features/courses/materials";
import { isHan, mathPromptReadings, mathPrompts } from "../features/math/math-audio";
import {
  type Audio,
  generate,
  model,
  parseWav,
  QuotaError,
  split,
  voice,
  wav,
  writeM4a,
} from "./gemini-audio";

const root = process.cwd();
const listeningDir = join(root, "public/listening-audio");
const wordsDir = join(listeningDir, "gemini/words");
const wordsManifestPath = join(listeningDir, "gemini/manifest.json");
const mathDir = join(root, "public/math-audio");
const mathManifestPath = join(root, "features/math/math-audio-gemini.json");
const batchesPath = join(root, "assets/gemini-batches.json");
const rawDir = join(root, "outputs/gemini-batch");

const option = (name: string) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
};
const planOnly = process.argv.includes("--plan");
const only = option("--only");
const requests = Number(option("--requests") ?? Infinity);
if (only && only !== "math" && only !== "words") throw new Error("--only takes math or words");

type Item = { kind: "math" | "words"; key: string; text: string; readings: string[] };

const fontReadings: Record<string, string> = JSON.parse(
  readFileSync(join(root, "assets/font-sources/KidLessonYoSans-readings.json"), "utf8"),
);
const audioIndex: Record<string, [string[], string, string]> = JSON.parse(
  readFileSync(join(root, "lib/audio/audio-index.json"), "utf8"),
);
const mathManifest: Record<string, Record<string, unknown> & { version: number }> = JSON.parse(
  readFileSync(mathManifestPath, "utf8"),
);
const wordsManifest = JSON.parse(readFileSync(wordsManifestPath, "utf8"));
wordsManifest.words ??= [];
const batchLog: { batches: Record<string, unknown>[] } = existsSync(batchesPath)
  ? JSON.parse(readFileSync(batchesPath, "utf8"))
  : { batches: [] };

const fileName = (text: string) => [...text].map((c) => c.codePointAt(0)!.toString(16)).join("-");

/** A word or character still played from a Meijia clip, with the one reading it is played for. */
function wordItem(text: string): Item | undefined {
  const entry = audioIndex[text];
  if (!entry || entry[2] !== "" || /^[ㄅ-ㄩ]/.test(text)) return undefined;
  if (!existsSync(join(listeningDir, `${fileName(text)}.m4a`))) return undefined;
  if (entry[0].length !== 1) {
    console.log(`Skipping ${text}: ${entry[0].length} readings, one clip cannot serve them`);
    return undefined;
  }
  return { kind: "words", key: text, text, readings: entry[0][0].split("|") };
}

const mathItem = (id: string): Item => ({
  kind: "math",
  key: id,
  text: mathPrompts[id],
  readings: mathPromptReadings[id].split(" "),
});

const mathIds = Object.keys(mathPrompts).filter((id) => !mathManifest[id]);
const heard = builtinCatalog.flatMap((lesson) => [
  ...(lesson.characters ?? []).map((term) => term.text),
  ...lesson.terms.map((term) => term.text),
]);
const lessonText = builtinCatalog.flatMap((lesson) => [
  ...lesson.exercise.lines.flat().map((cell) => cell.character),
  ...lesson.exercise.questions.map((question) => question.audioText),
]);
const words = (texts: string[]) =>
  [...new Set(texts)].map(wordItem).filter((item): item is Item => Boolean(item));
const groups: [string, Item[]][] = [
  ["math instructions", mathIds.filter((id) => !/\d/.test(id)).map(mathItem)],
  ["生字 and circled words", words(heard)],
  ["numbered math questions", mathIds.filter((id) => /\d/.test(id)).map(mathItem)],
  ["other lesson characters", words(lessonText.filter((text) => !heard.includes(text)))],
];

/** Batches stay short enough that the voice keeps its pace and the pauses stay clear. */
function batches(items: Item[]) {
  const result: Item[][] = [];
  let current: Item[] = [];
  let size = 0;
  for (const item of items) {
    const [maxItems, maxSize] = item.kind === "math" ? [10, 110] : [24, 48];
    if (current.length && (current.length >= maxItems || size + item.readings.length > maxSize)) {
      result.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.readings.length;
  }
  if (current.length) result.push(current);
  return result;
}

const queue = groups.flatMap(([, items]) =>
  batches(items.filter((item) => !only || item.kind === only)),
);

if (planOnly) {
  for (const [name, items] of groups)
    console.log(`${name}: ${items.length} clips in ${batches(items).length} requests`);
  console.log(`${queue.length} requests in all${only ? ` for ${only}` : ""}`);
  process.exit(0);
}

/** Characters the voice may misread in math; the rest follow the font's reading. */
const mathPolyphones = new Set([..."數長薄曲蔔了哪和地"]);

/**
 * 「長」念ㄔㄤˊ for each character read other than the usual way. Where one character has two
 * readings in the batch, each hint names the words around it, as in 「數一數」 and 「出數字」.
 */
function readingHints(batch: Item[]) {
  if (batch[0].kind === "words")
    return batch.flatMap((item) => {
      const chars = [...item.text];
      const unusual = chars.some((c, i) => fontReadings[c] && fontReadings[c] !== item.readings[i]);
      return unusual && chars.length === item.readings.length
        ? [`「${item.text}」念${item.readings.join(" ")}`]
        : [];
    });
  const found: { char: string; reading: string; context: string }[] = [];
  for (const item of batch) {
    const chars = [...item.text];
    let han = 0;
    chars.forEach((char, at) => {
      if (!isHan(char)) return;
      const reading = item.readings[han++];
      if (!mathPolyphones.has(char) && fontReadings[char] === reading) return;
      const phraseStart = chars.findLastIndex((c, i) => i < at && !isHan(c)) + 1;
      const phraseEnd = chars.findIndex((c, i) => i > at && !isHan(c));
      const phrase = chars.slice(phraseStart, phraseEnd < 0 ? chars.length : phraseEnd);
      const i = at - phraseStart;
      const context = phrase.length <= 4 ? phrase : phrase.slice(Math.max(0, i - 1), i + 2);
      found.push({ char, reading, context: context.join("") });
    });
  }
  const hints = found.map(({ char, reading, context }) =>
    found.every((other) => other.char !== char || other.reading === reading) || context === char
      ? `「${char}」念${reading}`
      : `「${context}」的「${char}」念${reading}`,
  );
  return [...new Set(hints)];
}

function prompt(batch: Item[]) {
  const hints = readingHints(batch);
  const math = batch[0].kind === "math";
  return [
    "## Director's notes:",
    math
      ? "台灣華語。像溫柔的國小老師對一年級小朋友說話：咬字清楚、語氣親切，速度比平常說話稍慢，開頭不要拖長，標點的地方自然停頓，句尾念完整。"
      : "台灣華語。像溫柔的國小老師拿語詞卡念給一年級小朋友聽：咬字清楚、語氣親切、速度放慢，句尾念完整。",
    math
      ? "逐字稿的每一行是一句獨立的話。每一句都像單獨說出來一樣，用完整、自然的語調，不要念成清單的語調。每一句念完，停頓兩秒再念下一句。"
      : "逐字稿的每一行是一張語詞卡。每一張都像單獨念出來一樣，用完整、自然的語調，不要念成清單的語調。每一張念完，停頓兩秒再念下一張。",
    ...(hints.length ? [`讀音照課本：${hints.join("、")}。`] : []),
    "",
    "## Transcript:",
    batch.map((item) => (math ? item.text : `${item.text}。`)).join("\n[long pause]\n"),
  ].join("\n");
}

/** A calm reading runs about 2.5–5 syllables a second; far outside means a wrong piece. */
function checkLength(item: Item, voiced: number) {
  const n = item.readings.length;
  const [low, high] = item.kind === "math" ? [n * 0.15, n * 0.45 + 1.5] : [0.18, n * 0.9 + 0.6];
  return voiced >= low && voiced <= high
    ? undefined
    : `${item.text}: ${voiced.toFixed(2)} s of speech for ${n} syllables`;
}

if (process.argv.includes("--prompts")) {
  for (const batch of queue.slice(0, requests)) console.log(`${prompt(batch)}\n`);
  process.exit(0);
}

const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
const round = (value: number) => Math.round(value * 100) / 100;
mkdirSync(rawDir, { recursive: true });
mkdirSync(wordsDir, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "gemini-batch-"));

/** Cuts one batch, writes its clips and records, or says why it was rejected. */
function keep(batch: Item[], audio: Audio, id: string, text: string) {
  const pieces = split(audio, batch.length);
  const problems =
    typeof pieces === "string"
      ? [pieces]
      : pieces.flatMap((piece, i) => checkLength(batch[i], piece.voiced) ?? []);
  if (typeof pieces === "string" || problems.length) {
    console.log(`Rejected ${id} (outputs/gemini-batch/${id}.wav):\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
    return false;
  }
  const createdAt = id.slice(0, 10);
  batch.forEach((item, i) => {
    const { clip, voiced } = pieces[i];
    const fields = {
      batch: id,
      duration: round(clip.samples.length / clip.rate),
      voicedDuration: round(voiced),
      createdAt,
      origin: "Gemini API",
    };
    if (item.kind === "math") {
      writeM4a(clip, join(temporary, `${item.key}.wav`), join(mathDir, `${item.key}.m4a`));
      mathManifest[item.key] = {
        version: (mathManifest[item.key]?.version ?? 0) + 1,
        text: item.text,
        ...fields,
      };
    } else {
      const name = fileName(item.text);
      writeM4a(clip, join(temporary, `${name}.wav`), join(wordsDir, `${name}.m4a`));
      rmSync(join(listeningDir, `${name}.m4a`), { force: true });
      wordsManifest.words = wordsManifest.words.filter(
        (word: { text: string }) => word.text !== item.text,
      );
      wordsManifest.words.push({
        text: item.text,
        reading: item.readings.join("|"),
        path: `/listening-audio/gemini/words/${name}.m4a`,
        ...fields,
      });
    }
  });
  batchLog.batches = batchLog.batches.filter((logged) => logged.id !== id);
  batchLog.batches.push({
    id,
    createdAt,
    model,
    voice,
    prompt: text,
    items: batch.map((item) => item.key),
  });
  // Saved after every batch, so a stop mid-run keeps what was made.
  const sorted = Object.fromEntries(
    Object.entries(mathManifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(mathManifestPath, JSON.stringify(sorted, null, 2) + "\n");
  writeFileSync(wordsManifestPath, JSON.stringify(wordsManifest, null, 2) + "\n");
  writeFileSync(batchesPath, JSON.stringify(batchLog, null, 2) + "\n");
  console.log(`Kept ${id}: ${batch.map((item) => item.text).join(" ")}`);
  return true;
}

/** 2026-10-20-03-words: the third request that day, numbered past any earlier raw batch. */
function nextId(kind: string) {
  for (let n = 1; ; n++) {
    const id = `${today}-${String(n).padStart(2, "0")}-${kind}`;
    if (!existsSync(join(rawDir, `${id}.wav`))) return id;
  }
}

const reuse = option("--reuse");
let made = 0;
let kept = 0;
let rejected = 0;
try {
  if (reuse) {
    // A batch rejected by a rule since loosened is cut again without asking Gemini again.
    const text = readFileSync(join(rawDir, `${reuse}.txt`), "utf8").trimEnd();
    const lines = text.split("## Transcript:\n")[1].split("\n[long pause]\n");
    const batch = lines.map((line) => {
      const id = Object.keys(mathPrompts).find((key) => mathPrompts[key] === line);
      const item = id ? mathItem(id) : wordItem(line.replace(/。$/, ""));
      if (!item) throw new Error(`${line} is no longer waiting for a Gemini clip`);
      return item;
    });
    const audio = parseWav(readFileSync(join(rawDir, `${reuse}.wav`)), reuse);
    if (keep(batch, audio, reuse, text)) kept++;
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Set GEMINI_API_KEY, or pass --plan, --prompts or --reuse.");
    for (const batch of queue.slice(0, requests)) {
      const text = prompt(batch);
      const id = nextId(batch[0].kind);
      let audio;
      // A 429 may be the per-minute limit: wait a minute, twice, before calling it a day.
      for (let attempt = 1; !audio; attempt++) {
        try {
          audio = await generate(text, apiKey);
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
      writeFileSync(join(rawDir, `${id}.wav`), wav(audio));
      writeFileSync(join(rawDir, `${id}.txt`), text + "\n");
      // The voice now and then adds a word between items; one such batch is only retried later.
      if (keep(batch, audio, id, text)) {
        kept++;
        rejected = 0;
      } else if (++rejected === 2) break;
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(
  `${made} requests made, ${kept} batches kept, ${queue.length - kept} to go. Now run: npm run assets:audio-registry`,
);
