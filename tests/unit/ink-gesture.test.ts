import test from "node:test";
import assert from "node:assert/strict";
import { PointerLease, appendSample } from "../../lib/ink/gesture";
import { readBoardDraft } from "../../lib/ink/free-board";

test("additional pointers never take over, even when they release first", () => {
  const lease = new PointerLease();
  assert.ok(lease.acquire(11));
  assert.equal(lease.acquire(12), false);
  assert.equal(lease.owns(12), false);
  assert.equal(lease.owns(11), true);
  assert.equal(lease.release(), 11);
  assert.ok(lease.acquire(13));
});
test("long strokes remain bounded and retain their endpoints", () => {
  const points = [0];
  for (let i = 1; i <= 20000; i++) appendSample(points, i, (a, b) => Math.abs(a - b), 0.5);
  assert.ok(points.length <= 1900);
  assert.equal(points[0], 0);
  assert.equal(points.at(-1), 20000);
});
test("legacy grid ink migrates once and never shifts when reopening at a new width", () => {
  const draft = readBoardDraft(
    { paper: "grid", strokes: [{ color: "#193458", erase: false, points: [[360, 1200]] }] },
    608,
  )!;
  assert.deepEqual(draft.strokes[0].points, [[304, 906]]);
  assert.deepEqual(readBoardDraft(draft, 304), draft);
});
test("damaged board drafts are rejected rather than overwritten", () => {
  assert.equal(
    readBoardDraft(
      { version: 2, width: 304, height: 1812, strokes: [{ color: "red", points: [[NaN, 2]] }] },
      304,
    ),
    null,
  );
});
