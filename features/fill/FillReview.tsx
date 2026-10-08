"use client";

import { ProgressiveImage } from "../../components/ProgressiveImage";

import { ShowMsg } from "../../components/ShowMsg";

import type { AppController } from "../usePracticeApp";
import { InkPreview, LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
import { ArrowRight, PencilLine } from "@phosphor-icons/react";
import { FavoriteButton } from "../../components/ReviewActions";
import { FocusHeader } from "../../components/FocusHeader";
import { LessonTitle } from "../../components/LessonTitle";
import { useCatalogLesson } from "../courses/MaterialContext";
import { fillFavoriteKey } from "../practice/practice-storage";
import { ZhuyinStack } from "../../components/Zhuyin";

export function FillReview({
  app,
}: {
  app: Pick<
    AppController,
    | "fillFavorites"
    | "confirmFillReview"
    | "fillLineStarts"
    | "fillNeedsRetry"
    | "fillReviewOpen"
    | "fillStrokes"
    | "lessonItems"
    | "lessonLines"
    | "loadingMessage"
    | "resourceError"
    | "rewriteFillCell"
    | "selectedLesson"
    | "setFillReviewOpen"
    | "toggleFillFavorite"
  >;
}) {
  const {
    fillFavorites,
    confirmFillReview,
    fillLineStarts,
    fillNeedsRetry,
    fillReviewOpen,
    fillStrokes,
    lessonItems,
    lessonLines,
    loadingMessage,
    resourceError,
    rewriteFillCell,
    selectedLesson,
    setFillReviewOpen,
    toggleFillFavorite,
  } = app;

  const catalogLesson = useCatalogLesson(app.selectedLesson);
  if (!fillReviewOpen) return null;
  const savedCount = fillFavorites
    .filter((favorite) => favorite.lessonIndex === selectedLesson && favorite.isFavorite !== false)
    .reduce((count, favorite) => count + favorite.positions.length, 0);
  return (
    <main className="fill-focus-shell fill-review-shell">
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <FocusHeader
        onBack={() => setFillReviewOpen(false)}
        backLabel="回到默寫"
        lessonIndex={selectedLesson}
        stage="課文默寫 · 家長檢查"
      />
      <div className="fill-review-body">
        <ResourceNotice failed={resourceError} />
        <div className="fill-review-intro">
          <div>
            <LessonTitle lessonIndex={selectedLesson} />
            <small>
              已寫 {lessonItems.length} / {lessonItems.length} 格 · 已收藏 {savedCount} 格
              {fillNeedsRetry.length ? ` · ${fillNeedsRetry.length} 格待重寫` : ""}
            </small>
          </div>
          {!catalogLesson.custom && (
            <ProgressiveImage
              src={
                selectedLesson === 0
                  ? "course-art/review-sleeping-cat-watercolor-v2.webp"
                  : selectedLesson === 7
                    ? "course-art/radish-story.webp"
                    : catalogLesson.artwork
                      ? `course-art/${catalogLesson.artwork}-watercolor.webp`
                      : "course-art/lesson-watercolor-paper.webp"
              }
              alt=""
            />
          )}
        </div>
        <div className="fill-compare-list">
          {lessonLines.map((line, lineIndex) => (
            <section
              className="fill-review-line"
              key={lineIndex}
              aria-label={`第 ${lineIndex + 1} 行`}
            >
              <h2>
                {!catalogLesson.custom && lineIndex === 0
                  ? "標題"
                  : `第 ${lineIndex + (catalogLesson.custom ? 1 : 0)} 行`}
              </h2>
              {line.map((item, offset) => {
                const index = fillLineStarts[lineIndex] + offset;
                const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
                const saved = fillFavorites.some(
                  (favorite) =>
                    favorite.isFavorite !== false &&
                    fillFavoriteKey(favorite) === key &&
                    favorite.positions.includes(index),
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
                    <FavoriteButton
                      className="fill-favorite-toggle"
                      ariaLabel={`${saved ? "取消收藏" : "收藏"}第 ${lineIndex + 1} 行第 ${offset + 1} 格`}
                      saved={saved}
                      iconOnly
                      onToggle={() => toggleFillFavorite(index)}
                    />
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
            <ShowMsg message="請先點上方對應的「重寫這格」，完成後再確認檢查。" />
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
