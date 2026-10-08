import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InkPreview } from "../../components/AppChrome";
import { validInkStrokes, validateFillDraft } from "../../features/fill/fill-storage";
import type { InkStroke } from "../../features/types";
import { createInkBrush, inkOutline } from "../../lib/ink/ink-brush";
import { cloneInk, eraseInsideLasso, InkHistory } from "../../lib/ink/ink-path";

test("passive pens and fingers have immediate visible ink even with no pressure", () => {
  for (const size of [180, 300, 500]) {
    for (const pressure of [0, 0.5, 1]) {
      const brush = createInkBrush(size);
      const point = brush({ x: 20, y: 20 }, { pointerType: "touch", pressure, timeStamp: 0 });
      assert.ok((point.width! * size) / 100 >= 3.99); // relative widths round to 0.001
      const second = brush({ x: 21, y: 20 }, { pointerType: "touch", pressure, timeStamp: 16 });
      assert.ok(second.width! > 0);
    }
  }
});

test("slow touch handwriting is heavier than fast handwriting and ignores fake pressure", () => {
  const sample = (interval: number, pressure: number) => {
    const brush = createInkBrush(300);
    return Array.from({ length: 20 }, (_, i) =>
      brush({ x: 10 + i * 3, y: 40 }, { pointerType: "touch", pressure, timeStamp: i * interval }),
    );
  };
  const slow = sample(40, 0);
  const fast = sample(3, 0);
  assert.ok(slow.at(-1)!.width! > fast.at(-1)!.width! * 1.4);
  assert.deepEqual(slow, sample(40, 1));
  for (const point of [...slow, ...fast]) assert.ok(point.width! >= 1.17 && point.width! <= 2.52);
});

test("real pen pressure changes weight but zero pressure still produces ink", () => {
  const sample = (pressure: number) => {
    const brush = createInkBrush(300);
    return Array.from({ length: 12 }, (_, i) =>
      brush({ x: i + 10, y: 20 }, { pointerType: "pen", pressure, timeStamp: 16 * i }),
    ).at(-1)!;
  };
  assert.ok(sample(1).width! > sample(0.1).width!);
  assert.ok(sample(0).width! > 0);
  assert.ok(Number.isFinite(sample(NaN).width));
});

test("weighted ink survives save, clone, undo and shared review outlines", () => {
  const stroke: InkStroke = [
    { x: 20, y: 20, width: 1.4 },
    { x: 80, y: 70, width: 2.4 },
  ];
  const draft = validateFillDraft(
    JSON.parse(
      JSON.stringify({
        version: 1,
        lessonIndex: 0,
        savedAt: 1,
        strokes: { 0: [stroke] },
        pendingCells: {},
        needsRetry: [],
        reviewOpen: false,
      }),
    ),
    0,
    16,
  )!;
  const history = new InkHistory(cloneInk(draft.strokes[0]));
  history.commit([]);
  history.undo();
  assert.deepEqual(history.strokes, [stroke]);
  const outline = inkOutline(stroke);
  assert.ok(outline.length > 0);
  assert.doesNotMatch(outline, /NaN|Infinity/);
  assert.equal(inkOutline(history.strokes[0]), outline);
  const html = renderToStaticMarkup(createElement(InkPreview, { strokes: history.strokes }));
  assert.ok(html.includes(`d="${outline}"`));
  assert.match(html, /fill="#27463f"/);
  assert.ok(inkOutline([stroke[0]]).length > 0);
  assert.equal(inkOutline([]), "");
});

test("lasso keeps and interpolates widths at clipped boundaries without modifying legacy ink", () => {
  const stroke: InkStroke = [
    { x: 10, y: 50, width: 1 },
    { x: 90, y: 50, width: 3 },
  ];
  const box = [
    { x: 40, y: 40 },
    { x: 60, y: 40 },
    { x: 60, y: 60 },
    { x: 40, y: 60 },
  ];
  const result = eraseInsideLasso([stroke], box);
  assert.deepEqual(result, [
    [
      { x: 10, y: 50, width: 1 },
      { x: 40, y: 50, width: 1.75 },
    ],
    [
      { x: 60, y: 50, width: 2.25 },
      { x: 90, y: 50, width: 3 },
    ],
  ]);
  assert.equal(stroke[0].width, 1);
  assert.ok(validInkStrokes(result));
  assert.ok(validInkStrokes([[{ x: 20, y: 30 }]]));
});

test("invalid saved widths cannot enter the drawing renderer", () => {
  for (const width of [0, -1, NaN, Infinity, 11, "2", null]) {
    assert.equal(validInkStrokes([[{ x: 10, y: 10, width }]]), false);
  }
});
