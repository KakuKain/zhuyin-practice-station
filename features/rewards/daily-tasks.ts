import type { CatalogLesson } from "../courses/materials";
import { mathLessons } from "../math/math-lessons";
import { taskKeys, type DailyTask } from "./stamp-book";

/** How a lesson is named in tasks and the stamp log: 「第五課」, 「複習一」, or the parent's name. */
export const lessonPlace = (lesson: CatalogLesson) =>
  lesson.listeningOnly || lesson.custom ? lesson.title : `第${lesson.number}課`;

export type TaskOption = Omit<DailyTask, "id" | "at" | "doneAt"> & { group: string };

/**
 * Everything a parent can set as 今天的任務: each lesson's 聽寫 and 默寫 (reviews only listen),
 * 辨音, correcting a question, and each math lesson.
 */
export function taskOptions(catalog: readonly CatalogLesson[]): TaskOption[] {
  const lessons = catalog.filter((lesson) => !lesson.archived);
  return [
    ...lessons.flatMap((lesson) => {
      const place = lessonPlace(lesson);
      const group = lesson.custom ? lesson.materialName : "國語";
      const annotate = !lesson.custom;
      return [
        {
          key: taskKeys.lesson(lesson.index, "listening"),
          place,
          activity: "聽寫",
          annotate,
          group,
        },
        ...(lesson.listeningOnly
          ? []
          : [
              {
                key: taskKeys.lesson(lesson.index, "fill"),
                place,
                activity: "默寫",
                annotate,
                group,
              },
            ]),
      ];
    }),
    { key: taskKeys.sound, place: "", activity: "辨音練習", annotate: true, group: "其他" },
    { key: taskKeys.fix, place: "", activity: "改對一題待補強", annotate: true, group: "其他" },
    ...mathLessons
      .filter((lesson) => lesson.ready)
      .map((lesson) => ({
        key: taskKeys.math(lesson.id),
        place: `數學${lesson.number}`,
        activity: lesson.title,
        annotate: true,
        group: "數學",
      })),
  ];
}

/** Where 去做 takes the child for a task. */
export type TaskDestination =
  | { kind: "lesson"; lessonIndex: number }
  | { kind: "math"; lessonId: number }
  | { kind: "practice" };

export function taskDestination(key: string): TaskDestination {
  const lesson = /^zhuyin:(-?\d+):/.exec(key);
  if (lesson) return { kind: "lesson", lessonIndex: Number(lesson[1]) };
  const math = /^math:(\d+)$/.exec(key);
  if (math) return { kind: "math", lessonId: Number(math[1]) };
  return { kind: "practice" };
}

/**
 * Words the child reads on a task, with their zhuyin; a unit test checks the font shows exactly
 * these. Built-in lesson names (第一課…, 複習一…) are added by the test.
 */
export const taskPhraseReadings: Record<string, string> = {
  今天的任務: "ㄐㄧㄣ ㄊㄧㄢ ˙ㄉㄜ ㄖㄣˋ ㄨˋ",
  "完成任務，就能拿到任務章！": "ㄨㄢˊ ㄔㄥˊ ㄖㄣˋ ㄨˋ ㄐㄧㄡˋ ㄋㄥˊ ㄋㄚˊ ㄉㄠˋ ㄖㄣˋ ㄨˋ ㄓㄤ",
  聽寫: "ㄊㄧㄥ ㄒㄧㄝˇ",
  默寫: "ㄇㄛˋ ㄒㄧㄝˇ",
  辨音練習: "ㄅㄧㄢˋ ㄧㄣ ㄌㄧㄢˋ ㄒㄧˊ",
  改對一題待補強: "ㄍㄞˇ ㄉㄨㄟˋ ㄧ ㄊㄧˊ ㄉㄞˋ ㄅㄨˇ ㄑㄧㄤˊ",
  完成了: "ㄨㄢˊ ㄔㄥˊ ˙ㄌㄜ",
  去做: "ㄑㄩˋ ㄗㄨㄛˋ",
  數學第一課: "ㄕㄨˋ ㄒㄩㄝˊ ㄉㄧˋ ㄧ ㄎㄜˋ",
  數學第二課: "ㄕㄨˋ ㄒㄩㄝˊ ㄉㄧˋ ㄦˋ ㄎㄜˋ",
  數學第三課: "ㄕㄨˋ ㄒㄩㄝˊ ㄉㄧˋ ㄙㄢ ㄎㄜˋ",
  認識: "ㄖㄣˋ ㄕˋ",
  比一比: "ㄅㄧˇ ㄧ ㄅㄧˇ",
  加法: "ㄐㄧㄚ ㄈㄚˇ",
};
