"use client";
import { ShowMsg } from "../../components/ShowMsg";
import { isFillCellComplete } from "./fill-draft-policy";

import type { AppController } from "../usePracticeApp";
import { useCatalogLesson } from "../courses/MaterialContext";
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
    storageError,
    writtenCount,
  } = app;
  const catalogLesson = useCatalogLesson(app.selectedLesson);
  return (
    <section className={`page-section fill-page ${fillParentChecked ? "is-complete" : ""}`}>
      <h1 className="visually-hidden">{lesson.title}注音默寫</h1>
      <div className="fill-status-line">
        <span>
          {fillParentChecked ? "家長已檢查" : `已寫 ${writtenCount} / ${lessonItems.length} 格`}
          {!fillParentChecked &&
            Object.keys(fillPendingCells).length > 0 &&
            ` · ${Object.keys(fillPendingCells).length} 格未完成`}
        </span>
        <small>
          {catalogLesson.custom ? `${lesson.title} · ` : ""}
          {fillParentChecked
            ? `完成 ${lessonItems.length} / ${lessonItems.length} 格`
            : "逐格完成注音"}
        </small>
      </div>
      {storageError && (
        <ShowMsg
          error
          message="這台裝置目前無法保存默寫；請先不要關閉頁面，檢查瀏覽器的儲存設定。"
        />
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
                aria-label={
                  !catalogLesson.custom && lineIndex === 0
                    ? "標題"
                    : `第 ${lineIndex + (catalogLesson.custom ? 1 : 0)} 行`
                }
                key={lineIndex}
              >
                <span className="fill-line-label">
                  {!catalogLesson.custom && lineIndex === 0
                    ? lessonNumber
                    : `第${lineIndex + (catalogLesson.custom ? 1 : 0)}行`}
                </span>
                {line.map((_, itemIndex) => {
                  const index = lineStart + itemIndex;
                  const hasPending = fillPendingCells[index] !== undefined;
                  return (
                    <button
                      className={`syllable-cell fill-cell ${isFillCellComplete(index, fillStrokes, fillPendingCells) ? "is-filled" : "is-target"} ${hasPending ? "is-in-progress" : ""} ${fillNeedsRetry.includes(index) ? "is-needs-retry" : ""}`}
                      key={index}
                      type="button"
                      aria-label={`${!catalogLesson.custom && lineIndex === 0 ? "標題" : `第 ${lineIndex + (catalogLesson.custom ? 1 : 0)} 行`}第 ${itemIndex + 1} 格，${hasPending ? "尚未完成，繼續寫注音" : fillNeedsRetry.includes(index) ? "待重寫" : fillStrokes[index]?.length ? "修改注音" : "寫注音"}`}
                      onClick={() => openFillCell(index)}
                    >
                      {hasPending ? (
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
          <img
            className="fill-sheet-art"
            src={
              catalogLesson.artwork
                ? `/course-art/${catalogLesson.artwork}-watercolor.webp`
                : "/course-art/blue-watercolor-pencil-v2.webp"
            }
            alt=""
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </div>
      {!fillComplete && (
        <button
          className="fill-begin-button"
          type="button"
          onClick={() =>
            openFillCell(
              lessonLines
                .flatMap((line, row) => line.map((_, offset) => fillLineStarts[row] + offset))
                .find((index) => !isFillCellComplete(index, fillStrokes, fillPendingCells)) ?? 0,
            )
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
            src={
              catalogLesson.artwork
                ? `/course-art/${catalogLesson.artwork}-watercolor.webp`
                : "/course-art/blue-watercolor-pencil-v2.webp"
            }
            alt=""
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
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
