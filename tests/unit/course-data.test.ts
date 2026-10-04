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
  zhuyinPlaybackRate,
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

test("fresh sessions keep every listed prompt whole without splitting phrases", () => {
  lessons.forEach((_, index) => {
    const session = buildListeningSession(index);
    assert.equal(session.filter((q) => q.category === "symbols").length, 4);
    assert.deepEqual(
      session
        .filter((q) => q.category !== "symbols")
        .map((q) => q.audioText)
        .sort(),
      circledVocabulary[index].map((term) => term.text).sort(),
    );
    assert.equal(new Set(session.map((q) => q.id)).size, session.length);
    for (const q of session) {
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 3);
    }
    assert.deepEqual(sectionPosition([session[4]], 0), { index: 0, total: 1 });
  });
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
    const file = new URL(`../../public${listeningAudioUrl(text).split("?")[0]}`, import.meta.url);
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
  assert.equal(zhuyinPlaybackRate, 1);
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
  assert.equal(findQuestionSeed(5, "words:教我畫畫")?.answer, "ㄐㄧㄠˋ|ㄨㄛˇ|ㄏㄨㄚˋ|ㄏㄨㄚˋ");
  assert.ok(!buildListeningSession(5).some((q) => q.audioText === "教我畫畫"));
});
