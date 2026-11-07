import assert from "node:assert/strict";
import test from "node:test";
import {
  answerCells,
  book1Words,
  callReadings,
  characterCalls,
} from "../../features/hanzi/book1-words";
import { book1Lessons } from "../../features/hanzi/book1-characters";
import { checkWritten } from "../../features/hanzi/dictation";
import strokes from "../../features/hanzi/strokes.json";
import type { InkStroke } from "../../features/types";

/** The teacher's sheets as printed: a 生字 taught by then as itself, the rest in 注音. */
const sheets: Record<number, string> = {
  1: "ㄎㄢˋㄕㄨ ㄉㄚˇㄑㄧㄡˊ 拍手 你ㄏㄠˇ 他˙ㄇㄣ 左手 右ㄐㄧㄠˇ 上ㄒㄩㄝˊ 下ㄎㄜˋ 拍ㄓㄠˋ",
  // The sheet prints 數 as 國字, though it is not a 生字; the parent chose ㄕㄨˋ.
  2: "這ㄌㄧˇ ㄎㄜˇ是 誰的 我˙ㄇㄣ 分ㄎㄞ 多ㄕㄠˇ 好了 個ㄕㄨˋ 一個 啊！",
  3: "秋ㄊㄧㄢ 陪ㄅㄢˋ 玩ㄕㄨㄚˇ 高山 到ㄔㄨˋ 大海 朋友 他們 一起 我和你",
  4: "大小 個子 上課 人們 拉手 左看 右找 兩隻 青蛙 開心",
  5: "比ㄙㄞˋ 大門 裡外 也有 什麼 不同 早晚 王子 主人 又是",
  // The sheet prints 天 as 國字 here (and as ㄊㄧㄢ in 秋天); it is not a 生字.
  6: "長ㄉㄨㄢˇ 白ㄊㄧㄢ 紅花 走路 ㄒㄧㄢˋ在 說ㄏㄨㄚˋ ㄩㄣˊ朵 從ㄑㄧㄢˊ 那頭 向你說",
};

test("聽寫 answers match the teacher's sheets: taught 生字 as 國字, the rest in 注音", () => {
  for (const [id, sheet] of Object.entries(sheets)) {
    const written = book1Words[Number(id)].map((word) =>
      answerCells(word, Number(id))
        .map((cell) => (cell.write === "注音" ? cell.reading : cell.character))
        .join(""),
    );
    assert.deepEqual(written, sheet.split(" "), `lesson ${id}`);
  }
  // A word asked again later uses what has been taught since: 他們 once 們 is taught.
  assert.equal(
    answerCells(book1Words[1][4], 3)
      .map((cell) => cell.write)
      .join(),
    "國字,國字",
  );
});

test("every 生字 has a call with one reading per character", () => {
  const characters = book1Lessons.flatMap((lesson) => [...lesson.characters]);
  for (const character of characters) {
    const call = characterCalls[character];
    assert.ok(call?.includes(character), `${character} needs a call`);
    const han = [...call].filter((c) => /\p{Script=Han}/u.test(c)).length;
    assert.equal(callReadings(character).split(" ").length, han, call);
    assert.ok(!callReadings(character).includes("undefined"), call);
  }
});

const data = strokes as Record<string, { medians: number[][][] }>;
/** A 生字 written along its medians, small and off to one side as a child might. */
const write = (character: string, order?: number[]): InkStroke[] =>
  (order ?? data[character].medians.map((_, i) => i)).map((i) =>
    data[character].medians[i].map(([x, y]) => ({
      x: 12 + (x / 1024) * 55,
      y: 8 + ((900 - y) / 1024) * 55,
    })),
  );

test("聽寫 judges a written 國字 by its strokes, wherever it sits in the square", () => {
  for (const character of "拍你這海花")
    assert.deepEqual(checkWritten(character, write(character)), { ok: true, at: 0 });
  // The second stroke first, a stroke missing, or nothing at all.
  assert.deepEqual(checkWritten("拍", write("拍", [1, 0, 2, 3, 4, 5, 6, 7])), { ok: false, at: 1 });
  assert.equal(checkWritten("拍", write("拍").slice(0, 7)).ok, false);
  assert.deepEqual(checkWritten("拍", []), { ok: false, at: 1 });
});
