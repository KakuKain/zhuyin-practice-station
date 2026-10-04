"use client";

import type { AppController } from "../usePracticeApp";
import { fillFavoriteKey, fillLocation } from "../practice/practice-storage";
import { InkPreview, LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
import { InkNotice, InkTools } from "../../components/InkTools";
import { FocusHeader } from "../../components/FocusHeader";
import { ReviewActions } from "../../components/ReviewActions";
import { ZhuyinStack } from "../../components/Zhuyin";

export function FillPractice({
  app,
}: {
  app: Pick<
    AppController,
    | "deferFillPractice"
    | "beginFillDrawing"
    | "clearFillDrawing"
    | "fillEraserActive"
    | "fillCanUndo"
    | "fillInkNotice"
    | "toggleFillEraser"
    | "undoFillInk"
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
    | "resourceError"
    | "moveFillDrawing"
    | "markFillFavoritePracticed"
    | "setFillFavorites"
    | "setFillHasInk"
    | "setFillIsDirty"
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
    fillEraserActive,
    fillCanUndo,
    fillInkNotice,
    toggleFillEraser,
    undoFillInk,
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
    resourceError,
    moveFillDrawing,
    markFillFavoritePracticed,
    setFillFavorites,
    setFillHasInk,
    setFillIsDirty,
    setFillPracticeExitOpen,
    setFillPracticePhase,
    setFillPracticeStrokes,
    setView,
  } = app;

  if (!fillPracticeTarget) return null;
  const favorite = fillPracticeTarget;
  const location = fillLocation(favorite.lessonIndex, favorite.positions[0]);
  return (
    <main className="fill-focus-shell fill-practice-shell">
      <ResourceNotice failed={resourceError} />
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <FocusHeader
        backLabel="回到練習"
        lessonIndex={favorite.lessonIndex}
        stage={`單題重練 · ${fillPracticePhase === "writing" ? "課文默寫" : "家長檢查"}`}
        progress={location}
        onBack={() => {
          if (fillPracticePhase === "writing" && fillIsDirty) {
            setFillPracticeExitOpen(true);
            return;
          }
          setView("practice");
        }}
      />
      {fillPracticePhase === "writing" ? (
        <div className="fill-focus-body">
          <div className="fill-practice-prompt">
            <h1>寫出「{favorite.character}」的注音</h1>
            <p>寫好後交給家長檢查，正確答案會在下一頁顯示。</p>
          </div>
          <div className="fill-canvas-tools">
            <InkTools
              erasing={fillEraserActive}
              hasInk={fillHasInk}
              canUndo={fillCanUndo}
              onEraser={() => toggleFillEraser()}
              onUndo={() => undoFillInk()}
              onClear={clearFillDrawing}
            />
          </div>
          <div className="fill-writing-grid">
            <canvas
              className={fillEraserActive ? "is-erasing" : undefined}
              ref={fillCanvasRef}
              onPointerDown={beginFillDrawing}
              onPointerMove={moveFillDrawing}
              onPointerUp={endFillDrawing}
              onPointerCancel={endFillDrawing}
              aria-label={`${favorite.character}注音手寫區`}
            />
          </div>
          <InkNotice erasing={fillEraserActive} notice={fillInkNotice} />
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
            {location} ·「{favorite.character}」
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
          <ReviewActions
            onCorrect={() => markFillFavoritePracticed(favorite)}
            onRetry={() => {
              setFillFavorites((current) =>
                current.map((item) =>
                  fillFavoriteKey(item) === fillFavoriteKey(favorite)
                    ? { ...item, status: "needs_rewrite" }
                    : item,
                ),
              );
              setFillPracticePhase("writing");
              setFillPracticeStrokes([]);
              setFillHasInk(false);
              setFillIsDirty(false);
            }}
          />
          <button
            type="button"
            className="fill-practice-defer"
            onClick={() => {
              app.deferFillPractice();
            }}
          >
            稍後再練
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
            <span className="fill-dialog-eyebrow">單題重練</span>
            <h2 id="practice-exit-title">這格還沒寫完</h2>
            <p id="practice-exit-description">
              現在離開會失去這次筆跡；收藏與待補強仍會保留，可以之後再練。
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
