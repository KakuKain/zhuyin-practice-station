/**
 * Shared pieces of the Gemini voice scripts: one request, WAV in and out, and the silence rule
 * (10 ms RMS windows over 0.008, 300 ms padding) every Gemini clip is trimmed with.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

export const model = "gemini-3.8-flash-tts";
export const voice = "Fola";

export type Audio = { samples: Float32Array; rate: number };

/** The free quota ran out (HTTP 429); a rerun tomorrow continues. */
export class QuotaError extends Error {}

export async function generate(text: string, apiKey: string): Promise<Audio> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
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
  if (response.status === 429) throw new QuotaError(`Gemini 429: ${body?.error?.message}`);
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

export function parseWav(bytes: Buffer, path: string): Audio {
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

export function wav({ samples, rate }: Audio) {
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

/** Writes `audio` as the 64 kbps AAC every clip on the site uses. */
export function writeM4a(audio: Audio, wavPath: string, destination: string) {
  writeFileSync(wavPath, wav(audio));
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", wavPath, destination]);
}

/** Whether each 10 ms window is louder than the silence threshold. */
function activity({ samples, rate }: Audio) {
  const size = Math.round(rate / 100);
  const active: boolean[] = [];
  for (let start = 0; start < samples.length; start += size) {
    let sum = 0;
    const end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i++) sum += samples[i] ** 2;
    active.push(Math.sqrt(sum / (end - start)) > 0.008);
  }
  return { size, active };
}

export type Piece = { clip: Audio; voiced: number };

/**
 * Cuts a batch read with a long pause between items into `count` pieces, at its `count - 1`
 * longest pauses. It refuses when those pauses are short or not clearly longer than every pause
 * inside an item, which is what a skipped, repeated or merged item looks like.
 */
export function split(audio: Audio, count: number): Piece[] | string {
  const { size, active } = activity(audio);
  const first = active.indexOf(true);
  const last = active.lastIndexOf(true);
  if (first < 0) return "the audio is silent";
  const gaps: { start: number; end: number }[] = [];
  for (let i = first; i <= last; i++) {
    if (active[i]) continue;
    const start = i;
    while (!active[i]) i++;
    gaps.push({ start, end: i });
  }
  if (gaps.length < count - 1) return `found ${gaps.length + 1} pieces for ${count} items`;
  const byLength = [...gaps].sort((a, b) => b.end - b.start - (a.end - a.start));
  const cuts = byLength.slice(0, count - 1).sort((a, b) => a.start - b.start);
  const seconds = (windows: number) => (windows * size) / audio.rate;
  const between = Math.min(...cuts.map((gap) => seconds(gap.end - gap.start)));
  const inside = Math.max(
    0,
    ...byLength.slice(count - 1).map((gap) => seconds(gap.end - gap.start)),
  );
  if (count > 1 && (between < 0.5 || between < inside * 1.3))
    return `the pauses between items (${between.toFixed(2)} s) are not clearly longer than those inside them (${inside.toFixed(2)} s)`;
  const pad = 30;
  return Array.from({ length: count }, (_, k) => {
    const start = k ? cuts[k - 1].end : first;
    const end = k < count - 1 ? cuts[k].start : last + 1;
    const left = k ? Math.floor((cuts[k - 1].start + cuts[k - 1].end) / 2) : 0;
    const right = k < count - 1 ? Math.ceil((cuts[k].start + cuts[k].end) / 2) : active.length;
    const from = Math.max(left, start - pad) * size;
    const to = Math.min(right * size, (end + pad) * size, audio.samples.length);
    return {
      clip: { samples: audio.samples.slice(from, to), rate: audio.rate },
      voiced: seconds(end - start),
    };
  });
}
