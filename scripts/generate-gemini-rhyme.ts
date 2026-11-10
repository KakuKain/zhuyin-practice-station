/**
 * Re-voices one combined rhyme with Gemini when its clip sounds wrong, in two steps so a parent
 * hears it before the site does:
 *
 *   npx tsx scripts/generate-gemini-rhyme.ts ㄧㄞ             # one request: three takes
 *   npx tsx scripts/generate-gemini-rhyme.ts ㄧㄞ --install 2 # put take 2 on the site
 *
 * The first writes outputs/gemini-rhyme/<rhyme>-<take>.m4a (and the whole answer as a WAV) and
 * prints the prompt; listen, then install the right take. Installing replaces
 * public/listening-audio/gemini/rhymes/<name>.m4a and its entry in gemini/manifest.json; then run
 * npm run assets:audio-registry. The request needs GEMINI_API_KEY (pasted where input is hidden).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate, split, wav, writeM4a } from "./gemini-audio";

const root = join(import.meta.dirname, "..");
const outDir = join(root, "outputs", "gemini-rhyme");
const manifestPath = join(root, "public/listening-audio/gemini/manifest.json");

/**
 * What to ask for each rhyme that needs its own words. ㄧㄞ is a symbol read in the first tone;
 * given 「崖」 the voice said ㄧㄚ, so the prompt names the sound and what it is not.
 */
const prompts: Record<string, { prompt: string; tone: string }> = {
  ㄧㄞ: {
    tone: "第一聲",
    prompt:
      "請用台灣華語，像國小老師教注音結合韻那樣，清楚的念出結合韻「ㄧㄞ」：第一聲，高而平，" +
      "把「ㄧ」和「ㄞ」很快的連成一個音（拼音 yāi）。不是「ㄧㄚ」（鴨），也不是第二聲的「崖」。" +
      "念三次，每次中間停兩秒，前後不要加任何話：ㄧㄞ [long pause] ㄧㄞ [long pause] ㄧㄞ",
  },
};

const [rhyme, flag, take] = process.argv.slice(2);
const spec = prompts[rhyme];
if (!spec) throw new Error(`Usage: generate-gemini-rhyme.ts <${Object.keys(prompts).join("|")}>`);
const name = [...rhyme].map((c) => c.codePointAt(0)!.toString(16)).join("-");
const takePath = (k: number) => join(outDir, `${rhyme}-${k}.m4a`);

if (flag === "--install") {
  const chosen = takePath(Number(take));
  if (!existsSync(chosen)) throw new Error(`No ${chosen}; record the takes first`);
  const meta = JSON.parse(readFileSync(join(outDir, `${rhyme}.json`), "utf8"));
  const destination = join(root, "public/listening-audio/gemini/rhymes", `${name}.m4a`);
  copyFileSync(chosen, destination);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest.rhymes.find((item: { text: string }) => item.text === rhyme);
  if (!entry) throw new Error(`${rhyme} is not in the manifest's rhymes`);
  Object.assign(entry, {
    prompt: spec.prompt,
    tone: spec.tone,
    duration: meta.takes[Number(take) - 1].duration,
    voicedDuration: meta.takes[Number(take) - 1].voiced,
    revoicedAt: new Date().toISOString().slice(0, 10),
    take: Number(take),
  });
  delete entry.sourceRange;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Installed take ${take} as ${destination}. Now run: npm run assets:audio-registry`);
} else {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY (paste it where the input is hidden).");
  mkdirSync(outDir, { recursive: true });
  console.log(spec.prompt);
  const audio = await generate(spec.prompt, apiKey);
  writeFileSync(join(outDir, `${rhyme}-all.wav`), wav(audio));
  const pieces = split(audio, 3);
  if (typeof pieces === "string")
    throw new Error(`Could not cut three takes: ${pieces}. Listen to ${rhyme}-all.wav.`);
  const round = (value: number) => Math.round(value * 100) / 100;
  const takes = pieces.map(({ clip, voiced }, k) => {
    writeM4a(clip, join(outDir, `${rhyme}-${k + 1}.wav`), takePath(k + 1));
    return { duration: round(clip.samples.length / clip.rate), voiced: round(voiced) };
  });
  writeFileSync(join(outDir, `${rhyme}.json`), JSON.stringify({ prompt: spec.prompt, takes }));
  takes.forEach((item, k) =>
    console.log(`take ${k + 1}: ${takePath(k + 1)} (${item.voiced} s of speech)`),
  );
  console.log(`Listen, then: npx tsx scripts/generate-gemini-rhyme.ts ${rhyme} --install <take>`);
}
