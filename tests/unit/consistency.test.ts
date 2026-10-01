import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonLabel, LessonTitle } from "../../components/LessonTitle";
import { FocusHeader } from "../../components/FocusHeader";
import { FavoriteButton, ReviewActions } from "../../components/ReviewActions";
import { exercises, lessons } from "../../features/courses/course-data";
import {
  needsListeningExitConfirmation,
  listeningPhaseLabel,
} from "../../features/listening/listening-policy";
import { validatedFillFavorites } from "../../features/practice/practice-storage";
import { updateFillCollection } from "../../features/practice/fill-collection-state";
import type { FillFavorite, ListenPhase } from "../../features/types";

test("shared lesson headings retain annotated and accessible names for all nine courses", () => {
  for (const [lessonIndex, lesson] of lessons.entries()) {
    const title = renderToStaticMarkup(createElement(LessonTitle, { lessonIndex }));
    const label = renderToStaticMarkup(createElement(LessonLabel, { lessonIndex }));
    assert.match(title, /<h1 class="lesson-title"/);
    assert.ok(title.includes(`class="visually-hidden">${lesson.title}</span>`));
    assert.match(label, /annotated-text/);
    const header = renderToStaticMarkup(
      createElement(FocusHeader, {
        onBack() {},
        backLabel: "回到課文預覽",
        lessonIndex,
        stage: "家長檢查",
        heading: true,
      }),
    );
    assert.equal((header.match(/<h1/g) ?? []).length, 1);
    assert.ok(header.includes(label));
    assert.match(header, /回到課文預覽/);
  }
});

test("the entire unfinished listening round is protected in every phase", () => {
  const phases: ListenPhase[] = [
    "ready",
    "active",
    "review",
    "remediation_offer",
    "choice",
    "retry_ready",
    "retry",
  ];
  for (const phase of phases) {
    assert.equal(needsListeningExitConfirmation(phase, 1), true);
    assert.equal(needsListeningExitConfirmation(phase, 0), phase !== "ready");
    assert.ok(listeningPhaseLabel(phase).length);
  }
  assert.equal(listeningPhaseLabel("choice"), "選擇注音");
});

test("fill mastery and favorite flags are independent and undo preserves pending work", () => {
  const target: FillFavorite = {
    lessonIndex: 0,
    ...exercises[0].lines.flat()[0],
    positions: [0],
    status: "needs_rewrite",
  };
  const legacy = validatedFillFavorites([target]);
  assert.equal(legacy[0].isFavorite, true);
  const removed = updateFillCollection(legacy, target, { isFavorite: false });
  assert.equal(removed.length, 1);
  assert.equal(removed[0].status, "needs_rewrite");
  const restored = updateFillCollection(removed, target, { isFavorite: true });
  assert.equal(restored[0].status, "needs_rewrite");
  const mastered = updateFillCollection(restored, target, { status: "mastered" });
  assert.equal(mastered[0].isFavorite, true);
  assert.equal(mastered[0].status, "mastered");
  assert.equal(updateFillCollection(removed, target, { status: "mastered" }).length, 0);
  assert.equal(updateFillCollection(mastered, target, { isFavorite: false }).length, 0);
  assert.equal(target.isFavorite, undefined);
  assert.equal(validatedFillFavorites(removed)[0].isFavorite, false);
  assert.equal(validatedFillFavorites(mastered)[0].status, "mastered");
});

test("common review controls keep two explicit decisions and a separate favorite toggle", () => {
  const review = renderToStaticMarkup(
    createElement(ReviewActions, { onCorrect() {}, onRetry() {} }),
  );
  assert.equal((review.match(/<button/g) ?? []).length, 2);
  assert.match(review, /答對/);
  assert.match(review, /需要補強/);
  const star = renderToStaticMarkup(createElement(FavoriteButton, { saved: true, onToggle() {} }));
  assert.match(star, /aria-pressed="true"/);
  assert.match(star, /is-favorite/);
  assert.match(star, /已收藏 · 取消收藏/);
});
