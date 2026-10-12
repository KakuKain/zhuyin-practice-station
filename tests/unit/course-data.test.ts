import assert from "node:assert/strict";
import { stat, readFile } from "node:fs/promises";
import test from "node:test";
import {
  lessons,
  exercises,
  annotateLessonLines,
  previewPronunciationVariants,
} from "../../features/courses/course-data";
import { builtinCatalog } from "../../features/courses/materials";
import { circledVocabulary } from "../../features/courses/circled-vocabulary";
import {
  buildListeningSession,
  questionSeedsForLesson,
  listeningAudioUrl,
  findQuestionSeed,
  questionId,
  sectionPosition,
} from "../../features/listening/listening-data";

test("all nine lessons keep complete aligned characters and pronunciations", () => {
  assert.equal(lessons.length, 9);
  lessons.forEach((lesson, index) => {
    assert.deepEqual(
      exercises[index].lines.map((line) => line.map((item) => item.character).join("")),
      lesson.lines.map((line) => line.replaceAll(" ", "")),
    );
    for (const line of exercises[index].lines)
      for (const item of line) assert.match(item.zhuyin, /^[˙ㄅ-ㄩˊˇˋ]+$/);
    for (const term of circledVocabulary[index])
      assert.equal([...term.text].length, term.syllables.length);
  });
  assert.throws(() => annotateLessonLines(["你好"], [["ㄋㄧˇ"]]));
  assert.throws(() => annotateLessonLines(["你"], []));
  assert.equal(exercises[0].lines[3][3].zhuyin, "˙ㄉㄧ");
  assert.equal(exercises[7].lines[7][1].zhuyin, "ㄧㄛ");
  assert.equal(previewPronunciationVariants[4][1][0], "\u{E01E2}");
});

test("a round is 4 symbols, 4 生字 and 2 whole words, for lessons and reviews", () => {
  for (const lesson of builtinCatalog) {
    const session = buildListeningSession(lesson.index);
    const count = (category: string) => session.filter((q) => q.category === category).length;
    assert.deepEqual(
      [count("symbols"), count("characters"), count("words")],
      [4, 4, 2],
      lesson.title,
    );
    // Sections stay in order, so 第一／二／三大題 match the categories.
    assert.deepEqual(
      [...new Set(session.map((q) => q.category))],
      ["symbols", "characters", "words"],
    );
    const words = lesson.terms.filter((term) => term.syllables.length > 1).map((t) => t.text);
    for (const q of session.filter((q) => q.category === "words"))
      assert.ok(words.includes(q.audioText), `${lesson.title} ${q.audioText}`);
    assert.equal(new Set(session.map((q) => q.id)).size, session.length);
    for (const q of session) {
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 3);
    }
    assert.deepEqual(sectionPosition([session[4]], 0), { index: 0, total: 1 });
  }
});

// A syllable's initial, then its rhyme: one symbol or a combined rhyme such as ㄧㄠ.
function syllableParts(syllable: string) {
  const letters = Array.from(syllable.replace(/[˙ˊˇˋ]/g, ""));
  const initial = /[ㄅ-ㄙ]/.test(letters[0]) ? letters.shift()! : null;
  return { initial, rhyme: letters.join("") };
}

