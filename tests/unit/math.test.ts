import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import {
  buildCountingRound,
  countIcons,
  mathRoundSize,
  newMathRound,
  validateMathRound,
} from "../../features/math/math-round";
import { mathPromptId, mathPromptUrl, mathPrompts } from "../../features/math/math-audio";
import { ownsStorageKey, storageKeys } from "../../lib/storage/storage-keys";

test("a 第一課 round counts 4 numbers and draws 4, each from 1 to 10 without repeats", () => {
  for (let run = 0; run < 50; run++) {
    const round = buildCountingRound();
    const count = round.filter((question) => question.kind === "count");
    const draw = round.filter((question) => question.kind === "draw");
    assert.equal(count.length, mathRoundSize.count);
    assert.equal(draw.length, mathRoundSize.draw);
    // Counting comes first, then drawing, so the two parts never interleave.
    assert.deepEqual(
      round.map((question) => question.kind),
      [...count, ...draw].map((question) => question.kind),
    );
    for (const part of [count, draw]) {
      const targets = part.map((question) => question.target);
      assert.equal(new Set(targets).size, targets.length);
      assert.ok(targets.every((target) => target >= 1 && target <= 10));
    }
    const icons = count.map((question) => question.kind === "count" && question.icon);
    assert.equal(new Set(icons).size, icons.length);
  }
});

test("every instruction a round can ask is read aloud from a shipped clip", () => {
  const ids = new Set(["count", ...Array.from({ length: 10 }, (_, index) => `draw-${index + 1}`)]);
  for (const question of buildCountingRound()) ids.add(mathPromptId(question));
  for (const id of ids) {
    assert.ok(mathPrompts[id], id);
    const path = mathPromptUrl(id).split("?")[0];
    assert.ok(existsSync(`public/${path}`), path);
  }
  assert.equal(mathPrompts["draw-2"], "畫出兩個圈圈。");
});

test("a saved round survives a reload, and a damaged one is dropped", () => {
  const round = {
    ...newMathRound(1, 100),
    index: 2,
    ink: {
      0: [[{ x: 10, y: 20 }]],
      99: [[{ x: 1, y: 1 }]],
      1: [[{ x: "bad", y: 1 }]],
    },
    needsPractice: [1, 42],
  };
  const restored = validateMathRound(JSON.parse(JSON.stringify(round)))!;
  assert.equal(restored.index, 2);
  assert.deepEqual(Object.keys(restored.ink), ["0"]);
  assert.deepEqual(restored.needsPractice, [1]);
  assert.equal(restored.createdAt, 100);
  assert.equal(validateMathRound({ ...round, questions: [{ kind: "count", target: 3 }] }), null);
  assert.equal(validateMathRound({ ...round, version: 2 }), null);
  assert.ok(countIcons.length >= mathRoundSize.count);
});

test("math records belong to each child and are included in device backup", () => {
  for (const key of [storageKeys.mathRound, storageKeys.mathRecords]) {
    assert.ok(ownsStorageKey(key));
    assert.ok(ownsStorageKey(`${key}@k2`));
  }
});
