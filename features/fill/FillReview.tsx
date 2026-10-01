"use client";

import type { AppController } from "../usePracticeApp";
import { InkPreview, LoadingOverlay } from "../../components/AppChrome";
import { ArrowLeft, ArrowRight, PencilLine, Star } from "@phosphor-icons/react";
import { courseArtwork } from "../courses/course-data";
import { fillFavoriteKey } from "../practice/practice-storage";
import { ZhuyinStack } from "../../components/Zhuyin";

export function FillReview({
  app,
}: {
  app: Pick<
    AppController,
    | "fillFavorites"
    | "fillLineStarts"
    | "fillNeedsRetry"
    | "fillReviewOpen"
    | "fillStrokes"
    | "lesson"
    | "lessonItems"
    | "lessonLines"
    | "lessonNumber"
    | "loadingMessage"
    | "rewriteFillCell"
    | "selectedLesson"
    | "setCompletedFillLessons"
    | "setFillParentChecked"
    | "setFillReviewOpen"
    | "toggleFillFavorite"
  >;
}) {
  const {
    fillFavorites,
    fillLineStarts,
    fillNeedsRetry,
    fillReviewOpen,
    fillStrokes,
    lesson,
    lessonItems,
    lessonLines,
    lessonNumber,
    loadingMessage,
    rewriteFillCell,
    selectedLesson,
    setCompletedFillLessons,
    setFillParentChecked,
    setFillReviewOpen,
    toggleFillFavorite,
  } = app;

  if (!fillReviewOpen) return null;
  const confirmFillReview = () => {
    if (fillNeedsRetry.length) return;
    setFillReviewOpen(false);
    setFillParentChecked(true);
    setCompletedFillLessons((current) =>
      current.includes(selectedLesson) ? current : [...current, selectedLesson],
    );
  };
  const savedCount = fillFavorites
    .filter((favorite) => favorite.lessonIndex === selectedLesson)
    .reduce((count, favorite) => count + favorite.positions.length, 0);
  return (
    <main className="fill-focus-shell fill-review-shell">
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <header className="fill-focus-header">
        <button type="button" onClick={() => setFillReviewOpen(false)}>
          <ArrowLeft size={19} aria-hidden="true" /> 回到課文
        </button>
        <strong>家長檢查</strong>
        <img
          className="fill-review-corner"
          src="/course-art/review-corner-leaves-watercolor-v2.webp"
          alt=""
        />
      </header>
      <div className="fill-review-body">
        <div className="fill-review-intro">
          <div>
            <h1>
              第{lessonNumber}課 · {lesson.title}
            </h1>
            <small>
              已寫 {lessonItems.length} / {lessonItems.length} 格 · 已收藏 {savedCount} 格
              {fillNeedsRetry.length ? ` · ${fillNeedsRetry.length} 格待重寫` : ""}
            </small>
          </div>
          <img
            src={
              selectedLesson === 0
                ? "/course-art/review-sleeping-cat-watercolor-v2.webp"
                : selectedLesson === 7
                  ? "/course-art/radish-story.webp"
                  : `/course-art/${courseArtwork[selectedLesson]}-watercolor.webp`
            }
            alt=""
          />
        </div>
        <div className="fill-compare-list">
          {lessonLines.map((line, lineIndex) => (
            <section
              className="fill-review-line"
              key={lineIndex}
              aria-label={`第 ${lineIndex + 1} 行`}
            >
              <h2>第 {lineIndex + 1} 行</h2>
              {line.map((item, offset) => {
                const index = fillLineStarts[lineIndex] + offset;
                const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
                const saved = fillFavorites.some(
                  (favorite) =>
                    fillFavoriteKey(favorite) === key && favorite.positions.includes(index),
                );
                const needsRetry = fillNeedsRetry.includes(index);
                return (
                  <div
                    className={`fill-compare-row ${saved ? "is-saved" : ""} ${needsRetry ? "is-needs-retry" : ""}`}
                    key={index}
                  >
                    <span className="fill-compare-number">{offset + 1}</span>
                    <div className="fill-compare-sample">
                      <div className="fill-compare-ink">
                        <InkPreview strokes={fillStrokes[index] ?? []} />
                      </div>
                      <small>孩子筆跡</small>
                    </div>
                    <div className="fill-compare-sample">
                      <div className="fill-compare-answer">
                        <ZhuyinStack text={item.zhuyin} />
                      </div>
                      <small>正確注音</small>
                    </div>
                    <button
                      type="button"
                      className="fill-favorite-toggle"
                      aria-label={`${saved ? "取消收藏" : "收藏"}第 ${lineIndex + 1} 行第 ${offset + 1} 格`}
                      aria-pressed={saved}
                      onClick={() => toggleFillFavorite(index)}
                    >
                      <Star size={25} weight={saved ? "fill" : "regular"} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="fill-rewrite-cell"
                      onClick={() => rewriteFillCell(index)}
                      aria-label={`重寫第 ${lineIndex + 1} 行第 ${offset + 1} 格`}
                    >
                      <PencilLine size={18} aria-hidden="true" />
                      <span>重寫這格</span>
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <div className="fill-review-footer">
          {fillNeedsRetry.length > 0 && (
            <p role="status">請先點上方對應的「重寫這格」，完成後再確認檢查。</p>
          )}
          <div className="fill-review-actions">
            <button type="button" onClick={() => setFillReviewOpen(false)}>
              稍後檢查
            </button>
            <button type="button" disabled={fillNeedsRetry.length > 0} onClick={confirmFillReview}>
              完成檢查 <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
