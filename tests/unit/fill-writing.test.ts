import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FillWriting } from "../../features/fill/FillWriting";
import { exercises } from "../../features/courses/course-data";

function writingApp(lessonIndex = 0): ComponentProps<typeof FillWriting>["app"] {
  const lessonLines = exercises[lessonIndex].lines;
  const lessonItems = lessonLines.flat();
  const fillLineStarts = lessonLines.map((_, index) =>
    lessonLines.slice(0, index).reduce((sum, line) => sum + line.length, 0),
  );
  return {
    activeFillCell: lessonItems.length - 1,
    selectedLesson: lessonIndex,
    writtenCount: 0,
    lessonLines,
    lessonItems,
    fillLineStarts,
    fillLineForCell: () => lessonLines.length - 1,
    fillCanvasRef: { current: null },
    fillDraftRef: { current: [] },
    fillStrokes: {},
    fillPendingCells: {},
    fillHasInk: false,
    fillCanUndo: false,
    fillEraserActive: false,
    fillInkNotice: "",
    loadingMessage: null,
    resourceError: false,
    beginFillDrawing() {},
    moveFillDrawing() {},
    endFillDrawing() {},
    toggleFillEraser() {},
    undoFillInk() {},
    clearFillDrawing() {},
    leaveFillCell() {},
    saveFillDrawing() {},
  };
}

test("writing workspace keeps location and tools outside the square in every lesson", () => {
  for (const lessonIndex of Object.keys(exercises).map(Number)) {
    const app = writingApp(lessonIndex);
    const html = renderToStaticMarkup(createElement(FillWriting, { app }));
    assert.equal((html.match(/<canvas/g) ?? []).length, 1);
    assert.match(html, /<progress[^>]+aria-label="整課默寫完成進度"/);
    assert.match(html, /class="fill-position-peek is-compact"/);
    assert.match(html, /id="position-peek-help" class="visually-hidden"/);
    assert.doesNotMatch(html, /fill-writing-hint/);
    assert.ok(html.indexOf("fill-position-peek") < html.indexOf("</header>"));
    assert.match(html, /<\/canvas><\/div><div class="fill-canvas-tools"/);
    assert.ok(html.indexOf("fill-writing-position") < html.indexOf("<canvas"));
    const workspace = html.match(/<section[^>]+fill-writing-workspace[\s\S]*?<\/section>/)![0];
    assert.doesNotMatch(workspace, /[\u3105-\u3129]/);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /class="fill-save-button" disabled=""/);
  }
});

test("writing completion and eraser state still follow the current ink", () => {
  const app = { ...writingApp(), fillHasInk: true, fillCanUndo: true, fillEraserActive: true };
  const html = renderToStaticMarkup(createElement(FillWriting, { app }));
  assert.match(html, /class="is-erasing"/);
  assert.match(html, /class="ink-tool ink-eraser is-active"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /圈住想擦掉的地方/);
  assert.doesNotMatch(html, /disabled=""/);
});
