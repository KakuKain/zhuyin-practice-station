import { book1Lessons, book1Readings } from "./book1-characters";

/**
 * The teacher's 語詞 for 聽寫, ten a lesson as the class sheets list them (「每個語詞寫兩遍」), with
 * every character's reading: 一 as the sheet marks it (一ˊ個, 一ˋ起), 和 as ㄏㄢˋ. A character
 * the child has not been taught yet is written in 注音, so the answer depends on the lesson.
 */
export type DictationWord = { text: string; readings: string };

const words: Record<number, [string, string][]> = {
  1: [
    ["看書", "ㄎㄢˋ ㄕㄨ"],
    ["打球", "ㄉㄚˇ ㄑㄧㄡˊ"],
    ["拍手", "ㄆㄞ ㄕㄡˇ"],
    ["你好", "ㄋㄧˇ ㄏㄠˇ"],
    ["他們", "ㄊㄚ ˙ㄇㄣ"],
    ["左手", "ㄗㄨㄛˇ ㄕㄡˇ"],
    ["右腳", "ㄧㄡˋ ㄐㄧㄠˇ"],
    ["上學", "ㄕㄤˋ ㄒㄩㄝˊ"],
    ["下課", "ㄒㄧㄚˋ ㄎㄜˋ"],
    ["拍照", "ㄆㄞ ㄓㄠˋ"],
  ],
  2: [
    ["這裡", "ㄓㄜˋ ㄌㄧˇ"],
    ["可是", "ㄎㄜˇ ㄕˋ"],
    ["誰的", "ㄕㄟˊ ˙ㄉㄜ"],
    ["我們", "ㄨㄛˇ ˙ㄇㄣ"],
    ["分開", "ㄈㄣ ㄎㄞ"],
    ["多少", "ㄉㄨㄛ ㄕㄠˇ"],
    ["好了", "ㄏㄠˇ ˙ㄌㄜ"],
    ["個數", "ㄍㄜˋ ㄕㄨˋ"],
    ["一個", "ㄧˊ ˙ㄍㄜ"],
    ["啊！", "ㄚ"],
  ],
  3: [
    ["秋天", "ㄑㄧㄡ ㄊㄧㄢ"],
    ["陪伴", "ㄆㄟˊ ㄅㄢˋ"],
    ["玩耍", "ㄨㄢˊ ㄕㄨㄚˇ"],
    ["高山", "ㄍㄠ ㄕㄢ"],
    ["到處", "ㄉㄠˋ ㄔㄨˋ"],
    ["大海", "ㄉㄚˋ ㄏㄞˇ"],
    ["朋友", "ㄆㄥˊ ㄧㄡˇ"],
    ["他們", "ㄊㄚ ˙ㄇㄣ"],
    ["一起", "ㄧˋ ㄑㄧˇ"],
    ["我和你", "ㄨㄛˇ ㄏㄢˋ ㄋㄧˇ"],
  ],
  4: [
    ["大小", "ㄉㄚˋ ㄒㄧㄠˇ"],
    ["個子", "ㄍㄜˋ ˙ㄗ"],
    ["上課", "ㄕㄤˋ ㄎㄜˋ"],
    ["人們", "ㄖㄣˊ ˙ㄇㄣ"],
    ["拉手", "ㄌㄚ ㄕㄡˇ"],
    ["左看", "ㄗㄨㄛˇ ㄎㄢˋ"],
    ["右找", "ㄧㄡˋ ㄓㄠˇ"],
    ["兩隻", "ㄌㄧㄤˇ ㄓ"],
    ["青蛙", "ㄑㄧㄥ ㄨㄚ"],
    ["開心", "ㄎㄞ ㄒㄧㄣ"],
  ],
  5: [
    ["比賽", "ㄅㄧˇ ㄙㄞˋ"],
    ["大門", "ㄉㄚˋ ㄇㄣˊ"],
    ["裡外", "ㄌㄧˇ ㄨㄞˋ"],
    ["也有", "ㄧㄝˇ ㄧㄡˇ"],
    ["什麼", "ㄕㄣˊ ˙ㄇㄜ"],
    ["不同", "ㄅㄨˋ ㄊㄨㄥˊ"],
    ["早晚", "ㄗㄠˇ ㄨㄢˇ"],
    ["王子", "ㄨㄤˊ ㄗˇ"],
    ["主人", "ㄓㄨˇ ㄖㄣˊ"],
    ["又是", "ㄧㄡˋ ㄕˋ"],
  ],
  6: [
    ["長短", "ㄔㄤˊ ㄉㄨㄢˇ"],
    ["白天", "ㄅㄞˊ ㄊㄧㄢ"],
    ["紅花", "ㄏㄨㄥˊ ㄏㄨㄚ"],
    ["走路", "ㄗㄡˇ ㄌㄨˋ"],
    ["現在", "ㄒㄧㄢˋ ㄗㄞˋ"],
    ["說話", "ㄕㄨㄛ ㄏㄨㄚˋ"],
    ["雲朵", "ㄩㄣˊ ㄉㄨㄛˇ"],
    ["從前", "ㄘㄨㄥˊ ㄑㄧㄢˊ"],
    ["那頭", "ㄋㄚˋ ㄊㄡˊ"],
    ["向你說", "ㄒㄧㄤˋ ㄋㄧˇ ㄕㄨㄛ"],
  ],
};
export const book1Words: Record<number, DictationWord[]> = Object.fromEntries(
  Object.entries(words).map(([id, list]) => [
    Number(id),
    list.map(([text, readings]) => ({ text, readings })),
  ]),
);

