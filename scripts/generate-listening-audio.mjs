import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Run on macOS when lesson content changes. The generated clips are committed
// so deployed playback does not depend on a visitor's speech-synthesis support.
const root = resolve(import.meta.dirname, "..");
const source = readFileSync(join(root, "app/page.tsx"), "utf8");
const texts = new Set([
  ...[...source.matchAll(/audioText: "([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/character: "([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/symbols: \[([^\]]+)\]/g)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((symbol) => symbol[1])),
]);
const output = join(root, "public/listening-audio");
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "zhuyin-audio-"));
let created = 0;

try {
  for (const text of texts) {
    const filename = [...text].map((character) => character.codePointAt(0).toString(16)).join("-");
    const destination = join(output, `${filename}.m4a`);
    if (existsSync(destination) && statSync(destination).size > 1024) continue;
    const sourceAudio = join(temporary, `${filename}.aiff`);
    execFileSync("say", ["-v", "Meijia", "-r", "160", "-o", sourceAudio, text]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", sourceAudio, destination]);
    if (statSync(destination).size <= 1024) throw new Error(`Empty audio clip for ${text}`);
    created++;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

process.stdout.write(`Checked ${texts.size} listening clips; generated ${created}.\n`);
