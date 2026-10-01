import assert from "node:assert/strict";
import test from "node:test";
import {
  initialPracticeState,
  validatePracticeState,
} from "../../features/practice/practice-storage";
import { appendPracticeSession, updateQuestionFlags } from "../../features/practice/practice-state";
import { paginateLesson } from "../../features/lesson/lesson-pagination";
import {
  listeningDuration,
  validateListeningSettings,
} from "../../features/settings/listening-settings";
import { lessons } from "../../features/courses/course-data";
import {
  lessonTitleGroups,
  lessonTitleVariants,
  withPronunciationVariants,
} from "../../features/lesson/annotated-text";

test("unfavorite preserves pending work and mastery preserves favorites", () => {
  const pending = updateQuestionFlags(initialPracticeState, 0, "symbols:ㄅ", {
    needsPractice: true,
  });
  assert.equal(pending.savedQuestions[0].isFavorite, false);
  const favorite = updateQuestionFlags(pending, 0, "symbols:ㄅ", { isFavorite: true });
  const unfavorite = updateQuestionFlags(favorite, 0, "symbols:ㄅ", { isFavorite: false });
  assert.equal(unfavorite.savedQuestions[0].needsPractice, true);
  assert.equal(unfavorite.savedQuestions[0].isFavorite, false);
  const undo = updateQuestionFlags(unfavorite, 0, "symbols:ㄅ", { isFavorite: true });
  const mastered = updateQuestionFlags(undo, 0, "symbols:ㄅ", { needsPractice: false });
  assert.equal(mastered.savedQuestions[0].isFavorite, true);
  assert.equal(
    updateQuestionFlags(unfavorite, 0, "symbols:ㄅ", { needsPractice: false }).savedQuestions
      .length,
    0,
  );
  assert.equal(initialPracticeState.savedQuestions.length, 0);
});

test("completed history is bounded, idempotent, validated and not fabricated from old visits", () => {
  assert.deepEqual(validatePracticeState({ recentLesson: 8, completedSessions: 2 }).history, []);
  let state = initialPracticeState;
  for (let index = 1; index <= 25; index++)
    state = appendPracticeSession(state, {
      id: String(index),
      completedAt: index,
      lessonIndex: 0,
      mode: "listening",
      answeredUnits: 12,
      correctUnits: 10,
      pendingQuestions: 1,
    });
  assert.equal(state.history.length, 20);
  assert.equal(state.completedSessions, 25);
  assert.equal(state.history[0].correctUnits, 10);
  assert.equal(appendPracticeSession(state, state.history[0]), state);
  const raw = {
    ...state,
    history: [null, { ...state.history[0], correctUnits: 13 }, ...state.history],
  };
  assert.deepEqual(validatePracticeState(raw).history, state.history);
});

test("all lesson pages remain contiguous and balanced on mobile and desktop", () => {
  for (const lesson of lessons)
    for (const columns of [6, 8]) {
      const pages = paginateLesson(lesson.lines.length, columns);
      assert.equal(pages[0].start, 0);
      assert.equal(
        pages.reduce((sum, page) => sum + page.count, 0),
        lesson.lines.length,
      );
      assert.ok(
        Math.max(...pages.map((page) => page.count)) -
          Math.min(...pages.map((page) => page.count)) <=
          1,
      );
      for (let index = 0; index < pages.length; index++) {
        assert.ok(pages[index].count <= columns);
        if (index)
          assert.equal(pages[index].start, pages[index - 1].start + pages[index - 1].count);
      }
    }
  assert.deepEqual(paginateLesson(7, 6), [
    { start: 0, count: 4 },
    { start: 4, count: 3 },
  ]);
});

test("title groups keep every character and the existing neutral-tone variants", () => {
  for (const [index, groups] of Object.entries(lessonTitleGroups))
    assert.equal(groups.join(""), lessons[Number(index)].title);
  assert.equal(
    withPronunciationVariants(lessons[5].title, lessonTitleVariants[5]),
    "謝謝\u{E01E1}老師",
  );
});

test("relaxed writing time doubles the adaptive duration without changing playback speed", () => {
  const standard = validateListeningSettings(null);
  const relaxed = validateListeningSettings({ ...standard, answerTime: "relaxed" });
  for (const [units, duration] of [
    [1, 30],
    [2, 30],
    [3, 36],
    [4, 48],
    [5, 60],
  ]) {
    const question = { category: "words" as const, answer: Array(units).fill("ㄅ").join("|") };
    assert.equal(listeningDuration(question, standard), duration);
    assert.equal(listeningDuration(question, relaxed), duration * 2);
  }
  assert.equal(validateListeningSettings({ answerTime: "bad" }).answerTime, "standard");
});
