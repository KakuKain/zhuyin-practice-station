import test from "node:test";
import assert from "node:assert/strict";
import { courseReviewQueue } from "../../features/practice/course-review";
import type { FillFavorite, SavedQuestion } from "../../features/types";
const fills: FillFavorite[] = [
  {
    lessonIndex: 0,
    character: "咪",
    zhuyin: "ㄇㄧ",
    positions: [0],
    status: "needs_rewrite",
    isFavorite: false,
  },
  {
    lessonIndex: 0,
    character: "貓",
    zhuyin: "ㄇㄠ",
    positions: [1],
    status: "mastered",
    isFavorite: true,
  },
];
const listening = [
  { lessonIndex: 0, questionId: "weak", needsPractice: true, isFavorite: false },
  { lessonIndex: 0, questionId: "favorite", needsPractice: false, isFavorite: true },
  { lessonIndex: 1, questionId: "other", needsPractice: true, isFavorite: true },
] as SavedQuestion[];
test("course retry includes only that course's weak questions, independent of favorites", () => {
  const queue = courseReviewQueue(0, "all", fills, listening);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].mode, "fill");
  assert.deepEqual(queue[1], { mode: "listening", lessonIndex: 0, questionId: "weak" });
  assert.equal(fills[0].isFavorite, false);
  assert.equal(listening[0].needsPractice, true);
});
test("course retry respects mode filters and empty courses", () => {
  assert.deepEqual(courseReviewQueue(0, "fill", fills, listening), [
    { mode: "fill", favorite: fills[0] },
  ]);
  assert.deepEqual(courseReviewQueue(0, "listening", fills, listening), [
    { mode: "listening", lessonIndex: 0, questionId: "weak" },
  ]);
  assert.deepEqual(courseReviewQueue(8, "all", fills, listening), []);
});
