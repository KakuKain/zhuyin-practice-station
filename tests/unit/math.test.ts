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
import {
  answerOf,
  buildCompareRound,
  comparePromptIds,
  compareRoundSize,
  ground,
  needsLining,
  routeLength,
  routePoints,
  snapDistance,
  startLine,
  type CompareQuestion,
} from "../../features/math/compare-round";
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

const rounds = Array.from({ length: 200 }, () => buildCompareRound());
type BarQuestion = Extract<CompareQuestion, { kind: "compare" | "order" }>;

test("a 第二課 round walks 比長短, 比高矮, 排順序, 直線和曲線 and 哪條路最近 in order", () => {
  for (const round of rounds) {
    assert.equal(round.length, compareRoundSize);
    assert.deepEqual(
      round.map((question) =>
        question.kind === "compare" || question.kind === "order"
          ? `${question.kind}-${question.measure}-${needsLining(question) ? "apart" : "lined"}`
          : question.kind,
      ),
      [
        "compare-length-lined",
        "compare-length-apart",
        "compare-height-lined",
        "compare-height-apart",
        "order-length-lined",
        "order-height-lined",
        "line",
        "route",
      ],
    );
  }
});

test("things out of line mislead a child who skips lining them up, and all fit the picture", () => {
  for (const round of rounds) {
    for (const question of round.slice(0, 6) as BarQuestion[]) {
      const sizes = question.bars.map((bar) => bar.size);
      assert.equal(new Set(sizes).size, sizes.length);
      for (const bar of question.bars) {
        if (question.measure === "length") assert.ok(startLine + bar.offset + bar.size <= 97);
        else assert.ok(ground - bar.offset - bar.size >= 4);
      }
      if (!needsLining(question)) continue;
      const [big, small] = [...question.bars].sort((a, b) => b.size - a.size);
      if (question.measure === "length") {
        // Both pencils need moving, and the shorter one's tip reaches farther right.
        assert.ok(question.bars.every((bar) => bar.offset > snapDistance));
        assert.ok(small.offset + small.size > big.offset + big.size);
      } else {
        // The shorter child stands on a box and so looks taller.
        assert.equal(big.offset, 0);
        assert.ok(small.offset > snapDistance);
        assert.ok(small.offset + small.size > big.size);
      }
    }
  }
});

test("each 第二課 answer is the one a child should tap", () => {
  for (const round of rounds) {
    for (const question of round) {
      const answer = answerOf(question);
      if (question.kind === "compare") {
        const sizes = question.bars.map((bar) => bar.size);
        const pick = sizes[answer[0]];
        assert.equal(pick, question.ask === "more" ? Math.max(...sizes) : Math.min(...sizes));
      } else if (question.kind === "order") {
        const sizes = answer.map((index) => question.bars[index].size);
        assert.deepEqual(
          sizes,
          [...sizes].sort((a, b) => a - b),
        );
        assert.equal(new Set(answer).size, 3);
      } else if (question.kind === "line") {
        assert.equal(question.lines.length, 4);
        const matching = question.lines.filter(
          (line) => (line.shape === "straight") === (question.ask === "straight"),
        );
        assert.equal(matching.length, 1);
        assert.equal(question.lines[answer[0]], matching[0]);
      } else {
        // The straight road is the shortest, and every road stays inside the picture.
        const lengths = question.routes.map((route) =>
          routeLength(routePoints(question, route.shape)),
        );
        const shortest = Math.min(...lengths);
        assert.equal(lengths[answer[0]], shortest);
        assert.equal(lengths.filter((value) => value < shortest * 1.15).length, 1);
        for (const route of question.routes)
          for (const [, y] of routePoints(question, route.shape)) assert.ok(y > 4 && y < 96);
      }
    }
  }
});

test("every 第二課 instruction and both answers are read aloud from a shipped clip", () => {
  const ids = new Set(["correct", "retry"]);
  for (const round of rounds)
    for (const question of round) {
      const { lineUp, ask } = comparePromptIds(question);
      ids.add(ask);
      if (lineUp) ids.add(lineUp);
    }
  assert.ok(ids.has("align-length") && ids.has("align-height"));
  for (const id of ids) {
    assert.ok(mathPrompts[id], id);
    assert.ok(existsSync(`public/${mathPromptUrl(id).split("?")[0]}`), id);
  }
});
