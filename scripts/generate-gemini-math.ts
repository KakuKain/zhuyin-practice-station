/**
 * Math instructions voiced by Gemini (`gemini-3.8-flash-tts`, voice Fola, as the word clips),
 * replacing the macOS Meijia clip in public/math-audio/. The prompt names the reading of each
 * polyphone from `mathPromptReadings`, such as 數一數 and 曲線.
 *
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-math.ts --fixed
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-math.ts count route
 *   npx tsx scripts/generate-gemini-math.ts --from <folder> --fixed
 *
 * `--fixed` picks every instruction without a number in its id (數一數, 比一比, 答對了 and so
 * on); `--missing` leaves out of `--fixed` the ids already voiced (named ids always run), to
 * finish a run the free quota (10 a day) stopped. `--from` reads `<id>.wav` files saved from
 * Google AI Studio instead of calling the API; `--prompts` only prints the prompt to paste into
 * AI Studio for each id. Originals are kept in the git-ignored `outputs/gemini-math/`. Each clip
 * is recorded in features/math/math-audio-gemini.json, whose version goes into the clip URL so a
 * cached Meijia clip is never played instead.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isHan, mathPromptReadings, mathPrompts } from "../features/math/math-audio";

const model = "gemini-3.8-flash-tts";
const voice = "Fola";
const root = process.cwd();
const audioDir = join(root, "public/math-audio");
const originalsDir = join(root, "outputs/gemini-math");
const manifestPath = join(root, "features/math/math-audio-gemini.json");

const flags = new Set(["--prompts", "--fixed", "--missing"]);
const printOnly = process.argv.includes("--prompts");
const args = process.argv.slice(2).filter((arg) => !flags.has(arg));
const fromIndex = args.indexOf("--from");
const fromDir = fromIndex >= 0 ? args[fromIndex + 1] : null;
const named = fromIndex >= 0 ? args.filter((_, i) => i !== fromIndex && i !== fromIndex + 1) : args;
const voiced = Object.keys(JSON.parse(readFileSync(manifestPath, "utf8")));
const missing = process.argv.includes("--missing");
/** Named ids first: a redo asked for by name must not wait behind the quota. */
const ids = [
  ...new Set([
    ...named,
    ...(process.argv.includes("--fixed")
      ? Object.keys(mathPrompts).filter((id) => !/\d/.test(id) && !(missing && voiced.includes(id)))
      : []),
  ]),
];
if (!ids.length) throw new Error("Nothing to voice: name prompt ids, or pass --fixed");
for (const id of ids) if (!mathPrompts[id]) throw new Error(`Unknown math prompt: ${id}`);
const apiKey = process.env.GEMINI_API_KEY;
if (!printOnly && !fromDir && !apiKey)
  throw new Error("Set GEMINI_API_KEY, or pass --from <folder of WAVs>.");

/**
 * Characters whose reading in a prompt is easy to get wrong. The prompt names their reading
 * before the colon; spelling out every character made the voice read the readings aloud.
 */
const polyphones = new Set([..."數長薄曲蔔了哪和地"]);

/** 「數」念ㄕㄨˇ, 「數」念ㄕㄨˋ … for the polyphones in this prompt, in order. */
function readingHints(id: string) {
  const readings = mathPromptReadings[id].split(" ");
  const characters = [...mathPrompts[id]].filter(isHan);
  if (characters.length !== readings.length)
    throw new Error(`${id}: readings do not match the characters`);
  const hints = characters.flatMap((character, index) =>
    polyphones.has(character) ? [`「${character}」念${readings[index]}`] : [],
  );
  return [...new Set(hints)];
}

/** Where one character has two readings, the hint names the words. */
const hintOverrides: Record<string, string[]> = {
  count: ["「數一數」的數念ㄕㄨˇ", "「數字」的數念ㄕㄨˋ"],
};

/**
 * The model reads everything after `## Transcript:` and takes the notes above it as direction,
 * the layout AI Studio sends. A plain instruction before a colon was read aloud as well.
 */
function prompt(id: string) {
  const hints = hintOverrides[id] ?? readingHints(id);
  return [
    "## Director's notes:",
    "台灣華語。像溫柔的國小老師對一年級小朋友說話：咬字清楚、語氣親切，速度比平常說話稍慢，從第一個字到最後一個字維持一樣的速度，開頭不要拖長，標點的地方自然停頓，句尾念完整。",
    ...(hints.length ? [`讀音照課本：${hints.join("、")}。`] : []),
    "",
    "## Transcript:",
    mathPrompts[id],
  ].join("\n");
}

type Audio = { samples: Float32Array; rate: number };

