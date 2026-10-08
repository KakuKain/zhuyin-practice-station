import assert from "node:assert/strict";
import test from "node:test";
import { cloneInk, eraseInsideLasso, InkHistory, isUsableLasso } from "../../lib/ink/ink-path";
import type { InkPoint, InkStroke } from "../../features/types";
import { validateFillDraft } from "../../features/fill/fill-storage";
import { isFillCellComplete, shouldCaptureFillCell } from "../../features/fill/fill-draft-policy";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InkTools } from "../../components/InkTools";

const point = (x: number, y: number): InkPoint => ({ x, y });
const box = [point(40, 40), point(60, 40), point(60, 60), point(40, 60)];
const line: InkStroke[] = [[point(10, 50), point(90, 50)]];

test("lasso splits a crossing stroke at exact boundaries, even with no sample inside", () => {
  assert.deepEqual(eraseInsideLasso(line, box), [
    [point(10, 50), point(40, 50)],
    [point(60, 50), point(90, 50)],
  ]);
  assert.deepEqual(line, [[point(10, 50), point(90, 50)]]);
});
test("lasso erases enclosed strokes and dots, keeping unrelated dots and strokes", () => {
  const outside = [point(5, 5), point(20, 20)];
  assert.deepEqual(
    eraseInsideLasso(
      [[point(45, 45), point(55, 55)], [point(50, 50)], [point(10, 10)], outside],
      box,
    ),
    [[point(10, 10)], outside],
  );
});
test("unchanged and degenerate selections retain identity and do not erase", () => {
  for (const polygon of [
    [],
    [point(10, 10)],
    [point(10, 10), point(90, 90), point(10, 10)],
    [point(1, 1), point(2, 1), point(2, 2)],
    [point(0, 0), point(20, 0), point(20, 20), point(0, 20)],
  ]) {
    assert.equal(eraseInsideLasso(line, polygon), line);
  }
  assert.equal(isUsableLasso(box), true);
});
test("partial endpoints, boundary strokes and repeated points are handled", () => {
  assert.deepEqual(eraseInsideLasso([[point(50, 50), point(80, 50)]], box), [
    [point(60, 50), point(80, 50)],
  ]);
  assert.deepEqual(eraseInsideLasso([[point(10, 40), point(90, 40)]], box), [
    [point(10, 40), point(40, 40)],
    [point(60, 40), point(90, 40)],
  ]);
  assert.deepEqual(eraseInsideLasso([[point(50, 50), point(50, 50)]], box), []);
});
test("a stroke that enters and exits multiple times keeps every outside fragment", () => {
  const zigzag = [[point(10, 45), point(90, 45), point(90, 55), point(10, 55)]];
  assert.deepEqual(eraseInsideLasso(zigzag, box), [
    [point(10, 45), point(40, 45)],
    [point(60, 45), point(90, 45), point(90, 55), point(60, 55)],
    [point(40, 55), point(10, 55)],
  ]);
});
test("concave loops clip separated interior intervals; loop direction does not matter", () => {
  const polygon = [
    point(30, 30),
    point(70, 30),
    point(70, 70),
    point(60, 70),
    point(60, 40),
    point(40, 40),
    point(40, 70),
    point(30, 70),
  ];
  const expected = [
    [point(10, 50), point(30, 50)],
    [point(40, 50), point(60, 50)],
    [point(70, 50), point(90, 50)],
  ];
  assert.deepEqual(eraseInsideLasso(line, polygon), expected);
  assert.deepEqual(eraseInsideLasso(line, [...polygon].reverse()), expected);
});
test("per-cell undo restores strokes, partial erasing and clears without changing other cells", () => {
  const first = new InkHistory();
  const second = new InkHistory(cloneInk(line));
  first.commit(cloneInk(line));
  first.commit(eraseInsideLasso(first.strokes, box));
  first.commit([]);
  assert.equal(first.canUndo, true);
  first.undo();
  assert.equal(first.strokes.length, 2);
  first.undo();
  assert.deepEqual(first.strokes, line);
  first.undo();
  assert.deepEqual(first.strokes, []);
  assert.equal(first.undo(), false);
  assert.deepEqual(second.strokes, line);
  assert.equal(second.canUndo, false);
});
test("undo history is bounded and a no-op lasso consumes no step", () => {
  const history = new InkHistory([], 2);
  history.commit(cloneInk(line));
  assert.equal(history.commit(eraseInsideLasso(history.strokes, [])), false);
  history.commit([[point(1, 1)]]);
  history.commit([]);
  assert.equal(history.undo(), true);
  assert.equal(history.undo(), true);
  assert.equal(history.undo(), false);
  assert.deepEqual(history.strokes, line);
});
test("clipped strokes and explicit empty drafts keep the existing v1 storage shape", () => {
  const draft = validateFillDraft(
    {
      version: 1,
      lessonIndex: 0,
      savedAt: 1,
      strokes: { 0: line },
      pendingCells: { 0: [], 1: eraseInsideLasso(line, box) },
      needsRetry: [],
      reviewOpen: false,
    },
    0,
    14,
  );
  assert.ok(draft);
  assert.deepEqual(draft.pendingCells[0], []);
  assert.equal(draft.pendingCells[1].length, 2);
});
test("ink tools expose separate pressed eraser, undo and clear controls", () => {
  const html = renderToStaticMarkup(
    createElement(InkTools, {
      erasing: true,
      hasInk: true,
      canUndo: true,
      cellLabel: "語詞第 1 字",
      compact: true,
      onEraser() {},
      onUndo() {},
      onClear() {},
    }),
  );
  assert.match(html, /aria-label="圈選擦除語詞第 1 字" aria-pressed="true"/);
  assert.match(html, /aria-label="復原語詞第 1 字筆跡"/);
  assert.match(html, /aria-label="清空語詞第 1 字"/);
});

