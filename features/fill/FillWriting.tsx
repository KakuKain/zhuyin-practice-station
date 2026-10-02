"use client";

import type { AppController } from "../usePracticeApp";
import { LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
import { InkNotice, InkTools } from "../../components/InkTools";
import { FocusHeader } from "../../components/FocusHeader";
import { courseArtwork } from "../courses/course-data";

export function FillWriting({
  app,
}: {
  app: Pick<
    AppController,
    | "activeFillCell"
    | "beginFillDrawing"
    | "clearFillDrawing"
    | "fillEraserActive"
    | "fillCanUndo"
    | "fillInkNotice"
    | "toggleFillEraser"
    | "undoFillInk"
    | "endFillDrawing"
    | "fillCanvasRef"
    | "fillHasInk"
    | "fillLineForCell"
    | "fillLineStarts"
    | "leaveFillCell"
    | "lessonItems"
    | "loadingMessage"
    | "resourceError"
    | "moveFillDrawing"
    | "saveFillDrawing"
    | "selectedLesson"
    | "writtenCount"
  >;
}) {
  const {
    activeFillCell,
    beginFillDrawing,
    clearFillDrawing,
    fillEraserActive,
    fillCanUndo,
    fillInkNotice,
    toggleFillEraser,
    undoFillInk,
    endFillDrawing,
    fillCanvasRef,
    fillHasInk,
    fillLineForCell,
    fillLineStarts,
    leaveFillCell,
    lessonItems,
    loadingMessage,
    resourceError,
    moveFillDrawing,
    saveFillDrawing,
    selectedLesson,
    writtenCount,
  } = app;

  if (activeFillCell === null) return null;
  const lineIndex = fillLineForCell(activeFillCell);
  const position = activeFillCell - fillLineStarts[lineIndex] + 1;
  return (
    <main className="fill-focus-shell">
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <FocusHeader
        onBack={leaveFillCell}
        backLabel="回到默寫"
        lessonIndex={selectedLesson}
        stage="課文默寫"
        progress={`第 ${lineIndex + 1} 行 · 第 ${position} 格`}
        status={
          <span>
            已寫 {writtenCount} / {lessonItems.length} 格
          </span>
        }
      />
      <div className="fill-focus-body">
        <ResourceNotice failed={resourceError} />
        <div className="fill-focus-intro">
          <div>
            <h1>寫出完整注音</h1>
            <p>記得寫聲調，寫好後按「完成這格」。</p>
          </div>
          <img
            src={
              selectedLesson === 7
                ? "/course-art/radish-story.webp"
                : `/course-art/${courseArtwork[selectedLesson]}-watercolor.webp`
            }
            alt=""
          />
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
            aria-label={`第 ${lineIndex + 1} 行第 ${position} 格手寫區`}
          />
        </div>
        <InkNotice erasing={fillEraserActive} notice={fillInkNotice} />
        <div className="fill-writing-actions">
          <button
            type="button"
            className="fill-save-button"
            disabled={!fillHasInk}
            onClick={saveFillDrawing}
          >
            完成這格
          </button>
        </div>
      </div>
    </main>
  );
}
