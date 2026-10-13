import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import {
  additionRoundSize,
  buildAdditionRound,
  buildCountingRound,
  countIcons,
  filledCells,
  frameCells,
  isAnswered,
  joinIcons,
  workCells,
  mathRoundSize,
  newMathRound,
  validateMathRound,
} from "../../features/math/math-round";
import {
  isHan,
  mathPromptId,
  mathPromptReadings,
  mathPromptUrl,
  mathPromptVariants,
  mathPrompts,
} from "../../features/math/math-audio";
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
import { mathRoundStorageKey, ownsStorageKey, storageKeys } from "../../lib/storage/storage-keys";
import { childRecordKeys } from "../../lib/storage/child-profiles";

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

// Written by scripts/build-yo-fonts.py from the shipped KidLessonYoSans subset.
const annotated: Record<string, string> = JSON.parse(
  readFileSync("assets/font-sources/KidLessonYoSans-readings.json", "utf8"),
);

test("every math instruction shows the right zhuyin beside each character", () => {
  for (const [id, text] of Object.entries(mathPrompts)) {
    const readings = mathPromptReadings[id]?.split(" ") ?? [];
    const characters = Array.from(text);
    const han = characters.filter(isHan);
    assert.equal(readings.length, han.length, `${id}: one reading per character`);
    const variants = mathPromptVariants(id);
    let syllable = 0;
    characters.forEach((character, index) => {
      if (!isHan(character)) return;
      const glyph = character + (variants[index] ?? "");
      const reading = readings[syllable++];
      assert.ok(
        glyph in annotated,
        `${id}: ${character} is missing; run scripts/build-yo-fonts.py`,
      );
      assert.equal(annotated[glyph], reading, `${id}: ${character} should read ${reading}`);
    });
  }
  // 數一數 counts (ㄕㄨˇ), 數字 is a number (ㄕㄨˋ).
  assert.deepEqual(mathPromptVariants("count"), { 0: "\u{E01E1}", 2: "\u{E01E1}" });
});

test("a 第三課 round asks 4 合在一起, then 4 畫圈圈算加法, each with a different total", () => {
  for (let run = 0; run < 200; run++) {
    const round = buildAdditionRound();
    assert.deepEqual(
      round.map((question) => question.kind),
      [...Array(additionRoundSize.join).fill("join"), ...Array(additionRoundSize.add).fill("add")],
    );
    for (const kind of ["join", "add"]) {
      const part = round.filter((question) => question.kind === kind);
      const totals = part.map((question) => question.target);
      assert.equal(new Set(totals).size, totals.length);
    }
    for (const question of round) {
      if (question.kind !== "join" && question.kind !== "add") assert.fail(question.kind);
      const [a, b] = question.parts;
      assert.equal(a + b, question.target);
      assert.ok(a >= 1 && b >= 1 && question.target <= 10);
      if (question.kind === "join") {
        assert.ok(a <= 5 && b <= 5);
        assert.ok(joinIcons.includes(question.icon));
      } else assert.ok(question.target >= 3);
      // Each sum is spoken from its own clip and shown in 國字注音.
      const id = mathPromptId(question);
      assert.ok(mathPrompts[id] && mathPromptReadings[id], id);
      assert.ok(existsSync(`public/${mathPromptUrl(id).split("?")[0]}`), id);
    }
    const icons = round.flatMap((question) => (question.kind === "join" ? [question.icon] : []));
    assert.equal(new Set(icons).size, icons.length);
  }
  // 兩個 when counting things, 二 in a sum.
  assert.equal(mathPrompts["join-2-3"], "左邊有兩個，右邊有三個，合在一起有幾個？");
  assert.equal(mathPrompts["add-2-3"], "二加三等於多少？先畫圈圈，再寫答案。");
  assert.equal(newMathRound(3).questions[0].kind, "join");
  assert.equal(newMathRound(1).questions[0].kind, "count");
});

test("a saved 第三課 round keeps the circles in each number's 十格框", () => {
  const round = { ...newMathRound(3, 100), ink: { 4: [[{ x: 50, y: 50 }]] } };
  // Cells 0–9 are the first number's frame, 10–19 the second's.
  const cells = Array.from({ length: 20 }, () => [] as { x: number; y: number }[][]);
  cells[0] = [[{ x: 10, y: 10 }]];
  cells[12] = [[{ x: 20, y: 20 }], [{ x: 30, y: 30 }]];
  const work = { 4: cells };
  const restored = validateMathRound(JSON.parse(JSON.stringify({ ...round, work })))!;
  assert.deepEqual(restored.work, work);
  assert.equal(filledCells(restored.work[4], 0), 1);
  assert.equal(filledCells(restored.work[4], frameCells), 1);
  assert.deepEqual(restored.questions, round.questions);
  // A damaged drawing is dropped, and so are circles drawn freely before 十格框 (two areas).
  assert.deepEqual(validateMathRound({ ...round, work: { 4: [[{ x: "bad" }]] } })!.work, {});
  const freeDrawing = { 4: [[[{ x: 10, y: 10 }]], [[{ x: 20, y: 20 }]]] };
  assert.deepEqual(validateMathRound({ ...round, work: freeDrawing })!.work, {});
  const older: Partial<typeof round> = { ...round };
  delete older.work;
  assert.deepEqual(validateMathRound(older)!.work, {});
  const wrongSum = { ...round.questions[0], parts: [1, 1], target: 5 };
  assert.equal(validateMathRound({ ...round, questions: [wrongSum] }), null);
});

test("畫圈圈 draws one circle in each cell of a 十格框", () => {
  const round = newMathRound(1, 100);
  const draw = round.questions.findIndex((question) => question.kind === "draw");
  assert.equal(workCells(round.questions[draw]), frameCells);
  assert.equal(frameCells, 10);
  const cells = Array.from({ length: 10 }, (_, cell) => (cell < 3 ? [[{ x: 50, y: 50 }]] : []));
  const restored = validateMathRound({ ...round, work: { [draw]: cells } })!;
  assert.equal(filledCells(restored.work[draw]), 3);
  // A circle in the frame answers the question; an empty frame does not.
  assert.ok(isAnswered(restored, draw));
  assert.ok(!isAnswered({ ...restored, work: {} }, draw));
  // Ink drawn before the frame still counts, and is still shown to the parent.
  assert.ok(isAnswered({ ...restored, work: {}, ink: { [draw]: [[{ x: 1, y: 1 }]] } }, draw));
});

test("each math lesson keeps its own unfinished round, for every child", () => {
  assert.equal(mathRoundStorageKey(1), storageKeys.mathRound);
  assert.equal(mathRoundStorageKey(3), "kid-math-round-v1-3");
  for (const key of ["kid-math-round-v1-3", "kid-math-round-v1-3@k2"])
    assert.ok(ownsStorageKey(key));
  assert.ok(!ownsStorageKey("kid-math-round-v1-x"));
  const items = new Map([
    ["kid-math-round-v1-3@k2", "{}"],
    ["kid-math-round-v1@k2", "{}"],
    ["kid-math-round-v1-3", "{}"],
  ]);
  const storage = {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
  } as Storage;
  assert.deepEqual(childRecordKeys("k2", storage).sort(), [
    "kid-math-round-v1-3@k2",
    "kid-math-round-v1@k2",
  ]);
});
