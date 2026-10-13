import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  addStamp,
  addTask,
  cardProgress,
  completeTask,
  defaultRewardSettings,
  emptyStampBook,
  maxOpenTasks,
  openTasks,
  removeTask,
  taskKeys,
  taskSuggestions,
  validateStampBook,
  visibleTasks,
  type StampBook,
} from "../../features/rewards/stamp-book";
import {
  lessonPlace,
  taskDestination,
  taskOptions,
  taskPhraseReadings,
} from "../../features/rewards/daily-tasks";
import { buildCatalog, initialMaterials } from "../../features/courses/materials";

const settings = { ...defaultRewardSettings, enabled: true, dailyCap: 2 };
const day = new Date(2026, 9, 13, 9).getTime();
const hour = 60 * 60 * 1000;
const listening = {
  key: taskKeys.lesson(4, "listening"),
  place: "第五課",
  activity: "聽寫",
  annotate: true,
};

test("a task is finished by its own practice and earns a 任務章 the day's limit never stops", () => {
  let book: StampBook = addTask(emptyStampBook, listening, day, "t1");
  // Use up the day's stamps first.
  for (let i = 0; i < 2; i++)
    book = addStamp(
      book,
      settings,
      { kind: "practice", subject: "zhuyin", detail: "辨音" },
      day + i,
    ).book;
  // Another lesson's 聽寫 does not finish it.
  const other = completeTask(book, taskKeys.lesson(2, "listening"), "zhuyin", day + hour);
  assert.equal(other.entry, null);
  const practice = addStamp(
    book,
    settings,
    {
      kind: "practice",
      subject: "zhuyin",
      detail: "第五課 聽寫",
      taskKey: listening.key,
    },
    day + hour,
  );
  assert.equal(practice.entry!.stamped, false);
  const done = completeTask(practice.book, listening.key, "zhuyin", day + hour);
  assert.equal(done.entry!.kind, "task");
  assert.equal(done.entry!.stamped, true);
  assert.equal(done.entry!.detail, "今天的任務：第五課 聽寫");
  assert.equal(openTasks(done.book).length, 0);
  assert.equal(cardProgress(done.book, settings).filled, 3);
  // Finished tasks show as done today and are gone tomorrow; finishing again earns nothing.
  assert.equal(visibleTasks(done.book, day + 2 * hour).length, 1);
  assert.equal(visibleTasks(done.book, day + 24 * hour).length, 0);
  assert.equal(completeTask(done.book, listening.key, "zhuyin", day + 2 * hour).entry, null);
});

test("at most three open tasks, never the same practice twice, and a parent can cancel one", () => {
  let book = addTask(emptyStampBook, listening, day, "a");
  assert.equal(addTask(book, listening, day, "b"), book);
  for (const [index, key] of [taskKeys.sound, taskKeys.fix, taskKeys.math(2)].entries())
    book = addTask(book, { ...listening, key }, day, `k${index}`);
  assert.equal(openTasks(book).length, maxOpenTasks);
  assert.ok(!openTasks(book).some((task) => task.key === taskKeys.math(2)));
  book = removeTask(book, "a");
  assert.equal(openTasks(book).length, 2);
  // Saved tasks are read leniently.
  const saved = validateStampBook({ ...book, tasks: [...book.tasks, { id: 3 }, null] });
  assert.equal(saved.tasks.length, 2);
  assert.equal(validateStampBook({ log: [] }).tasks.length, 0);
});

