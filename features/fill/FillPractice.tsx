"use client";

import type { AppController } from "../usePracticeApp";
import { fillFavoriteKey, fillLocation } from "../practice/practice-storage";
import { InkPreview, LoadingOverlay } from "../../components/AppChrome";
import { ArrowLeft, Eraser } from "@phosphor-icons/react";
import { lessonNumerals, lessons } from "../courses/course-data";
import { ZhuyinStack } from "../../components/Zhuyin";

export function FillPractice({
  app,
}: {
  app: Pick<
    AppController,
    | "beginFillDrawing"
    | "clearFillDrawing"
    | "endFillDrawing"
    | "fillCanvasRef"
    | "fillDraftRef"
    | "fillHasInk"
    | "fillIsDirty"
    | "fillPracticeExitOpen"
    | "fillPracticePhase"
    | "fillPracticeStrokes"
    | "fillPracticeTarget"
    | "loadingMessage"
    | "moveFillDrawing"
    | "removeFillFavorite"
    | "setFillFavorites"
    | "setFillHasInk"
    | "setFillPracticeExitOpen"
    | "setFillPracticePhase"
    | "setFillPracticeStrokes"
    | "setPracticeNotice"
    | "setView"
  >;
}) {
  const {
    beginFillDrawing,
    clearFillDrawing,
    endFillDrawing,
    fillCanvasRef,
    fillDraftRef,
    fillHasInk,
    fillIsDirty,
    fillPracticeExitOpen,
    fillPracticePhase,
    fillPracticeStrokes,
    fillPracticeTarget,
    loadingMessage,
    moveFillDrawing,
    removeFillFavorite,
    setFillFavorites,
    setFillHasInk,
    setFillPracticeExitOpen,
    setFillPracticePhase,
    setFillPracticeStrokes,
    setPracticeNotice,
    setView,
  } = app;

  if (!fillPracticeTarget) return null;
  const favorite = fillPracticeTarget;
  const location = fillLocation(favorite.lessonIndex, favorite.positions[0]);
  return (
    <main className="fill-focus-shell fill-practice-shell">
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <header className="fill-focus-header">
        <button
          type="button"
          onClick={() => {
            if (fillPracticePhase === "writing" && fillIsDirty) {
              setFillPracticeExitOpen(true);
              return;
            }
            setView("practice");
          }}
        >
          <ArrowLeft size={19} aria-hidden="true" /> 回到練習
        </button>
        <strong>錯字重練</strong>
        <span>第{lessonNumerals[favorite.lessonIndex]}課</span>
      </header>
      {fillPracticePhase === "writing" ? (
        <div className="fill-focus-body">
          <div className="fill-practice-prompt">
            <small>
              {lessons[favorite.lessonIndex].title} · {location}
            </small>
            <h1>寫出「{favorite.character}」的注音</h1>
            <p>寫好後交給家長檢查，正確答案會在下一頁顯示。</p>
          </div>
          <div className="fill-canvas-tools">
            <button
              type="button"
              className="fill-clear-button"
              aria-label="清除重寫"
              onClick={clearFillDrawing}
            >
              <Eraser size={20} aria-hidden="true" />
              清除
            </button>
          </div>
          <div className="fill-writing-grid">
            <canvas
              ref={fillCanvasRef}
              onPointerDown={beginFillDrawing}
              onPointerMove={moveFillDrawing}
              onPointerUp={endFillDrawing}
              onPointerCancel={endFillDrawing}
              aria-label={`${favorite.character}注音手寫區`}
            />
          </div>
          <div className="fill-writing-actions">
            <button
              type="button"
              className="fill-save-button"
              disabled={!fillHasInk}
              onClick={() => {
                if (!fillDraftRef.current.length) return;
                setFillPracticeStrokes(
                  fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))),
                );
                setFillPracticePhase("review");
              }}
            >
              請家長檢查
            </button>
          </div>
        </div>
      ) : (
        <div className="fill-review-body fill-practice-review">
          <h1>請家長一起檢查</h1>
          <p>
            {lessons[favorite.lessonIndex].title} · {location} ·「{favorite.character}」
          </p>
          <div className="fill-practice-compare">
            <div>
              <small>孩子寫的</small>
              <div className="fill-compare-ink">
                <InkPreview strokes={fillPracticeStrokes} />
              </div>
            </div>
            <div>
              <small>正確注音</small>
              <div className="fill-compare-answer">
                <ZhuyinStack text={favorite.zhuyin} />
              </div>
            </div>
          </div>
          <div className="fill-review-actions">
            <button
              type="button"
              onClick={() => {
                setFillPracticePhase("writing");
                setFillPracticeStrokes([]);
                setFillHasInk(false);
              }}
            >
              再寫一次
            </button>
            <button type="button" onClick={() => removeFillFavorite(favorite, true)}>
              已掌握 · 移出收藏
            </button>
          </div>
          <button
            type="button"
            className="fill-practice-defer"
            onClick={() => {
              setFillFavorites((current) =>
                current.map((item) =>
                  fillFavoriteKey(item) === fillFavoriteKey(favorite)
                    ? { ...item, status: "review_later" }
                    : item,
                ),
              );
              setPracticeNotice("已保留在錯字收藏，下次可以再練。");
              setView("practice");
            }}
          >
            稍後再練，保留收藏
          </button>
        </div>
      )}
      {fillPracticeExitOpen && (
        <div className="fill-dialog-backdrop">
          <div
            className="fill-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="practice-exit-title"
            aria-describedby="practice-exit-description"
          >
            <span className="fill-dialog-eyebrow">錯字練習</span>
            <h2 id="practice-exit-title">這格還沒寫完</h2>
            <p id="practice-exit-description">
              現在離開會失去這次筆跡；錯字收藏仍會保留，可以之後再練。
            </p>
            <button
              className="fill-dialog-primary"
              type="button"
              autoFocus
              onClick={() => setFillPracticeExitOpen(false)}
            >
              繼續寫
            </button>
            <button
              className="fill-dialog-secondary"
              type="button"
              onClick={() => {
                setFillPracticeExitOpen(false);
                setView("practice");
              }}
            >
              離開這格
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
