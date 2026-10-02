"use client";

import type { AppController } from "../usePracticeApp";
import { LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
import { InkNotice, InkTools } from "../../components/InkTools";
import { FocusHeader } from "../../components/FocusHeader";
import { Check } from "@phosphor-icons/react";
import { FillPositionPeek } from "./FillPositionPeek";

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
    | "lessonLines"
    | "fillStrokes"
    | "fillPendingCells"
    | "fillDraftRef"
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
    lessonLines,
    fillStrokes,
    fillPendingCells,
    fillDraftRef,
  } = app;

  if (activeFillCell === null) return null;
  const lineIndex = fillLineForCell(activeFillCell);
  const position = activeFillCell - fillLineStarts[lineIndex] + 1;
  return (
    <main className="fill-focus-shell has-position-peek">
      {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      <FocusHeader
        onBack={leaveFillCell}
        backLabel="回到默寫"
        lessonIndex={selectedLesson}
        stage="課文默寫"
      />
      <div className="fill-focus-body">
        <ResourceNotice failed={resourceError} />
        <div className="fill-writing-intro">
          <div className="fill-writing-heading">
            <h1>寫出完整注音</h1>
            <span
              className="fill-writing-count"
              aria-label={`已寫 ${writtenCount} / ${lessonItems.length} 格`}
            >
              <strong>{writtenCount}</strong> / {lessonItems.length} 格
            </span>
          </div>
          <p id="fill-writing-hint">記得寫聲調，寫好後按「完成這格」。</p>
          <progress
            className="fill-writing-progress"
            value={writtenCount}
            max={lessonItems.length}
            aria-label="整課默寫完成進度"
          />
        </div>
        <section className="fill-writing-workspace" aria-label="注音書寫工作區">
          <div className="fill-writing-position">
            <div className="fill-writing-location">
              <span>正在寫</span>
              <strong>
                第 {lineIndex + 1} 行 · 第 {position} 格
              </strong>
            </div>
            <FillPositionPeek
              key={activeFillCell}
              compact
              lineLengths={lessonLines.map((line) => line.length)}
              activeCell={activeFillCell}
              strokes={fillStrokes}
              pending={fillPendingCells}
              readDraft={() => fillDraftRef.current}
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
              aria-describedby="fill-writing-hint"
              aria-label={`第 ${lineIndex + 1} 行第 ${position} 格手寫區`}
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
        </section>
        <InkNotice erasing={fillEraserActive} notice={fillInkNotice} />
        <div className="fill-writing-actions">
          <button
            type="button"
            className="fill-save-button"
            disabled={!fillHasInk}
            onClick={saveFillDrawing}
          >
            <Check size={22} weight="bold" aria-hidden="true" />
            完成這格
          </button>
        </div>
      </div>
    </main>
  );
}
