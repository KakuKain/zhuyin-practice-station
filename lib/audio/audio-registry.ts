import index from "./audio-index.json";
import lessonIndex from "./lesson-audio-index.json";
/** text → [readings, content version, folder under listening-audio/ ("" for the root)]. */
const clips = index as unknown as Record<string, [string[], string, string]>;

/**
 * Clips played only up to a point, given as a media fragment (`#t=0,<end>`). 《國語辭典簡編本》's
 * recordings are CC BY-ND (no adaptations), so the file stays byte-identical to the official MP3,
 * and playback stops in the silence after the character, before the recording goes on to read
 * its radical and strokes. ㄧㄤ: the parent heard the Gemini clip as ㄧㄤˊ and chose 「央」; the
 * character ends by 0.45 s and the radical starts at 1.2 s. The 生字 崖 (ㄧㄞˊ) plays the
 * dictionary's 「崖」, which ends by 0.45 s with its radical at 1.25 s: its Gemini clip came from
 * the reading the parent heard as ㄧㄚ. `reading` is the reading the clip says, where it is not
 * the text itself. (The symbol ㄧㄞ is read in the first tone, which no dictionary entry has.)
 */
const partialClips: Record<string, { url: string; end: number; reading?: string }> = {
  ㄧㄤ: { url: "listening-audio/moe-examples/6160.mp3", end: 0.7 },
  崖: { url: "listening-audio/moe-examples/5993.mp3", end: 0.7, reading: "ㄧㄞˊ" },
};

/** Where a clip's playback stops early (`#t=0,0.7`), or null to play it to the end. */
export function clipEnd(url: string): number | null {
  const match = /#t=0,([\d.]+)$/.exec(url);
  return match ? Number(match[1]) : null;
}

/** Refuse a known pronunciation mismatch instead of silently reading another tone. */
export function registeredAudioUrl(text: string, pronunciation?: string): string | null {
  const partial = partialClips[text];
  if (partial && (!pronunciation || pronunciation === (partial.reading ?? text)))
    return `${partial.url}#t=0,${partial.end}`;
  const entry = clips[text];
  if (!entry) return null;
  const [readings, version, folder] = entry;
  if (pronunciation && readings.length && !readings.includes(pronunciation)) return null;
  // A shared filename cannot prove which of several readings it contains.
  if (pronunciation && readings.length > 1) return null;
  const name = [...text].map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return `listening-audio/${folder}${name}.m4a?v=${version}`;
}

export function registeredLessonAudioUrl(lesson: number): string | null {
  const version = (lessonIndex as Record<string, string>)[lesson];
  return version
    ? `listening-audio/gemini/lessons/${String(lesson + 1).padStart(2, "0")}.m4a?v=${version}`
    : null;
}