test("生字 practise the lesson's own symbols and use only symbols taught by then", () => {
  const taught: string[][] = [];
  for (const lesson of builtinCatalog) {
    const own = lesson.listeningOnly ? lesson.listeningSymbols! : lesson.symbols;
    if (!lesson.listeningOnly) taught.push([...lesson.symbols]);
    const known = new Set(taught.flat());
    const inWords = new Map<string, Set<string>>();
    for (const term of lesson.terms)
      Array.from(term.text).forEach((character, index) =>
        inWords.set(character, (inWords.get(character) ?? new Set()).add(term.syllables[index])),
      );
    const usesOwn = (syllable: string) => {
      const { initial, rhyme } = syllableParts(syllable);
      return [initial, rhyme, ...(rhyme.length > 1 ? Array.from(rhyme) : [])].some(
        (part) => part && own.includes(part),
      );
    };
    const characters = lesson.characters ?? [];
    assert.ok(characters.length >= 4, `${lesson.title} needs at least 4 生字`);
    // Only when fewer than 4 circled characters use the lesson's symbols may others join.
    const fallback = characters.filter((character) => usesOwn(character.syllables[0])).length < 4;
    for (const character of characters) {
      const [syllable] = character.syllables;
      const label = `${lesson.title} ${character.text} ${syllable}`;
      assert.ok(inWords.get(character.text)?.has(syllable), `${label} is not from a circled word`);
      assert.doesNotMatch(syllable, /˙/, label);
      assert.ok(fallback || usesOwn(syllable), `${label} uses none of ${own.join("")}`);
      const { initial, rhyme } = syllableParts(syllable);
      assert.ok(
        [initial, rhyme].every((part) => !part || known.has(part)) &&
          Array.from(rhyme).every((letter) => known.has(letter)),
        `${label} needs a symbol not taught yet`,
      );
      const seed = findQuestionSeed(lesson.index, `characters:${character.text}`);
      assert.equal(seed?.answer, syllable);
    }
  }
});

test("reviews ask the symbols of the three lessons they cover", () => {
  for (const [position, review] of builtinCatalog.filter((l) => l.listeningOnly).entries()) {
    const covered: string[] = lessons
      .slice(position * 3, position * 3 + 3)
      .flatMap((l) => l.symbols);
    assert.deepEqual([...review.listeningSymbols!].sort(), [...new Set(covered)].sort());
    const symbol = buildListeningSession(review.index).find((q) => q.category === "symbols")!;
    assert.ok(covered.includes(symbol.answer));
    assert.equal(findQuestionSeed(review.index, symbol.id)?.answer, symbol.answer);
  }
});

test("every current and legacy prompt has a local playable audio file", async () => {
  const texts = new Set<string>([
    ..."ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ",
  ]);
  builtinCatalog.forEach(({ index }) => {
    const pools = questionSeedsForLesson(index);
    for (const q of [
      ...pools.symbols,
      ...pools.characters,
      ...pools.words,
      ...(exercises[index]?.questions ?? []),
    ]) {
      texts.add(q.audioText);
      assert.ok(findQuestionSeed(index, questionId(q)));
    }
  });
  for (const text of texts) {
    const file = new URL(`../../public/${listeningAudioUrl(text).split("?")[0]}`, import.meta.url);
    assert.ok((await stat(file)).size > 1024, text);
    const bytes = await readFile(file);
    if (file.pathname.endsWith(".mp3")) {
      // MOE publishes raw MPEG frames rather than AAC in an MP4 container.
      assert.ok(
        bytes.toString("ascii", 0, 3) === "ID3" ||
          (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
        text,
      );
    } else assert.equal(bytes.toString("ascii", 4, 8), "ftyp");
  }
});

test("all shipped font assets use WOFF2", async () => {
  for (const name of [
    "BpmfZihiSans-Regular",
    "BpmfZihiOnly-R",
    "KidLessonYoSans",
    "KidLessonYoOnly",
  ]) {
    const font = await readFile(new URL(`../../public/fonts/${name}.woff2`, import.meta.url));
    assert.equal(font.toString("ascii", 0, 4), "wOF2");
  }
});

test("saved whole phrases remain available after the exam scope changes", () => {
  assert.equal(findQuestionSeed(5, "words:教我畫畫")?.answer, "ㄐㄧㄠ|ㄨㄛˇ|ㄏㄨㄚˋ|ㄏㄨㄚˋ");
  assert.ok(!buildListeningSession(5).some((q) => q.audioText === "教我畫畫"));
});

test("the shown version and the newest release note match package.json", async () => {
  const { siteReleaseNotes } = await import("../../features/courses/course-data");
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(siteReleaseNotes[0][0], pkg.version);
  assert.equal(new Set(siteReleaseNotes.map(([version]) => version)).size, siteReleaseNotes.length);
});
