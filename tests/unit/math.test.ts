import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import {
  additionRoundSize,
  bondRoundSize,
  buildAdditionRound,
  buildBondRound,
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
  mathPromptSpeech,
  mathPromptUrl,
  mathPromptVariants,
  mathPrompts,
} from "../../features/math/math-audio";
import {
  mathCourse,
  mathLessons,
  mathTerms,
  mathWord,
  mathWordReadings,
} from "../../features/math/math-lessons";
import {
  buildSequenceRound,
  inAnyOrder,
  sameChoice,
  sequenceAnswer,
  sequencePromptId,
  sequenceRoundSize,
} from "../../features/math/sequence-round";
import {
  answerOf,
  buildCompareRound,
  comparePromptIds,
  compareRoundSize,
  ground,
  needsLining,
  palette,
  routeLength,
  routePoints,
  snapDistance,
  startLine,
  type CompareQuestion,
} from "../../features/math/compare-round";
import { mathRoundStorageKey, ownsStorageKey, storageKeys } from "../../lib/storage/storage-keys";
import kidPictures from "../../features/math/kid-pictures.json";
import { childRecordKeys } from "../../lib/storage/child-profiles";

test("a 第一課 round counts 1–5 twice, 6–10 twice and an empty basket, then draws 4", () => {
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
    // 認識 1～5, 認識 6～10, then 認識 0, as in the textbook.
    const counted = count.map((question) => question.target);
    assert.ok(counted.slice(0, 2).every((target) => target >= 1 && target <= 5));
    assert.ok(counted.slice(2, 4).every((target) => target >= 6 && target <= 10));
    assert.equal(counted[4], 0);
    assert.equal(new Set(counted).size, counted.length);
    const drawn = draw.map((question) => question.target);
    assert.equal(new Set(drawn).size, drawn.length);
    assert.ok(drawn.every((target) => target >= 1 && target <= 10));
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
type BarQuestion = Extract<CompareQuestion, { kind: "compare" }>;

test("a 第二課 比長短 round walks 比長短, 比高矮、比厚薄, then 直線和曲線 with 哪條路最近", () => {
  for (const round of rounds) {
    assert.equal(round.length, compareRoundSize);
    assert.deepEqual(
      round.map((question) =>
        question.kind === "compare"
          ? `${question.kind}-${question.measure}-${needsLining(question) ? "apart" : "lined"}`
          : question.kind,
      ),
      [
        "compare-length-lined",
        "compare-length-apart",
        "compare-height-lined",
        "compare-height-apart",
        "thickness",
        "line",
        "route",
      ],
    );
  }
});

test("things out of line mislead a child who skips lining them up, and all fit the picture", () => {
  for (const round of rounds) {
    for (const question of round.slice(0, 4) as BarQuestion[]) {
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
      } else if (question.kind === "thickness") {
        // Two books on the shelf, clearly apart in thickness.
        const sizes = question.books.map((book) => book.size);
        assert.equal(sizes.length, 2);
        assert.ok(Math.abs(sizes[0] - sizes[1]) >= 8);
        assert.ok(sizes.every((size) => size >= 7 && size <= 30));
        const pick = sizes[answer[0]];
        assert.equal(pick, question.ask === "more" ? Math.max(...sizes) : Math.min(...sizes));
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

test("a saved 加法 round keeps the circles in each number's 十格框, and 0的加法 adds 0", () => {
  const fresh = newMathRound(3, 100);
  const add = fresh.questions.findIndex(
    (question) => question.kind === "add" && !question.parts.includes(0),
  );
  assert.equal(add, 5);
  const round = { ...fresh, ink: { [add]: [[{ x: 50, y: 50 }]] } };
  // Cells 0–9 are the first number's frame, 10–19 the second's.
  const cells = Array.from({ length: 20 }, () => [] as { x: number; y: number }[][]);
  cells[0] = [[{ x: 10, y: 10 }]];
  cells[12] = [[{ x: 20, y: 20 }], [{ x: 30, y: 30 }]];
  const work = { [add]: cells };
  const restored = validateMathRound(JSON.parse(JSON.stringify({ ...round, work })))!;
  assert.deepEqual(restored.work, work);
  assert.equal(filledCells(restored.work[add], 0), 1);
  assert.equal(filledCells(restored.work[add], frameCells), 1);
  assert.deepEqual(restored.questions, round.questions);
  // A damaged drawing is dropped, and so are circles drawn freely before 十格框 (two areas).
  assert.deepEqual(validateMathRound({ ...round, work: { [add]: [[{ x: "bad" }]] } })!.work, {});
  const freeDrawing = { [add]: [[[{ x: 10, y: 10 }]], [[{ x: 20, y: 20 }]]] };
  assert.deepEqual(validateMathRound({ ...round, work: freeDrawing })!.work, {});
  const older: Partial<typeof round> = { ...round };
  delete older.work;
  assert.deepEqual(validateMathRound(older)!.work, {});
  const wrongSum = { ...round.questions[0], parts: [1, 1], target: 5 };
  assert.equal(validateMathRound({ ...round, questions: [wrongSum] }), null);
  // Only 0的加法 has a 0: a picture group or a 分合圖 part never does.
  const withZero = (kind: string) => ({
    ...round,
    questions: [{ ...round.questions[0], kind, parts: [3, 0], target: 3 }],
  });
  assert.ok(validateMathRound(withZero("add")));
  assert.equal(validateMathRound(withZero("join")), null);
  assert.equal(validateMathRound(withZero("split")), null);
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

test("the math course cards, lesson pages and practice screens show every word in 國字注音", () => {
  const shown = [
    "數學",
    ...mathTerms.map((term) => term.name),
    // Every lesson in the textbook is on the course list, made or not.
    ...mathCourse.flatMap((lesson) => [lesson.number, lesson.title]),
    ...mathLessons.flatMap((lesson) => lesson.parts),
    ...["這一課", "開始", "開始練習", "從頭開始", "繼續", "繼續練習", "第", "題", "多畫了", "個"],
    ...["一樣多", "左邊", "右邊"],
  ];
  for (const text of shown) {
    assert.ok(mathWordReadings[text], `${text} needs its readings`);
    const readings = mathWordReadings[text].split(" ");
    const characters = Array.from(text);
    assert.equal(readings.length, characters.filter(isHan).length, `${text}: one per character`);
    const { variants } = mathWord(text);
    let syllable = 0;
    characters.forEach((character, index) => {
      if (!isHan(character)) return;
      const glyph = character + (variants[index] ?? "");
      assert.ok(glyph in annotated, `${text}: ${character} is missing from the font`);
      assert.equal(annotated[glyph], readings[syllable++], `${text}: ${character}`);
    });
  }
  // Each lesson page says how many questions a round has.
  // Listed in the textbook's order: 第三課 is id 7, 第七課 is id 3.
  const sizes = [
    mathRoundSize,
    compareRoundSize,
    sequenceRoundSize,
    bondRoundSize,
    additionRoundSize,
  ].map((size) =>
    typeof size === "number" ? size : Object.values(size).reduce((sum, n) => sum + n, 0),
  );
  assert.deepEqual(
    mathLessons.map((lesson) => lesson.questions),
    sizes,
  );
});

test("a 分與合 round reads 分合圖: 分一分 and 合一合 under 10, then 10的分與合", () => {
  for (let run = 0; run < 200; run++) {
    const round = buildBondRound();
    assert.deepEqual(
      round.map((question) => question.kind),
      [
        ...Array(bondRoundSize.split).fill("split"),
        ...Array(bondRoundSize.combine).fill("combine"),
        "split",
        "combine",
        "ways",
      ],
    );
    const tens = round.slice(-bondRoundSize.ten);
    assert.ok(tens.every((question) => question.target === 10));
    for (const kind of ["split", "combine"]) {
      const totals = round
        .slice(0, -bondRoundSize.ten)
        .filter((question) => question.kind === kind)
        .map((question) => question.target);
      assert.equal(new Set(totals).size, totals.length, kind);
      assert.ok(
        totals.every((total) => total >= 3 && total < 10),
        kind,
      );
    }
    for (const question of round) {
      if (question.kind === "split") {
        const [given, answer] = question.parts;
        assert.ok(given >= 1 && answer >= 1 && given + answer === question.target);
      } else if (question.kind === "combine") {
        const [a, b] = question.parts;
        assert.ok(a >= 1 && b >= 1 && a + b === question.target);
        if (question.target < 10) assert.ok(a <= 5 && b <= 5);
      } else if (question.kind !== "ways") assert.fail(question.kind);
      // Every question is spoken from its own clip and shown in 國字注音.
      const id = mathPromptId(question);
      assert.ok(mathPrompts[id] && mathPromptReadings[id], id);
      assert.ok(existsSync(`public/${mathPromptUrl(id).split("?")[0]}`), id);
    }
    // Each 分一分 (and 分分看) has its own pictures, and so does each 合一合.
    for (const kinds of [["split", "ways"], ["combine"]]) {
      const pictures = round.flatMap((question) =>
        kinds.includes(question.kind) && "icon" in question ? [question.icon] : [],
      );
      assert.equal(new Set(pictures).size, pictures.length, kinds.join());
    }
  }
  assert.equal(newMathRound(4).questions[0].kind, "split");
  assert.equal(newMathRound(1).questions[0].kind, "count");
  // 和 reads ㄏㄢˋ beside the prompt, so Meijia is given the homophone 漢.
  assert.equal(mathPrompts["split-3-4"], "七可以分成三和幾？");
  assert.equal(mathPromptSpeech("split-3-4"), "七可以分成三漢幾？");
  assert.equal(mathPromptSpeech("count"), mathPrompts.count);
});

test("a 第七課 10以內的加法 round asks 合起來是多少, 0的加法, then 加加看, with different totals", () => {
  for (let run = 0; run < 200; run++) {
    const round = buildAdditionRound();
    const zero = round.filter((question) => "parts" in question && question.parts.includes(0));
    assert.deepEqual(
      round.map((question) => question.kind),
      [
        ...Array(additionRoundSize.join).fill("join"),
        ...Array(additionRoundSize.zero + additionRoundSize.add).fill("add"),
      ],
    );
    // 0的加法 comes right after 合起來是多少: a number and 0, then 0 and a number.
    assert.deepEqual(
      zero.map((question) => round.indexOf(question)),
      [additionRoundSize.join, additionRoundSize.join + 1],
    );
    for (const question of round) {
      if (question.kind !== "join" && question.kind !== "add") assert.fail(question.kind);
      const [a, b] = question.parts;
      assert.equal(a + b, question.target);
      assert.ok(question.target >= 1 && question.target <= 10);
      if (question.kind === "join") {
        assert.ok(a >= 1 && b >= 1 && a <= 5 && b <= 5);
        assert.ok(joinIcons.includes(question.icon));
      } else if (!zero.includes(question)) assert.ok(a >= 1 && b >= 1 && question.target >= 3);
      const id = mathPromptId(question);
      assert.ok(mathPrompts[id] && mathPromptReadings[id], id);
      assert.ok(existsSync(`public/${mathPromptUrl(id).split("?")[0]}`), id);
    }
    for (const part of [round.slice(0, 3), round.slice(5)]) {
      const totals = part.map((question) => question.target);
      assert.equal(new Set(totals).size, totals.length);
    }
  }
  // 兩個 when counting things, 二 in a sum, and 零 for nothing.
  assert.equal(mathPrompts["join-2-3"], "左邊有兩個，右邊有三個，合在一起有幾個？");
  assert.equal(mathPrompts["add-2-3"], "二加三等於多少？先畫圈圈，再寫答案。");
  assert.equal(mathPrompts["add-3-0"], "三加零等於多少？先畫圈圈，再寫答案。");
  assert.equal(newMathRound(3).questions[0].kind, "join");
});

test("a saved 分與合 round keeps 分分看's two numbers, and needs both to count as answered", () => {
  const round = newMathRound(4);
  const ways = round.questions.findIndex((question) => question.kind === "ways");
  const stroke = [[{ x: 10, y: 10 }]];
  const both = validateMathRound(
    JSON.parse(JSON.stringify({ ...round, work: { [ways]: [stroke, stroke] } })),
  )!;
  assert.equal(both.questions[ways].kind, "ways");
  assert.ok(isAnswered(both, ways));
  assert.ok(!isAnswered({ ...both, work: { [ways]: [stroke, []] } }, ways));
  // The wrong number of squares is dropped rather than misread.
  assert.deepEqual(validateMathRound({ ...round, work: { [ways]: [stroke] } })!.work, {});
  // 分一分 and 合一合 keep their answer as the question's ink.
  assert.ok(isAnswered({ ...both, ink: { 0: stroke } }, 0));
  assert.ok(!isAnswered(both, 0));
  // A 分一分 whose parts do not make its total is not restored.
  const broken = { ...round.questions[0], parts: [1, 1] };
  assert.equal(validateMathRound({ ...round, questions: [broken] }), null);
});

test("a 第三課 round walks 排數字, 排在第幾個, 第幾個和幾個 and 比多少, each answer the right tap", () => {
  let same = 0;
  for (let run = 0; run < 300; run++) {
    const round = buildSequenceRound();
    assert.equal(round.length, sequenceRoundSize);
    assert.deepEqual(
      round.map((question) => question.kind),
      ["missing", "sequence", "position", "position", "group", "nth", "rows", "rows"],
    );
    for (const question of round) {
      const answer = sequenceAnswer(question);
      // Every instruction has its clip and its 國字注音.
      const id = sequencePromptId(question);
      assert.ok(mathPrompts[id] && mathPromptReadings[id], id);
      assert.ok(existsSync(`public/${mathPromptUrl(id).split("?")[0]}`), id);
      if (question.kind === "position") {
        const count = question.icons.length;
        assert.ok(count >= 6 && count <= 7 && new Set(question.icons).size === count);
        assert.ok(question.place >= 2 && question.place < count);
        const fromLeft = answer[0] + 1;
        assert.equal(question.from === "left" ? fromLeft : count - answer[0], question.place);
      } else if (question.kind === "missing") {
        const steps = question.numbers
          .slice(1)
          .map((value, index) => value - question.numbers[index]);
        assert.ok(steps.every((step) => step === steps[0] && Math.abs(step) === 1));
        assert.ok(question.numbers.every((value) => value >= 1 && value <= 10));
        assert.ok(question.gap >= 1 && question.gap <= 3);
        assert.equal(new Set(question.choices).size, 3);
        assert.equal(question.choices[answer[0]], question.numbers[question.gap]);
        // The other cards are numbers not on show.
        for (const value of question.choices)
          if (value !== question.numbers[question.gap])
            assert.ok(!question.numbers.includes(value));
      } else if (question.kind === "sequence") {
        assert.equal(new Set(question.numbers).size, 5);
        const values = answer.map((index) => question.numbers[index]);
        assert.deepEqual(
          values,
          [...question.numbers].sort((a, b) => a - b),
        );
      } else if (question.kind === "rows") {
        const [top, bottom] = question.counts;
        assert.ok(top >= 2 && top <= 8 && bottom >= 2 && bottom <= 8);
        assert.ok(Math.abs(top - bottom) <= 3);
        if (top === bottom) {
          same++;
          assert.deepEqual(answer, [sameChoice]);
        } else {
          const picked = question.counts[answer[0]];
          const other = question.counts[1 - answer[0]];
          assert.ok(question.ask === "more" ? picked > other : picked < other);
        }
      } else if (question.kind === "group") {
        // 「點三個」: the first three from the left, in any order.
        assert.ok(question.count >= 2 && question.count <= 5 && question.length === 7);
        assert.deepEqual(
          answer,
          Array.from({ length: question.count }, (_, index) => index),
        );
        assert.ok(inAnyOrder(question));
      } else if (question.kind === "nth") {
        // 「點第三個」: only that one, with the same number and picture as 「點三個」.
        const group = round[round.indexOf(question) - 1];
        assert.ok(group.kind === "group" && group.count === question.place);
        assert.ok(group.kind === "group" && group.icon === question.icon);
        assert.deepEqual(answer, [question.place - 1]);
        assert.ok(!inAnyOrder(question));
      } else assert.fail("a kind 第三課 does not ask");
    }
    assert.equal(round[2].kind === "position" && round[2].from, "left");
    assert.equal(round[3].kind === "position" && round[3].from, "right");
  }
  // 一樣多 comes up in some rounds, not all.
  assert.ok(same > 50 && same < 250, String(same));
  // 「從左邊數」 is voiced with 鼠 so Meijia says ㄕㄨˇ; the screen shows 數.
  assert.equal(mathPrompts["position-left-3"], "從左邊數，第三個是哪一個？點一下。");
  assert.equal(mathPromptSpeech("position-left-3"), "從左邊鼠，第三個是哪一個？點一下。");
  // A count is 兩個, a place 第二個.
  assert.equal(mathPrompts["group-2"], "從左邊數，點兩個。");
  assert.equal(mathPrompts["nth-2"], "從左邊數，點第二個。");
});

test("比高矮 has a watercolor child for every shirt colour, cut from the top of the hair to the soles", () => {
  const shapes = Object.values(kidPictures);
  assert.equal(shapes.length, palette.length);
  for (const [name, { width, height }] of Object.entries(kidPictures)) {
    assert.ok(existsSync(`public/course-art/kid-${name}.webp`), name);
    // Standing children: taller than wide, so a height in the stage is the child's height.
    assert.ok(height > width && width > 0, name);
  }
});