async function generate(text: string): Promise<Audio> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey! },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${body?.error?.message}`);
  const part = body.candidates?.[0]?.content?.parts?.find(
    (item: { inlineData?: { mimeType: string; data: string } }) => item.inlineData,
  );
  if (!part) throw new Error("Gemini returned no audio");
  const bytes = Buffer.from(part.inlineData.data, "base64");
  // This model answers with a whole WAV file (header and an INFO chunk); older ones sent raw PCM.
  if (bytes.toString("ascii", 0, 4) === "RIFF") return parseWav(bytes, "Gemini audio");
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
  const samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(i * 2) / 32768;
  return { samples, rate };
}

function parseWav(bytes: Buffer, path: string): Audio {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE")
    throw new Error(`${path} is not a WAV file`);
  let channels = 1;
  let rate = 24000;
  let bits = 16;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "fmt ") {
      if (bytes.readUInt16LE(start) !== 1) throw new Error(`${path} is not PCM`);
      channels = bytes.readUInt16LE(start + 2);
      rate = bytes.readUInt32LE(start + 4);
      bits = bytes.readUInt16LE(start + 14);
    }
    if (id === "data") {
      if (bits !== 16) throw new Error(`${path} must be 16-bit PCM`);
      const frames = Math.floor(size / 2 / channels);
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += bytes.readInt16LE(start + (i * channels + c) * 2);
        samples[i] = sum / channels / 32768;
      }
      return { samples, rate };
    }
    offset = start + size + (size % 2);
  }
  throw new Error(`${path} has no audio data`);
}

function wav({ samples, rate }: Audio) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write("WAVEfmt ", 8, "ascii");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36, "ascii");
  bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, i) =>
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2),
  );
  return bytes;
}

/** Same rule as the Gemini words: 10 ms RMS windows over 0.008, 300 ms padding. */
function trim(audio: Audio) {
  const window = Math.round(audio.rate / 100);
  const active: number[] = [];
  for (let start = 0; start < audio.samples.length; start += window) {
    let sum = 0;
    const end = Math.min(audio.samples.length, start + window);
    for (let i = start; i < end; i++) sum += audio.samples[i] ** 2;
    if (Math.sqrt(sum / (end - start)) > 0.008) active.push(start);
  }
  if (!active.length) throw new Error("The clip is silent");
  const first = active[0];
  const last = Math.min(audio.samples.length, active[active.length - 1] + window);
  const pad = Math.round(audio.rate * 0.3);
  return {
    clip: {
      samples: audio.samples.slice(
        Math.max(0, first - pad),
        Math.min(audio.samples.length, last + pad),
      ),
      rate: audio.rate,
    },
    voiced: (last - first) / audio.rate,
  };
}

if (printOnly) {
  for (const id of ids) console.log(`${id}.wav\n${prompt(id)}\n`);
  process.exit(0);
}

type Entry = {
  version: number;
  text: string;
  prompt: string;
  duration: number;
  voicedDuration: number;
  createdAt: string;
  origin: string;
};
const round = (value: number) => Math.round(value * 100) / 100;
const manifest: Record<string, Entry> = JSON.parse(readFileSync(manifestPath, "utf8"));
mkdirSync(originalsDir, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "gemini-math-"));
try {
  for (const id of ids) {
    const text = prompt(id);
    // A calm sentence runs about 2.5–5 characters a second; far outside means a cut-off reading
    // or the voice reading the instructions too, so the API is asked again up to twice.
    const characters = [...mathPrompts[id]].filter(isHan).length;
    let take: ReturnType<typeof trim> | undefined;
    for (let attempt = 1; !take; attempt++) {
      const source = fromDir
        ? parseWav(readFileSync(join(fromDir, `${id}.wav`)), `${id}.wav`)
        : await generate(text);
      writeFileSync(join(originalsDir, `${id}.wav`), wav(source));
      const candidate = trim(source);
      if (candidate.voiced >= characters * 0.15 && candidate.voiced <= characters * 0.45 + 1.5)
        take = candidate;
      else if (fromDir || attempt === 3)
        throw new Error(
          `${id}: ${round(candidate.voiced)} s of speech for ${characters} characters`,
        );
      else console.log(`${id}: ${round(candidate.voiced)} s of speech, asking again`);
    }
    const { clip, voiced } = take;
    const trimmed = join(temporary, `${id}.wav`);
    writeFileSync(trimmed, wav(clip));
    const destination = join(audioDir, `${id}.m4a`);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", trimmed, destination]);
    manifest[id] = {
      version: (manifest[id]?.version ?? 0) + 1,
      text: mathPrompts[id],
      prompt: text,
      duration: round(clip.samples.length / clip.rate),
      voicedDuration: round(voiced),
      createdAt: new Date().toISOString().slice(0, 10),
      origin: fromDir ? "Google AI Studio export" : "Gemini API",
    };
    console.log(`${id} ${mathPrompts[id]}: ${round(voiced)} s voiced`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
}
console.log(`Voiced ${ids.length} math prompts with Gemini. Listen to each before committing.`);
