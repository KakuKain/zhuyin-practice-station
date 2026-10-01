"use client";

import type { AppController } from "../usePracticeApp";
import { courseArtwork } from "../courses/course-data";
import { InkPreview } from "../../components/AppChrome";
import { ArrowRight } from "@phosphor-icons/react";

export function FillBlank({
  app,
}: {
  app: Pick<
    AppController,
    | "fillComplete"
    | "fillLineStarts"
    | "fillNeedsRetry"
    | "fillParentChecked"
    | "fillPendingCells"
    | "fillStrokes"
    | "lesson"
    | "lessonItems"
    | "lessonLines"
    | "lessonNumber"
    | "openFillCell"
    | "openFillReview"
    | "openListening"
    | "selectedLesson"
    | "storageError"
    | "writtenCount"
  >;
}) {
  const {
    fillComplete,
    fillLineStarts,
    fillNeedsRetry,
    fillParentChecked,
    fillPendingCells,
    fillStrokes,
    lesson,
    lessonItems,
    lessonLines,
    lessonNumber,
    openFillCell,
    openFillReview,
    openListening,
    selectedLesson,
    storageError,
    writtenCount,
  } = app;
  return (
    <section className={`page-section fill-page ${fillParentChecked ? "is-complete" : ""}`}>
      <div className="fill-story-heading">
        <div className="fill-story-copy">
          <span className="fill-story-kicker">第{lessonNumber}課 · 課文默寫</span>
          <h1>{lesson.title}</h1>
          <p className="fill-sheet-help">
            {fillParentChecked
              ? "家長已檢查。修改任何一格後，需要再檢查一次。"
              : "先寫完整篇，再請家長對照答案。"}
            {fillNeedsRetry.length > 0 && `有 ${fillNeedsRetry.length} 格待重寫。`}
          </p>
        </div>
        <img
          className="fill-story-art"
          src={
            selectedLesson === 7
              ? "/course-art/radish-story.webp"
              : `/course-art/${courseArtwork[selectedLesson]}-watercolor.webp`
          }
          alt=""
        />
      </div>
      <div className="fill-status-line">
        <span>
          {fillParentChecked ? "家長已檢查" : `已寫 ${writtenCount} / ${lessonItems.length} 格`}
        </span>
        <small>
          {lesson.title} ·{" "}
          {fillParentChecked
            ? `完成 ${lessonItems.length} / ${lessonItems.length} 格`
            : "逐格完成注音"}
          {lessonLines.length > 5 ? " · 左右滑動看其他行" : ""}
        </small>
      </div>
      {storageError && (
        <p className="fill-storage-error" role="alert">
          這台裝置目前無法保存默寫；請先不要關閉頁面，檢查瀏覽器的儲存設定。
        </p>
      )}
      <div className="zhuyin-sheet">
        <div
          className={`syllable-row ${lessonLines.length > 5 ? "has-many-lines" : ""}`}
          dir="rtl"
          aria-label="課文直排注音，從右向左閱讀"
        >
          {lessonLines.map((line, lineIndex) => {
            const lineStart = fillLineStarts[lineIndex];
            return (
              <div
                className="syllable-column"
                role="group"
                aria-label={`第 ${lineIndex + 1} 行`}
                key={lineIndex}
              >
                <span className="fill-line-label">第{lineIndex + 1}行</span>
                {line.map((_, itemIndex) => {
                  const index = lineStart + itemIndex;
                  return (
                    <button
                      className={`syllable-cell fill-cell ${fillStrokes[index]?.length ? "is-filled" : "is-target"} ${fillPendingCells[index]?.length ? "is-in-progress" : ""} ${fillNeedsRetry.includes(index) ? "is-needs-retry" : ""}`}
                      key={index}
                      type="button"
                      aria-label={`第 ${lineIndex + 1} 行第 ${itemIndex + 1} 格，${fillPendingCells[index]?.length ? "尚未完成，繼續寫注音" : fillNeedsRetry.includes(index) ? "待重寫" : fillStrokes[index]?.length ? "修改注音" : "寫注音"}`}
                      onClick={() => openFillCell(index)}
                    >
                      {fillPendingCells[index]?.length ? (
                        <InkPreview strokes={fillPendingCells[index]} />
                      ) : fillStrokes[index]?.length ? (
                        <InkPreview strokes={fillStrokes[index]} />
                      ) : (
                        <span className="fill-cell-plus" aria-hidden="true">
                          ＋
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {!fillParentChecked && (
          <img className="fill-pencil-art" src="/course-art/blue-watercolor-pencil.webp" alt="" />
        )}
      </div>
      {!fillComplete && (
        <button
          className="fill-begin-button"
          type="button"
          onClick={() =>
            openFillCell(lessonItems.findIndex((_, index) => !fillStrokes[index]?.length))
          }
        >
          {writtenCount ? "從下一格繼續" : "從第一格開始"}{" "}
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      )}
      {fillComplete && !fillParentChecked && (
        <div className="fill-check-actions">
          {fillNeedsRetry.length > 0 && (
            <button
              type="button"
              className="fill-begin-button"
              onClick={() => openFillCell(fillNeedsRetry[0])}
            >
              重寫待補強的 {fillNeedsRetry.length} 格 <ArrowRight size={19} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="fill-begin-button" onClick={openFillReview}>
            請家長檢查 <ArrowRight size={19} aria-hidden="true" />
          </button>
        </div>
      )}
      {fillParentChecked && (
        <div className="completion-banner">
          <span>✓</span>
          <p>
            <strong>家長檢查完成！</strong>
            <small>全部注音都已對照；也可以點格子修改。</small>
          </p>
          <img
            className="completion-pencil-art"
            src="/course-art/blue-watercolor-pencil.webp"
            alt=""
          />
          <button type="button" className="primary-button" onClick={openListening}>
            進入聽寫 <span>→</span>
          </button>
        </div>
      )}
      {!fillParentChecked && <p className="fill-parent-cue">完成後請家長檢查</p>}
    </section>
  );
}
