import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const examples = JSON.parse(readFileSync("features/symbols/combined-rhyme-examples.json", "utf8"));
const overrides = { ㄧㄣ: "音", ㄧㄥ: "英", ㄨㄢ: "彎", ㄩㄣ: "暈", ㄩㄢ: "冤", ㄩㄥ: "雍" };
mkdirSync("public/listening-audio/ai-rhymes", { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "kid-rhymes-"));
try {
  for (const item of examples) {
    const name = [...item.rhyme].map((c) => c.codePointAt(0).toString(16)).join("-");
    const raw = join(temporary, name + ".aiff");
    execFileSync("say", [
      "-v",
      "Meijia",
      "-r",
      "100",
      "-o",
      raw,
      overrides[item.rhyme] ?? item.character,
    ]);
    execFileSync("afconvert", [
      "-f",
      "m4af",
      "-d",
      "aac",
      "-b",
      "48000",
      raw,
      `public/listening-audio/ai-rhymes/${name}.m4a`,
    ]);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log("Generated 22 reading-only synthetic clips.");
