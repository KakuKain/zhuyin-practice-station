import { lessons, lessonNumerals } from "../courses/course-data";
import { questionSeedsForLesson } from "../listening/listening-data";
import { soundPairs } from "../sound-practice/sound-practice-data";
import { recordingKey, type RecordingIdentity } from "../../lib/audio/custom-audio";

export type RecordingPrompt = RecordingIdentity & { key: string; category: "characters" | "words" };
const prompt = (
  text: string,
  pronunciation: string,
  category: RecordingPrompt["category"],
): RecordingPrompt => ({ text, pronunciation, category, key: recordingKey(text, pronunciation) });

export const recordingLessons = lessons.map((lesson, index) => ({
  label: `第${lessonNumerals[index]}課 · ${lesson.title}`,
  prompts: [
    ...questionSeedsForLesson(index).characters,
    ...questionSeedsForLesson(index).words,
  ].map((seed) =>
    prompt(seed.audioText, seed.answer, seed.category as RecordingPrompt["category"]),
  ),
}));

const allPrompts = recordingLessons.flatMap((lesson) => lesson.prompts);
const priorityCharacters = ["半", "狸", "裡", "背", "覺", "長", "翹", "浣"];
export const priorityPrompts = priorityCharacters.flatMap((text) => {
  const fromLessons = allPrompts.filter((item) => item.text === text);
  const fromPairs = soundPairs
    .flatMap((pair) => pair.sounds)
    .filter((sound) => sound.audioText === text)
    .map((sound) => prompt(text, sound.label, "characters"));
  return [...new Map([...fromLessons, ...fromPairs].map((item) => [item.key, item])).values()];
});
