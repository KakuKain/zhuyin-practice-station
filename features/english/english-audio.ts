/**
 * Everything the English lessons say aloud, in public/english-audio/: each instruction in Chinese,
 * then the letter, word or dialogue in English. First graders cannot read the instructions yet, so
 * each is spoken and shown in 國字注音. Clips are voiced on this Mac for now
 * (scripts/generate-english-audio.ts) and replaced by Gemini ones
 * (scripts/generate-gemini-english.ts), which the Mac script never overwrites.
 */
import { readingVariants } from "../lesson/reading-variants";
import { englishDialogues, englishWords } from "./english-lessons";
import geminiClips from "./english-audio-gemini.json";
import localClips from "./english-audio-local.json";

/** The instructions, in Chinese. */
export const englishPrompts: Record<string, string> = {
  "hear-upper": "聽字母，點出大寫。",
  "hear-lower": "聽字母，點出小寫。",
  "to-lower": "點出這個字母的小寫。",
  "to-upper": "點出這個字母的大寫。",
  "find-all": "把這個字母的小寫都點出來。",
  "hear-initial": "聽單字，點出第一個字母。",
  "see-initial": "看圖，點出第一個字母。",
  "hear-word": "聽單字，點出對的圖。",
  "word-order": "聽一聽，照順序點圖。",
  dialogue: "聽對話，點出對的圖。",
  trace: "描一描，從藍點開始寫。",
  "write-upper": "聽字母，寫出大寫。",
  "write-lower": "聽字母，寫出小寫。",
  "write-initial": "聽單字，寫出第一個字母。",
  "write-missing": "照順序，寫出少了的字母。",
};

/** One reading per Han character of each instruction; a unit test checks them against the font. */
export const englishPromptReadings: Record<string, string> = {
  "hear-upper": "ㄊㄧㄥ ㄗˋ ㄇㄨˇ ㄉㄧㄢˇ ㄔㄨ ㄉㄚˋ ㄒㄧㄝˇ",
  "hear-lower": "ㄊㄧㄥ ㄗˋ ㄇㄨˇ ㄉㄧㄢˇ ㄔㄨ ㄒㄧㄠˇ ㄒㄧㄝˇ",
  "to-lower": "ㄉㄧㄢˇ ㄔㄨ ㄓㄜˋ ˙ㄍㄜ ㄗˋ ㄇㄨˇ ˙ㄉㄜ ㄒㄧㄠˇ ㄒㄧㄝˇ",
  "to-upper": "ㄉㄧㄢˇ ㄔㄨ ㄓㄜˋ ˙ㄍㄜ ㄗˋ ㄇㄨˇ ˙ㄉㄜ ㄉㄚˋ ㄒㄧㄝˇ",
  "find-all": "ㄅㄚˇ ㄓㄜˋ ˙ㄍㄜ ㄗˋ ㄇㄨˇ ˙ㄉㄜ ㄒㄧㄠˇ ㄒㄧㄝˇ ㄉㄡ ㄉㄧㄢˇ ㄔㄨ ˙ㄌㄞ",
  "hear-initial": "ㄊㄧㄥ ㄉㄢ ㄗˋ ㄉㄧㄢˇ ㄔㄨ ㄉㄧˋ ㄧ ㄍㄜˋ ㄗˋ ㄇㄨˇ",
  "see-initial": "ㄎㄢˋ ㄊㄨˊ ㄉㄧㄢˇ ㄔㄨ ㄉㄧˋ ㄧ ㄍㄜˋ ㄗˋ ㄇㄨˇ",
  "hear-word": "ㄊㄧㄥ ㄉㄢ ㄗˋ ㄉㄧㄢˇ ㄔㄨ ㄉㄨㄟˋ ˙ㄉㄜ ㄊㄨˊ",
  "word-order": "ㄊㄧㄥ ㄧ ㄊㄧㄥ ㄓㄠˋ ㄕㄨㄣˋ ㄒㄩˋ ㄉㄧㄢˇ ㄊㄨˊ",
  dialogue: "ㄊㄧㄥ ㄉㄨㄟˋ ㄏㄨㄚˋ ㄉㄧㄢˇ ㄔㄨ ㄉㄨㄟˋ ˙ㄉㄜ ㄊㄨˊ",
  trace: "ㄇㄧㄠˊ ㄧ ㄇㄧㄠˊ ㄘㄨㄥˊ ㄌㄢˊ ㄉㄧㄢˇ ㄎㄞ ㄕˇ ㄒㄧㄝˇ",
  "write-upper": "ㄊㄧㄥ ㄗˋ ㄇㄨˇ ㄒㄧㄝˇ ㄔㄨ ㄉㄚˋ ㄒㄧㄝˇ",
  "write-lower": "ㄊㄧㄥ ㄗˋ ㄇㄨˇ ㄒㄧㄝˇ ㄔㄨ ㄒㄧㄠˇ ㄒㄧㄝˇ",
  "write-initial": "ㄊㄧㄥ ㄉㄢ ㄗˋ ㄒㄧㄝˇ ㄔㄨ ㄉㄧˋ ㄧ ㄍㄜˋ ㄗˋ ㄇㄨˇ",
  "write-missing": "ㄓㄠˋ ㄕㄨㄣˋ ㄒㄩˋ ㄒㄧㄝˇ ㄔㄨ ㄕㄠˇ ˙ㄌㄜ ˙ㄉㄜ ㄗˋ ㄇㄨˇ",
};

export const englishPromptVariants = (id: string) =>
  readingVariants(englishPrompts[id] ?? "", englishPromptReadings[id] ?? "");

/** What a letter clip says: its name, as in the alphabet song. */
const letterNames = "abcdefghijklmnopqrstuvwxyz";

/**
 * Every clip, by id: `prompt-<id>` (Chinese), `letter-<a>`, `word-<word>` and
 * `dialogue-<id>` (two voices, the lines in order).
 */
export const englishClips: Record<string, { text: string; language: "zh" | "en" }> = {
  ...Object.fromEntries(
    Object.entries(englishPrompts).map(([id, text]) => [
      `prompt-${id}`,
      { text, language: "zh" as const },
    ]),
  ),
  ...Object.fromEntries(
    [...letterNames].map((letter) => [
      `letter-${letter}`,
      { text: letter.toUpperCase(), language: "en" as const },
    ]),
  ),
  ...Object.fromEntries(
    Object.keys(englishWords).map((word) => [
      `word-${word}`,
      { text: word, language: "en" as const },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(englishDialogues).map(([id, dialogue]) => [
      `dialogue-${id}`,
      { text: dialogue.lines.join(" / "), language: "en" as const },
    ]),
  ),
};

const gemini = geminiClips as Record<string, { version: number }>;
const local = localClips as Record<string, { version: number }>;

/** Whether a clip has been voiced yet; one not voiced is skipped rather than failing. */
export const hasEnglishClip = (id: string) => Boolean(gemini[id] ?? local[id]);

/** The version goes into the URL, so a cached Mac clip is never played instead of Gemini's. */
export const englishClipUrl = (id: string) =>
  `english-audio/${id}.m4a?v=${gemini[id] ? `g${gemini[id].version}` : (local[id]?.version ?? 0)}`;
