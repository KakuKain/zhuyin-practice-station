import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildReadingRound,
  readingClips,
  readingQuestions,
  readingScenes,
  readingThings,
} from "../../features/hanzi/reading-lesson";
import { isHan, readingVariants } from "../../features/lesson/reading-variants";

test("閱讀階梯 shows and speaks every sentence with one reading per character, as the font shows it", () => {
  const annotated = JSON.parse(
    readFileSync("assets/font-sources/KidLessonYoSans-readings.json", "utf8"),
  ) as Record<string, string>;
  for (const { text, readings } of readingClips) {
    const syllables = readings.split(" ");
    const characters = Array.from(text);
    assert.equal(syllables.length, characters.filter(isHan).length, `${text}: one per character`);
    const variants = readingVariants(text, readings);
    let syllable = 0;
    characters.forEach((character, index) => {
      if (!isHan(character)) return;
      const glyph = character + (variants[index] ?? "");
      assert.ok(glyph in annotated, `${text}: ${character} is missing from the font`);
      assert.equal(annotated[glyph], syllables[syllable++], `${text}: ${character}`);
    });
  }
});

test("each question has three different answers that it can show", () => {
  for (const question of readingQuestions) {
    const answers = "pictures" in question ? question.pictures : question.sentences;
    assert.equal(answers.length, 3, question.id);
    if ("pictures" in question)
      for (const thing of question.pictures) assert.ok(readingThings[thing], thing);
    assert.equal(new Set(answers.map((a) => JSON.stringify(a))).size, 3, question.id);
  }
});

test("a round orders four scenes, then asks five questions in the story's order", () => {
  for (let seed = 1; seed <= 30; seed++) {
    let state = seed;
    const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
    const [order, ...questions] = buildReadingRound(random);
    assert.equal(order.kind, "order");
    if (order.kind !== "order") return;
    assert.equal(order.scenes.length, 4);
    assert.equal(new Set(order.scenes).size, 4);
    assert.ok(order.scenes.every((scene) => scene >= 0 && scene < readingScenes.length));
    assert.equal(questions.length, 5);
    const positions = questions.map((step) =>
      step.kind === "question" ? readingQuestions.indexOf(step.question) : -1,
    );
    assert.deepEqual(
      positions,
      [...positions].sort((a, b) => a - b),
    );
    for (const step of questions)
      if (step.kind === "question") assert.deepEqual([...step.order].sort(), [0, 1, 2]);
  }
});