test("cleared or edited saved cells remain unfinished until submitted again", () => {
  assert.equal(isFillCellComplete(0, { 0: line }, {}), true);
  assert.equal(isFillCellComplete(0, { 0: line }, { 0: [] }), false);
  assert.equal(isFillCellComplete(0, { 0: line }, { 0: eraseInsideLasso(line, box) }), false);
  assert.equal(isFillCellComplete(1, { 0: line }, {}), false);
});

test("fragmented drafts above the old 200 stroke limit still validate", () => {
  const fragments = Array.from({ length: 210 }, () => eraseInsideLasso(line, box)).flat();
  const draft = validateFillDraft(
    {
      version: 1,
      lessonIndex: 0,
      savedAt: 1,
      strokes: {},
      pendingCells: { 0: fragments },
      needsRetry: [],
      reviewOpen: false,
    },
    0,
    14,
  );
  assert.equal(draft?.pendingCells[0].length, 420);
});

test("ink tool clicks never pass mouse events as a cell index", () => {
  const received: unknown[][] = [];
  const collect = (...args: unknown[]) => {
    received.push(args);
  };
  const element = InkTools({
    erasing: false,
    hasInk: true,
    canUndo: true,
    onEraser: collect,
    onUndo: collect,
    onClear: collect,
  });
  const buttons = element.props.children as { props: { onClick: (event: unknown) => void } }[];
  for (const button of buttons) button.props.onClick({ type: "click" });
  assert.deepEqual(received, [[], [], []]);
});

test("draft capture preserves erased cells without inventing untouched blank drafts", () => {
  assert.equal(shouldCaptureFillCell(0, [], {}, {}), false);
  assert.equal(shouldCaptureFillCell(0, line, {}, {}), true);
  assert.equal(shouldCaptureFillCell(0, [], { 0: line }, {}), true);
  assert.equal(shouldCaptureFillCell(0, [], {}, { 0: [] }), true);
});

test("reopening a completed cell without edits does not turn it into pending work", () => {
  const reopened = line.map((stroke) => stroke.map((p) => ({ ...p })));
  assert.equal(shouldCaptureFillCell(0, reopened, { 0: line }, {}), false);
  assert.equal(isFillCellComplete(0, { 0: line }, {}), true);
  const edited = [...reopened, [point(20, 20), point(80, 80)]];
  assert.equal(shouldCaptureFillCell(0, edited, { 0: line }, {}), true);
});
