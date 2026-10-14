/**
 * Voices every math instruction in features/math/math-audio.ts with macOS Meijia at a calm pace.
 * Existing clips are kept unless --refresh is given; clips voiced by Gemini
 * (features/math/math-audio-gemini.json) are always kept.
 *
 *   npx tsx scripts/generate-math-audio.ts [--refresh]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mathPromptSpeech, mathPrompts } from "../features/math/math-audio";
import geminiClips from "../features/math/math-audio-gemini.json";

const output = join(process.cwd(), "public/math-audio");
const refresh = process.argv.includes("--refresh");
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "math-audio-"));
let created = 0;
try {
  for (const id of Object.keys(mathPrompts)) {
    const destination = join(output, `${id}.m4a`);
    if (id in geminiClips || (existsSync(destination) && !refresh)) continue;
    const raw = join(temporary, `${id}.aiff`);
    execFileSync("say", ["-v", "Meijia", "-r", "150", "-o", raw, mathPromptSpeech(id)]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", raw, destination]);
    created++;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(`Checked ${Object.keys(mathPrompts).length} math prompts; generated ${created}.`);
