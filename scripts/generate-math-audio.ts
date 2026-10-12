/**
 * Voices every math instruction in features/math/math-audio.ts with macOS Meijia at a calm pace.
 * Existing clips are kept unless --refresh is given.
 *
 *   npx tsx scripts/generate-math-audio.ts [--refresh]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mathPrompts } from "../features/math/math-audio";

const output = join(process.cwd(), "public/math-audio");
const refresh = process.argv.includes("--refresh");
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "math-audio-"));
let created = 0;
try {
  for (const [id, text] of Object.entries(mathPrompts)) {
    const destination = join(output, `${id}.m4a`);
    if (existsSync(destination) && !refresh) continue;
    const raw = join(temporary, `${id}.aiff`);
    execFileSync("say", ["-v", "Meijia", "-r", "150", "-o", raw, text]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", raw, destination]);
    created++;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(`Checked ${Object.keys(mathPrompts).length} math prompts; generated ${created}.`);
