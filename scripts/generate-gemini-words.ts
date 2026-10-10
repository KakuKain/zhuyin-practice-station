/**
 * Word clips voiced by Gemini (`gemini-3.8-flash-tts`, voice Fola), replacing the older
 * macOS Meijia clip for the same word. Each word must have one reading in the course data.
 *
 *   GEMINI_API_KEY=… npx tsx scripts/generate-gemini-words.ts 奶奶 想要 魚乾
 *   npx tsx scripts/generate-gemini-words.ts --from <folder> 奶奶 想要 魚乾
 *
 * `--from` reads `<word>.wav` files saved from Google AI Studio instead of calling the API;
 * `--prompts` only prints the prompt to paste into AI Studio for each word.
 * Originals are kept in the git-ignored `outputs/gemini-words/`. Run
 * `npm run assets:audio-registry` afterwards.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builtinCatalog } from "../features/courses/materials";

const model = "gemini-3.8-flash-tts";
const voice = "Fola";
const root = process.cwd();
const audioDir = join(root, "public/listening-audio");
const wordsDir = join(audioDir, "gemini/words");
const originalsDir = join(root, "outputs/gemini-words");
const manifestPath = join(audioDir, "gemini/manifest.json");

const printOnly = process.argv.includes("--prompts");
const args = process.argv.slice(2).filter((arg) => arg !== "--prompts");
const fromIndex = args.indexOf("--from");
const fromDir = fromIndex >= 0 ? args[fromIndex + 1] : null;
const words = fromIndex >= 0 ? args.filter((_, i) => i !== fromIndex && i !== fromIndex + 1) : args;
if (!words.length) throw new Error("Name the words to voice, for example: 奶奶 想要 魚乾");
const apiKey = process.env.GEMINI_API_KEY;
if (!printOnly && !fromDir && !apiKey)
  throw new Error("Set GEMINI_API_KEY, or pass --from <folder of WAVs>.");

const readings = new Map<string, Set<string>>();
for (const lesson of builtinCatalog)
  for (const term of lesson.terms) {
    const values = readings.get(term.text) ?? new Set();
    values.add(term.syllables.join("|"));
    readings.set(term.text, values);
  }

const toneNames: Record<string, string> = { ˊ: "二聲", ˇ: "三聲", ˋ: "四聲", "˙": "輕聲" };
const ordinal = ["第一個字", "第二個字", "第三個字", "第四個字"];
function prompt(word: string, syllables: string[]) {
  const tones = syllables
    .map((syllable, index) => {
      const mark = syllable.match(/[ˊˇˋ˙]/)?.[0];
      return `${ordinal[index] ?? `第${index + 1}個字`}${mark ? toneNames[mark] : "一聲"}`;
    })
    .join("，");
  return `請用台灣華語，咬字清楚、速度放鬆、結尾完整地念出下面的語詞，只念一次，前後不要加任何話。讀音是 ${syllables.join(" ")}（${tones}）：${word}`;
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
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
  const bytes = Buffer.from(part.inlineData.data, "base64");
  const samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(i * 2) / 32768;
  return { samples, rate };
}

function readWav(path: string): Audio {
  const bytes = readFileSync(path);
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

/** Same rule as the Gemini rhymes: 10 ms RMS windows over 0.008, 300 ms padding. */
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
  for (const word of words) {
    const values = [...(readings.get(word) ?? [])];
    if (values.length !== 1) throw new Error(`${word} needs exactly one reading`);
    console.log(`${word}.wav\n${prompt(word, values[0].split("|"))}\n`);
  }
  process.exit(0);
}

const round = (value: number) => Math.round(value * 100) / 100;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.words ??= [];
mkdirSync(wordsDir, { recursive: true });
mkdirSync(originalsDir, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "gemini-words-"));
try {
  for (const word of words) {
    const values = [...(readings.get(word) ?? [])];
    if (values.length !== 1)
      throw new Error(
        `${word} needs exactly one reading in the course data, found ${values.length}`,
      );
    const syllables = values[0].split("|");
    const text = prompt(word, syllables);
    const source = fromDir ? readWav(join(fromDir, `${word}.wav`)) : await generate(text);
    writeFileSync(join(originalsDir, `${word}.wav`), wav(source));
    const { clip, voiced } = trim(source);
    // A word is one or two syllables; much longer means the voice read the instructions too.
    if (voiced < 0.3 || voiced > 0.9 * syllables.length + 0.6)
      throw new Error(`${word}: ${round(voiced)} s of speech, expected a single reading`);
    const name = [...word].map((c) => c.codePointAt(0)!.toString(16)).join("-");
    const trimmed = join(temporary, `${name}.wav`);
    writeFileSync(trimmed, wav(clip));
    const destination = join(wordsDir, `${name}.m4a`);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", trimmed, destination]);
    const legacy = join(audioDir, `${name}.m4a`);
    if (existsSync(legacy)) rmSync(legacy);
    manifest.words = manifest.words.filter((item: { text: string }) => item.text !== word);
    manifest.words.push({
      text: word,
      reading: values[0],
      prompt: text,
      path: `/listening-audio/gemini/words/${name}.m4a`,
      duration: round(clip.samples.length / clip.rate),
      voicedDuration: round(voiced),
      createdAt: new Date().toISOString().slice(0, 10),
      origin: fromDir ? "Google AI Studio export" : "Gemini API",
    });
    console.log(`${word} ${values[0]}: ${round(voiced)} s voiced`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("Now run: npm run assets:audio-registry");