test("recent practices with questions to work on are suggested as tasks", () => {
  let book = emptyStampBook;
  const practice = (detail: string, taskKey: string, needsPractice: number, at: number) =>
    (book = addStamp(
      book,
      { ...settings, dailyCap: 8 },
      { kind: "practice", subject: "zhuyin", detail, taskKey, needsPractice },
      at,
    ).book);
  practice("第二課 聽寫", taskKeys.lesson(1, "listening"), 3, day - 20 * 24 * hour);
  practice("數學第一課 認識 1～10", taskKeys.math(1), 4, day - 3 * hour);
  practice("第五課 聽寫", taskKeys.lesson(4, "listening"), 2, day - 2 * hour);
  practice("第五課 聽寫", taskKeys.lesson(4, "listening"), 1, day - hour);
  practice("辨音 ㄣ／ㄥ", taskKeys.sound, 0, day - hour);
  const suggestions = taskSuggestions(book, day);
  assert.deepEqual(
    suggestions.map((item) => [item.detail, item.needsPractice]),
    [
      ["第五課 聽寫", 1],
      ["數學第一課 認識 1～10", 4],
    ],
  );
  // Already a task: no longer suggested.
  book = addTask(book, listening, day);
  assert.deepEqual(
    taskSuggestions(book, day).map((item) => item.taskKey),
    [taskKeys.math(1)],
  );
});

test("each lesson offers 聽寫 and 默寫, reviews only 聽寫, and 去做 leads to the practice", () => {
  const catalog = buildCatalog(initialMaterials);
  const options = taskOptions(catalog);
  const lesson5 = catalog.find((lesson) => lesson.index === 4)!;
  assert.equal(lessonPlace(lesson5), "第五課");
  assert.ok(options.some((option) => option.key === taskKeys.lesson(4, "fill")));
  const review = catalog.find((lesson) => lesson.listeningOnly)!;
  assert.ok(options.some((option) => option.key === taskKeys.lesson(review.index, "listening")));
  assert.ok(!options.some((option) => option.key === taskKeys.lesson(review.index, "fill")));
  for (const key of [taskKeys.sound, taskKeys.fix, taskKeys.math(1), taskKeys.math(3)])
    assert.ok(
      options.some((option) => option.key === key),
      key,
    );
  assert.deepEqual(taskDestination(taskKeys.lesson(review.index, "listening")), {
    kind: "lesson",
    lessonIndex: review.index,
  });
  assert.deepEqual(taskDestination(taskKeys.math(2)), { kind: "math", lessonId: 2 });
  assert.deepEqual(taskDestination(taskKeys.fix), { kind: "practice" });
});

// Written by scripts/build-yo-fonts.py from the shipped KidLessonYoSans subset.
const annotated: Record<string, string> = JSON.parse(
  readFileSync("assets/font-sources/KidLessonYoSans-readings.json", "utf8"),
);
const numberReadings: Record<string, string> = {
  一: "ㄧ",
  二: "ㄦˋ",
  三: "ㄙㄢ",
  四: "ㄙˋ",
  五: "ㄨˇ",
  六: "ㄌㄧㄡˋ",
  七: "ㄑㄧ",
  八: "ㄅㄚ",
  九: "ㄐㄧㄡˇ",
};

test("a task reads in 國字注音 with the right zhuyin on every character", () => {
  const phrases = { ...taskPhraseReadings };
  for (const option of taskOptions(buildCatalog(initialMaterials)))
    if (option.annotate && /^第.課$/.test(option.place))
      phrases[option.place] = `ㄉㄧˋ ${numberReadings[option.place[1]]} ㄎㄜˋ`;
    else if (option.annotate && /^複習.$/.test(option.place))
      phrases[option.place] = `ㄈㄨˋ ㄒㄧˊ ${numberReadings[option.place[2]]}`;
  for (const [phrase, reading] of Object.entries(phrases)) {
    const characters = Array.from(phrase).filter((character) => /\p{Script=Han}/u.test(character));
    const syllables = reading.split(" ");
    assert.equal(characters.length, syllables.length, phrase);
    characters.forEach((character, index) =>
      assert.equal(annotated[character], syllables[index], `${phrase}: ${character}`),
    );
  }
  // Every annotated task name is covered.
  for (const option of taskOptions(buildCatalog(initialMaterials)).filter((o) => o.annotate))
    for (const part of [option.place, option.activity].filter(Boolean))
      assert.ok(
        Array.from(part.replace(/[ 0-9～]/g, "")).every((character) => character in annotated),
        part,
      );
});