/** 個數's 數 is written in 注音 at school, but a child who writes the 國字 is right too. */
export const alsoRight: Record<string, string> = { 數: "ㄕㄨˋ" };

/** The 生字 taught by the end of a lesson: 國字真簡單's numbers and every lesson up to it. */
export const taughtBy = (lessonId: number) =>
  new Set(
    book1Lessons
      .filter((lesson) => lesson.id <= lessonId)
      .flatMap((lesson) => [...lesson.characters]),
  );

/** Each cell of an answer: a taught character is written as itself, any other in 注音. */
export type AnswerCell = { character: string; reading: string; write: "國字" | "注音" | "標點" };
export function answerCells(word: DictationWord, lessonId: number): AnswerCell[] {
  const taught = taughtBy(lessonId);
  const readings = word.readings.split(" ");
  let syllable = 0;
  return [...word.text].map((character) => {
    if (!/\p{Script=Han}/u.test(character))
      return { character, reading: "", write: "標點" as const };
    const reading = readings[syllable++];
    return { character, reading, write: taught.has(character) ? "國字" : "注音" };
  });
}

/**
 * What 聽寫 says for a 生字 alone: a word it is in, then the 生字 (「拍手的拍」), as teachers
 * say it. Numbers are 「數字一」. Where 「…的誰」 or 「我的的的」 would muddle, the 生字 comes
 * first and a short sentence after it.
 */
const characterCalls: Record<string, string> = {
  拍: "拍手的拍",
  手: "拍手的手",
  左: "左手的左",
  右: "右手的右",
  你: "你好的你",
  他: "他們的他",
  也: "也有的也",
  上: "上學的上",
  下: "下課的下",
  這: "這裡的這",
  是: "可是的是",
  誰: "誰，你是誰？",
  的: "的，我的書。",
  我: "我們的我",
  分: "分開的分",
  好: "你好的好",
  了: "好了的了",
  啊: "啊，好美啊！",
  多: "多少的多",
  個: "一個的個",
  秋: "秋天的秋",
  千: "秋千的千",
  和: "我和你的和",
  玩: "玩耍的玩",
  陪: "陪伴的陪",
  高: "高山的高",
  山: "高山的山",
  到: "到處的到",
  大: "大海的大",
  海: "大海的海",
  朋: "朋友的朋",
  友: "朋友的友",
  們: "他們的們",
  起: "一起的起",
  子: "個子的子",
  小: "大小的小",
  課: "上課的課",
  兩: "兩隻的兩",
  人: "主人的人",
  拉: "拉手的拉",
  看: "看書的看",
  找: "右找的找",
  隻: "兩隻的隻",
  青: "青蛙的青",
  蛙: "青蛙的蛙",
  開: "開心的開",
  心: "開心的心",
  比: "比賽的比",
  門: "大門的門",
  裡: "裡外的裡",
  外: "裡外的外",
  有: "也有的有",
  什: "什麼的什",
  麼: "什麼的麼",
  不: "不同的不",
  同: "不同的同",
  早: "早晚的早",
  晚: "早晚的晚",
  王: "王子的王",
  主: "主人的主",
  又: "又是的又",
  路: "走路的路",
  長: "長短的長",
  白: "白天的白",
  花: "紅花的花",
  紅: "紅花的紅",
  走: "走路的走",
  在: "現在的在",
  向: "向你說的向",
  說: "說話的說",
  朵: "雲朵的朵",
  從: "從前的從",
  頭: "那頭的頭",
  那: "那頭的那",
};
for (const number of "一二三四五六七八九十") characterCalls[number] = `數字${number}`;
export { characterCalls };

/** The sentences' readings; a 「…的…」 call is read from its word, ˙ㄉㄜ and the 生字. */
const sentenceReadings: Record<string, string> = {
  誰: "ㄕㄟˊ ㄋㄧˇ ㄕˋ ㄕㄟˊ",
  的: "˙ㄉㄜ ㄨㄛˇ ˙ㄉㄜ ㄕㄨ",
  啊: "ㄚ ㄏㄠˇ ㄇㄟˇ ˙ㄚ",
};
const wordReadings = Object.fromEntries(
  Object.values(book1Words)
    .flat()
    .map((word) => [word.text, word.readings]),
);
export function callReadings(character: string): string {
  if (sentenceReadings[character]) return sentenceReadings[character];
  const call = characterCalls[character];
  if (call.startsWith("數字")) return `ㄕㄨˋ ㄗˋ ${book1Readings[character]}`;
  const word = call.slice(0, call.indexOf("的"));
  const readings = wordReadings[word] ?? [...word].map((c) => book1Readings[c]).join(" ");
  return `${readings} ˙ㄉㄜ ${book1Readings[character]}`;
}
