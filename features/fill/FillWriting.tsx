"use client";

import type { AppController } from "../usePracticeApp";
import { LoadingOverlay } from "../../components/AppChrome";
import { ArrowLeft, Eraser } from "@phosphor-icons/react";
import { courseArtwork } from "../courses/course-data";

export function FillWriting({
  app,
}: {
  app: Pick<
    AppController,
    | "activeFillCell"
    | "beginFillDrawing"
    | "clearFillDrawing"
    | "endFillDrawing"
    | "fillCanvasRef"
    | "fillHasInk"
    | "fillLineForCell"
    | "fillLineStarts"
    | "leaveFillCell"
    | "lesson"
    | "lessonItems"
    | "lessonNumber"
    | "loadingMessage"
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
    endFillDrawing,
    fillCanvasRef,
    fillHasInk,
    fillLineForCell,
    fillLineStarts,
    leaveFillCell,
    lesson,
    lessonItems,
    lessonNumber,
    loadingMessage,
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
      <header className="fill-focus-header">
        <button type="button" onClick={leaveFillCell}>
          <ArrowLeft size={19} aria-hidden="true" /> 回到課文
        </button>
        <strong>
          第 {lineIndex + 1} 行 · 第 {position} 格
        </strong>
        <span>
          {writtenCount} / {lessonItems.length}
        </span>
      </header>
      <div className="fill-focus-body">
        <div className="fill-focus-intro">
          <div>
            <span className="writing-kicker">
              第{lessonNumber}課 · {lesson.title}
            </span>
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
            aria-label={`第 ${lineIndex + 1} 行第 ${position} 格手寫區`}
          />
        </div>
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
