import test from "node:test";
import assert from "node:assert/strict";
import {
  PointerLease,
  appendSample,
  createContactMotion,
  isPalmContact,
  resumesContact,
} from "../../lib/ink/gesture";
import { InkHistory } from "../../lib/ink/ink-path";
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
test("capacitive tips and fingers with elongated contacts remain writable", () => {
  for (const [width, height] of [
    [1, 1],
    [30, 30],
    [140, 24],
    [24, 140],
  ])
    assert.equal(isPalmContact({ pointerType: "touch", width, height }), false);
});
test("only broad touch contacts are rejected as possible palms", () => {
  assert.equal(isPalmContact({ pointerType: "touch", width: 140, height: 120 }), true);
  for (const pointerType of ["pen", "mouse"])
    assert.equal(isPalmContact({ pointerType, width: 140, height: 120 }), false);
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

test("a pen that skips for a moment rejoins its stroke; a new stroke stays separate", () => {
  const motion = createContactMotion();
  // 1 px/ms to the right, then the pen loses the screen at x = 100.
  for (let t = 0; t <= 100; t += 10) motion.add(t, 50, 1000 + t);
  const end = motion.end(1100)!;
  assert.ok(Math.abs(end.speed - 1) < 0.01);
  // Back 60 ms later, 60 px further along: the same stroke.
  assert.equal(resumesContact(end, 160, 50, 1160), true);
  // A slow pen that touches down again on the spot.
  assert.equal(resumesContact({ ...end, speed: 0 }, 110, 55, 1150), true);
  // A child's next stroke: a pause, or a start away from where the pen was going.
  assert.equal(resumesContact(end, 160, 50, 1300), false);
  assert.equal(resumesContact(end, 100, 180, 1150), false);
  assert.equal(resumesContact(end, 100, 50, 1090), false);
  assert.equal(resumesContact(null, 100, 50, 1100), false);
});

test("samples with near-identical timestamps never claim a fast pen", () => {
  const motion = createContactMotion();
  motion.add(0, 0, 500);
  motion.add(300, 0, 500.5);
  motion.add(600, 0, 501);
  assert.equal(motion.end(502)!.speed, 0);
});

test("amending replaces the strokes without adding an undo step", () => {
  const piece = [{ x: 1, y: 1 }];
  const history = new InkHistory();
  history.commit([piece]);
  const joined = [...piece, { x: 5, y: 5 }];
  assert.equal(history.amend([joined]), true);
  assert.deepEqual(history.strokes, [joined]);
  assert.equal(history.undo(), true);
  assert.deepEqual(history.strokes, []);
  assert.equal(history.canUndo, false);
});
