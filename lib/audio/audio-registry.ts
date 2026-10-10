import index from "./audio-index.json";
import lessonIndex from "./lesson-audio-index.json";
/** text → [readings, content version, folder under listening-audio/ ("" for the root)]. */
const clips = index as unknown as Record<string, [string[], string, string]>;

/** Refuse a known pronunciation mismatch instead of silently reading another tone. */
export function registeredAudioUrl(text: string, pronunciation?: string): string | null {
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
