import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Run on macOS when lesson content changes. The generated clips are committed
// so deployed playback does not depend on a visitor's speech-synthesis support.
const root = resolve(import.meta.dirname, "..");
const source = ["course-data.ts", "legacy-content.ts"]
  .map((name) => readFileSync(join(root, "features/courses", name), "utf8"))
  .join("\n");
const vocabularySource = readFileSync(join(root, "features/courses/circled-vocabulary.ts"), "utf8");
const circledTexts = [...vocabularySource.matchAll(/term\("([^"]+)"/g)].map((match) => match[1]);
const texts = new Set([
  ...circledTexts,
  ...circledTexts.flatMap((term) => [...term]),
  // Legacy terms keep their clips so older saved questions still play.
  ...[...source.matchAll(/term\("([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/audioText: "([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/wordQuestion\("([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/character: "([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/lines: \[([^\]]+)\]/g)].flatMap((match) =>
    [...match[1].matchAll(/"([^"]+)"/g)].flatMap((line) =>
      [...line[1]].filter((character) => character.trim()),
    ),
  ),
  ...[...source.matchAll(/symbols: \[([^\]]+)\]/g)].flatMap((match) =>
    [...match[1].matchAll(/"([^"]+)"/g)].map((symbol) => symbol[1]),
  ),
]);
const output = join(root, "public/listening-audio");
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "zhuyin-audio-"));
let created = 0;
const refreshAll = process.argv.includes("--refresh-all");
const naturalReadingTexts = new Set(["包", "皮包", "包子", "毛", "衣", "毛衣"]);
const refreshReported = process.argv.includes("--refresh-reported");
const refreshSymbols = process.argv.includes("--refresh-symbols");
// F1–F37 follow the symbol order in the Ministry of Education's Bopomofo manual.
// Its individual audio files are CC BY 4.0; attribution is in public/listening-audio/ATTRIBUTION.md.
const officialSymbols = [
  ..."ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ",
];
const officialAudioBase =
  "https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/html_ch/audio";
// Use unambiguous spoken equivalents for polyphonic characters and combined sounds.
const spokenTextOverrides = new Map([
  ["背", "揹"],
  ["背著", "揹著"],
  ["ㄧㄠ", "腰"],
  ["ㄨㄢ", "彎"],
  ["ㄧㄚ", "鴨"],
  ["ㄧㄡ", "悠"],
  ["ㄧㄤ", "央"],
  ["ㄧㄝ", "椰"],
  ["ㄨㄚ", "蛙"],
  ["ㄨㄛ", "窩"],
  ["ㄨㄥ", "翁"],
  ["ㄧㄢ", "煙"],
  ["ㄧㄥ", "英"],
  ["ㄨㄞ", "歪"],
  ["ㄨㄟ", "威"],
  ["ㄧㄛ", "唷"],
  ["ㄨㄤ", "汪"],
  ["ㄩㄢ", "冤"],
  ["ㄩㄥ", "雍"],
  ["ㄧㄞ", "崖"],
  ["ㄧㄣ", "音"],
  ["ㄨㄣ", "溫"],
  ["ㄩㄝ", "約"],
  ["ㄩㄣ", "暈"],
  ["翹", "俏"],
  // The voice reads 乾 in 魚乾 as ㄍㄢˋ; 竿 has only ㄍㄢ.
  ["魚乾", "魚竿"],
  ["奶奶想要魚乾", "奶奶想要魚竿"],
  ["覺", "叫"],
  ["浣", "碗"],
  ["蔔", "伯"],
  ["喲", "唷"],
  ["長", "漲"],
  ["背書包", "揹書包"],
  ["嘿喲", "嘿唷"],
]);

try {
  for (const text of texts) {
    const filename = [...text].map((character) => character.codePointAt(0).toString(16)).join("-");
    const destination = join(output, `${filename}.m4a`);
    const officialIndex = officialSymbols.indexOf(text);
    if (
      existsSync(destination) &&
      statSync(destination).size > 1024 &&
      !refreshAll &&
      !(refreshReported && naturalReadingTexts.has(text)) &&
      !(refreshSymbols && officialIndex >= 0)
    )
      continue;
    const sourceAudio = join(temporary, `${filename}.${officialIndex >= 0 ? "wav" : "aiff"}`);
    // One clip is one reading. The app controls the gap between repetitions.
    if (officialIndex >= 0) {
      execFileSync("curl", [
        "-fLsS",
        `${officialAudioBase}/F${officialIndex + 1}.WAV`,
        "-o",
        sourceAudio,
      ]);
    } else {
      execFileSync("say", [
        "-v",
        "Meijia",
        "-r",
        naturalReadingTexts.has(text) ? "175" : "100",
        "-o",
        sourceAudio,
        spokenTextOverrides.get(text) ?? text,
      ]);
    }
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", sourceAudio, destination]);
    if (statSync(destination).size <= 1024) throw new Error(`Empty audio clip for ${text}`);
    created++;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

process.stdout.write(`Checked ${texts.size} listening clips; generated ${created}.\n`);
