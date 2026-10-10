/**
 * Frozen content from earlier versions of the site, kept only so that records saved back
 * then still resolve: old saved question IDs and v1/v2 question indexes, plus the audio
 * registry entries those questions play. New listening rounds never draw from here; the
 * live question bank is circled-vocabulary.ts. Do not edit these tables, only add.
 */
import type { ListeningSeed } from "../types";
import { term, type CircledTerm } from "./circled-vocabulary";

/** The first listening question bank (before the teacher-circled vocabulary). */
export function wordQuestion(
  audioText: string,
  answer: string,
  distractors: readonly [string, string],
): ListeningSeed {
  return { category: "words", audioText, answer, distractors };
}

export const fifthListeningQuestions = [
  wordQuestion("朋友", "ㄆㄥˊ|ㄧㄡˇ", ["ㄆㄥˊ|ㄧㄡ", "ㄆㄥˋ|ㄧㄡˇ"]),
  wordQuestion("一起", "ㄧˋ|ㄑㄧˇ", ["ㄧ|ㄑㄧˇ", "ㄧˋ|ㄑㄧ"]),
  wordQuestion("翹翹", "ㄑㄧㄠˋ|ㄑㄧㄠˋ", ["ㄑㄧㄠˊ|ㄑㄧㄠˋ", "ㄑㄧㄠˋ|ㄑㄧㄠˊ"]),
  wordQuestion("小鳥", "ㄒㄧㄠˇ|ㄋㄧㄠˇ", ["ㄒㄧㄠˇ|ㄋㄧㄠˋ", "ㄒㄧㄠˋ|ㄋㄧㄠˇ"]),
];

export const sixthListeningQuestions = [
  wordQuestion("老師", "ㄌㄠˇ|ㄕ", ["ㄌㄠˋ|ㄕ", "ㄌㄠˇ|ㄕˋ"]),
  wordQuestion("紅花", "ㄏㄨㄥˊ|ㄏㄨㄚ", ["ㄏㄨㄥˊ|ㄏㄨㄚˋ", "ㄏㄨㄥˋ|ㄏㄨㄚ"]),
  wordQuestion("謝謝", "ㄒㄧㄝˋ|˙ㄒㄧㄝ", ["ㄒㄧㄝˋ|ㄒㄧㄝˋ", "ㄒㄧㄝˋ|ㄒㄧㄝ"]),
  wordQuestion("讀書", "ㄉㄨˊ|ㄕㄨ", ["ㄉㄨˋ|ㄕㄨ", "ㄉㄨˊ|ㄕㄨˋ"]),
];

export const seventhListeningQuestions = [
  wordQuestion("烏龜", "ㄨ|ㄍㄨㄟ", ["ㄨˋ|ㄍㄨㄟ", "ㄨ|ㄍㄨㄟˋ"]),
  wordQuestion("兔子", "ㄊㄨˋ|˙ㄗ", ["ㄊㄨˋ|ㄗˇ", "ㄊㄨˊ|˙ㄗ"]),
  wordQuestion("比賽", "ㄅㄧˇ|ㄙㄞˋ", ["ㄅㄧˋ|ㄙㄞˋ", "ㄅㄧˇ|ㄙㄞ"]),
  wordQuestion("午覺", "ㄨˇ|ㄐㄧㄠˋ", ["ㄨˇ|ㄐㄩㄝˊ", "ㄨˋ|ㄐㄧㄠˋ"]),
];

export const eighthListeningQuestions = [
  wordQuestion("菜園", "ㄘㄞˋ|ㄩㄢˊ", ["ㄘㄞˊ|ㄩㄢˊ", "ㄘㄞˋ|ㄩㄢˇ"]),
  wordQuestion("蘿蔔", "ㄌㄨㄛˊ|˙ㄅㄛ", ["ㄌㄨㄛˊ|ㄅㄛˊ", "ㄌㄨㄛˋ|˙ㄅㄛ"]),
  wordQuestion("黃牛", "ㄏㄨㄤˊ|ㄋㄧㄡˊ", ["ㄏㄨㄤˊ|ㄋㄧㄡˇ", "ㄏㄨㄤˋ|ㄋㄧㄡˊ"]),
  wordQuestion("浣熊", "ㄨㄢˇ|ㄒㄩㄥˊ", ["ㄏㄨㄢˋ|ㄒㄩㄥˊ", "ㄨㄢˇ|ㄒㄩㄥˇ"]),
];

export const ninthListeningQuestions = [
  wordQuestion("山崖", "ㄕㄢ|ㄧㄞˊ", ["ㄕㄢ|ㄧㄚˊ", "ㄕㄢˋ|ㄧㄞˊ"]),
  wordQuestion("動物", "ㄉㄨㄥˋ|ㄨˋ", ["ㄉㄨㄥ|ㄨˋ", "ㄉㄨㄥˋ|ㄨˇ"]),
  wordQuestion("馴鹿", "ㄒㄩㄣˊ|ㄌㄨˋ", ["ㄒㄩㄣˋ|ㄌㄨˋ", "ㄒㄩㄣˊ|ㄌㄨˇ"]),
  wordQuestion("精彩", "ㄐㄧㄥ|ㄘㄞˇ", ["ㄐㄧㄥˋ|ㄘㄞˇ", "ㄐㄧㄥ|ㄘㄞˋ"]),
];

export const firstListeningQuestions = [
  { category: "symbols", answer: "ㄅ", audioText: "ㄅ", distractors: ["ㄆ", "ㄇ"] },
  { category: "symbols", answer: "ㄆ", audioText: "ㄆ", distractors: ["ㄅ", "ㄉ"] },
  { category: "symbols", answer: "ㄇ", audioText: "ㄇ", distractors: ["ㄅ", "ㄆ"] },
  { category: "symbols", answer: "ㄉ", audioText: "ㄉ", distractors: ["ㄇ", "ㄅ"] },
  { category: "characters", answer: "ㄇㄠ", audioText: "貓", distractors: ["ㄇㄧ", "ㄆㄠˇ"] },
  { category: "characters", answer: "ㄇㄧ", audioText: "咪", distractors: ["ㄇㄠ", "ㄅㄧ"] },
  { category: "characters", answer: "ㄉㄧˋ", audioText: "弟", distractors: ["˙ㄉㄧ", "ㄧ"] },
  { category: "characters", answer: "ㄆㄠˇ", audioText: "跑", distractors: ["ㄆㄠˊ", "ㄆㄠˋ"] },
  {
    category: "words",
    answer: "ㄇㄠ|ㄇㄧ",
    audioText: "貓咪",
    distractors: ["ㄇㄠ|ㄇㄠ", "ㄇㄧ|ㄇㄧ"],
  },
  {
    category: "words",
    answer: "ㄉㄧˋ|˙ㄉㄧ",
    audioText: "弟弟",
    distractors: ["ㄉㄧˋ|ㄉㄧˋ", "˙ㄉㄧ|ㄉㄧˋ"],
  },
] as const;

export const secondListeningQuestions = [
  { category: "symbols", answer: "ㄈ", audioText: "ㄈ", distractors: ["ㄏ", "ㄓ"] },
  { category: "symbols", answer: "ㄏ", audioText: "ㄏ", distractors: ["ㄈ", "ㄔ"] },
  { category: "symbols", answer: "ㄓ", audioText: "ㄓ", distractors: ["ㄔ", "ㄏ"] },
  { category: "symbols", answer: "ㄔ", audioText: "ㄔ", distractors: ["ㄓ", "ㄈ"] },
  { category: "characters", answer: "ㄜˊ", audioText: "鵝", distractors: ["ㄅㄠˇ", "ㄏㄚ"] },
  { category: "characters", answer: "ㄅㄠˇ", audioText: "寶", distractors: ["˙ㄅㄠ", "ㄏㄠˇ"] },
  { category: "characters", answer: "ㄈㄨ", audioText: "孵", distractors: ["ㄔㄨ", "ㄨˇ"] },
  { category: "characters", answer: "ㄧˋ", audioText: "意", distractors: ["ㄧ", "ㄜˊ"] },
  {
    category: "words",
    answer: "ㄅㄠˇ|˙ㄅㄠ",
    audioText: "寶寶",
    distractors: ["ㄅㄠˇ|ㄅㄠˇ", "˙ㄅㄠ|ㄅㄠˇ"],
  },
  {
    category: "words",
    answer: "ㄈㄨ|ㄔㄨ",
    audioText: "孵出",
    distractors: ["ㄈㄨ|ㄈㄨ", "ㄔㄨ|ㄈㄨ"],
  },
] as const;

export const thirdListeningQuestions = [
  { category: "symbols", answer: "ㄌ", audioText: "ㄌ", distractors: ["ㄑ", "ㄗ"] },
  { category: "symbols", answer: "ㄑ", audioText: "ㄑ", distractors: ["ㄌ", "ㄩ"] },
  { category: "symbols", answer: "ㄗ", audioText: "ㄗ", distractors: ["ㄌ", "ㄑ"] },
  { category: "symbols", answer: "ㄩ", audioText: "ㄩ", distractors: ["ㄗ", "ㄑ"] },
  { category: "characters", answer: "ㄑㄩˋ", audioText: "去", distractors: ["ㄑㄩ", "ㄑㄩˇ"] },
  { category: "characters", answer: "ㄗㄠˇ", audioText: "澡", distractors: ["ㄗㄠ", "ㄗㄠˋ"] },
  { category: "characters", answer: "ㄔㄠˊ", audioText: "巢", distractors: ["ㄔㄠ", "ㄔㄠˇ"] },
  { category: "characters", answer: "ㄏㄜˊ", audioText: "河", distractors: ["ㄌㄧˊ", "ㄇㄚˇ"] },
  {
    category: "words",
    answer: "ㄏㄜˊ|ㄇㄚˇ",
    audioText: "河馬",
    distractors: ["ㄏㄜˊ|ㄌㄧˊ", "ㄇㄚˇ|ㄏㄜˊ"],
  },
  {
    category: "words",
    answer: "ㄏㄜˊ|ㄌㄧˊ",
    audioText: "河狸",
    distractors: ["ㄏㄜˊ|ㄇㄚˇ", "ㄌㄧˊ|ㄏㄜˊ"],
  },
] as const;

export const fourthListeningQuestions = [
  { category: "symbols", answer: "ㄒ", audioText: "ㄒ", distractors: ["ㄕ", "ㄟ"] },
  { category: "symbols", answer: "ㄕ", audioText: "ㄕ", distractors: ["ㄒ", "ㄦ"] },
  { category: "symbols", answer: "ㄟ", audioText: "ㄟ", distractors: ["ㄡ", "ㄦ"] },
  { category: "symbols", answer: "ㄡ", audioText: "ㄡ", distractors: ["ㄟ", "ㄦ"] },
  { category: "characters", answer: "ㄅㄟ", audioText: "背", distractors: ["ㄅㄟˋ", "ㄅㄠ"] },
  { category: "characters", answer: "ㄕㄨ", audioText: "書", distractors: ["ㄕㄡˇ", "ㄕㄨˋ"] },
  { category: "characters", answer: "ㄒㄧㄠˋ", audioText: "笑", distractors: ["ㄒㄧ", "ㄒㄧㄠ"] },
  { category: "characters", answer: "ㄏㄨㄢ", audioText: "歡", distractors: ["ㄏㄨㄢˊ", "ㄏㄠˇ"] },
  {
    category: "words",
    answer: "ㄕㄨ|ㄅㄠ",
    audioText: "書包",
    distractors: ["ㄕㄡˇ|ㄅㄠ", "ㄕㄨ|ㄅㄟ"],
  },
  {
    category: "words",
    answer: "ㄏㄨㄢ|ㄒㄧˇ",
    audioText: "歡喜",
    distractors: ["ㄏㄨㄢ|ㄒㄧ", "ㄏㄠˇ|ㄒㄧˇ"],
  },
] as const;

/** Word questions removed from the first bank; saved records may still point at them. */
export const extraWordQuestions: Record<number, readonly ListeningSeed[]> = {
  0: [
    {
      category: "words",
      answer: "ㄉㄧˋ|ㄧ",
      audioText: "第一",
      distractors: ["ㄉㄧˋ|ㄇㄧ", "ㄆㄠˇ|ㄧ"],
    },
  ],
  1: [
    {
      category: "words",
      answer: "ㄉㄜˊ|ㄧˋ",
      audioText: "得意",
      distractors: ["ㄉㄜˊ|ㄜˊ", "ㄈㄨ|ㄧˋ"],
    },
  ],
  2: [
    {
      category: "words",
      answer: "ㄆㄠˋ|ㄗㄠˇ",
      audioText: "泡澡",
      distractors: ["ㄆㄠˊ|ㄗㄠˇ", "ㄆㄠˋ|ㄗㄠˋ"],
    },
    {
      category: "words",
      answer: "ㄅㄢˋ|ㄌㄨˋ",
      audioText: "半路",
      distractors: ["ㄅㄢˋ|ㄌㄧˊ", "ㄏㄜˊ|ㄌㄨˋ"],
    },
    {
      category: "words",
      answer: "ㄩˋ|ㄉㄠˋ",
      audioText: "遇到",
      distractors: ["ㄩˋ|ㄗㄠˇ", "ㄑㄩˋ|ㄉㄠˋ"],
    },
    {
      category: "words",
      answer: "ㄓㄨˊ|ㄔㄠˊ",
      audioText: "築巢",
      distractors: ["ㄓㄨˊ|ㄗㄠˇ", "ㄔㄠˊ|ㄓㄨˊ"],
    },
  ],
  3: [
    {
      category: "words",
      answer: "ㄅㄟ|˙ㄓㄜ",
      audioText: "背著",
      distractors: ["ㄅㄟˋ|˙ㄓㄜ", "ㄅㄟ|ㄕㄨ"],
    },
    {
      category: "words",
      answer: "ㄌㄚ|ㄕㄡˇ",
      audioText: "拉手",
      distractors: ["ㄌㄚ|ㄕㄨ", "ㄕㄡˇ|ㄌㄚ"],
    },
  ],
};

/** v1 saved records stored a question position; these map it to the old bank. */
export const legacySavedQuestionIndexes: Record<number, readonly number[]> = {
  0: [4, 5, 7],
  2: [4, 5, 6],
};

// Retain previously saved listening questions after exam-scope changes.
// The teacher's circled vocabulary is the only source for listening sections
// two (individual characters) and three (complete words or phrases).
export const legacyCircledVocabulary: readonly (readonly CircledTerm[])[] = [
  [
    term("逼", "ㄅㄧ"),
    term("貓咪", "ㄇㄠ|ㄇㄧ"),
    term("弟弟", "ㄉㄧˋ|˙ㄉㄧ"),
    term("跑第一", "ㄆㄠˇ|ㄉㄧˋ|ㄧ"),
  ],
  [
    term("哈", "ㄏㄚ"),
    term("孵出", "ㄈㄨ|ㄔㄨ"),
    term("五隻", "ㄨˇ|ㄓ"),
    term("鵝媽媽", "ㄜˊ|ㄇㄚ|˙ㄇㄚ"),
    term("好得意", "ㄏㄠˇ|ㄉㄜˊ|ㄧˋ"),
  ],
  [
    term("半路", "ㄅㄢˋ|ㄌㄨˋ"),
    term("忙著", "ㄇㄤˊ|˙ㄓㄜ"),
    term("築巢", "ㄓㄨˊ|ㄔㄠˊ"),
    term("河狸", "ㄏㄜˊ|ㄌㄧˊ"),
    term("泡澡", "ㄆㄠˋ|ㄗㄠˇ"),
  ],
  [
    term("笑嘻嘻", "ㄒㄧㄠˋ|ㄒㄧ|ㄒㄧ"),
    term("背書包", "ㄅㄟ|ㄕㄨ|ㄅㄠ"),
    term("手拉手", "ㄕㄡˇ|ㄌㄚ|ㄕㄡˇ"),
    term("一二一", "ㄧ|ㄦˋ|ㄧ"),
    term("好歡喜", "ㄏㄠˇ|ㄏㄨㄢ|ㄒㄧˇ"),
  ],
  [
    term("朋友", "ㄆㄥˊ|ㄧㄡˇ"),
    term("上下", "ㄕㄤˋ|ㄒㄧㄚˋ"),
    term("高低", "ㄍㄠ|ㄉㄧ"),
    term("好像", "ㄏㄠˇ|ㄒㄧㄤˋ"),
    term("小鳥", "ㄒㄧㄠˇ|ㄋㄧㄠˇ"),
    term("翹翹板", "ㄑㄧㄠˋ|ㄑㄧㄠˋ|ㄅㄢˇ"),
    // 2026-10: sentences split into words in circled-vocabulary.ts.
    term("奶奶想要魚乾", "ㄋㄞˇ|˙ㄋㄞ|ㄒㄧㄤˇ|ㄧㄠˋ|ㄩˊ|ㄍㄢ"),
    term("爸爸買了魚缸", "ㄅㄚˋ|˙ㄅㄚ|ㄇㄞˇ|˙ㄌㄜ|ㄩˊ|ㄍㄤ"),
    term("哥哥和小狗一起玩球", "ㄍㄜ|˙ㄍㄜ|ㄏㄢˋ|ㄒㄧㄠˇ|ㄍㄡˇ|ㄧˋ|ㄑㄧˇ|ㄨㄢˊ|ㄑㄧㄡˊ"),
  ],
  [
    term("也", "ㄧㄝˇ"),
    term("謝謝", "ㄒㄧㄝˋ|˙ㄒㄧㄝ"),
    term("讀書", "ㄉㄨˊ|ㄕㄨ"),
    term("送老師", "ㄙㄨㄥˋ|ㄌㄠˇ|ㄕ"),
    term("一朵紅花", "ㄧˋ|ㄉㄨㄛˇ|ㄏㄨㄥˊ|ㄏㄨㄚ"),
    term("教我畫畫", "ㄐㄧㄠ|ㄨㄛˇ|ㄏㄨㄚˋ|ㄏㄨㄚˋ"),
    // 2026-10: sentences split into words in circled-vocabulary.ts.
    term("一二三數一數", "ㄧ|ㄦˋ|ㄙㄢ|ㄕㄨˇ|ㄧˋ|ㄕㄨˇ"),
    term("飛到西", "ㄈㄟ|ㄉㄠˋ|ㄒㄧ"),
    term("飛到東", "ㄈㄟ|ㄉㄠˋ|ㄉㄨㄥ"),
    term("一起來做工", "ㄧˋ|ㄑㄧˇ|ㄌㄞˊ|ㄗㄨㄛˋ|ㄍㄨㄥ"),
    term("飛到南", "ㄈㄟ|ㄉㄠˋ|ㄋㄢˊ"),
    term("飛到北", "ㄈㄟ|ㄉㄠˋ|ㄅㄟˇ"),
    term("別做懶惰蟲", "ㄅㄧㄝˊ|ㄗㄨㄛˋ|ㄌㄢˇ|ㄉㄨㄛˋ|ㄔㄨㄥˊ"),
  ],
  [
    term("烏龜", "ㄨ|ㄍㄨㄟ"),
    term("兔子", "ㄊㄨˋ|˙ㄗ"),
    term("領先", "ㄌㄧㄥˇ|ㄒㄧㄢ"),
    term("落後", "ㄌㄨㄛˋ|ㄏㄡˋ"),
    term("睡午覺", "ㄕㄨㄟˋ|ㄨˇ|ㄐㄧㄠˋ"),
    term("看誰跑得快", "ㄎㄢˋ|ㄕㄟˊ|ㄆㄠˇ|˙ㄉㄜ|ㄎㄨㄞˋ"),
    term("跟在後面追", "ㄍㄣ|ㄗㄞˋ|ㄏㄡˋ|ㄇㄧㄢˋ|ㄓㄨㄟ"),
    // 2026-10: sentences split into words in circled-vocabulary.ts.
    term("多跳繩", "ㄉㄨㄛ|ㄊㄧㄠˋ|ㄕㄥˊ"),
    term("精神好", "ㄐㄧㄥ|ㄕㄣˊ|ㄏㄠˇ"),
    term("我是小烏龜", "ㄨㄛˇ|ㄕˋ|ㄒㄧㄠˇ|ㄨ|ㄍㄨㄟ"),
    term("走路不怕累", "ㄗㄡˇ|ㄌㄨˋ|ㄅㄨˊ|ㄆㄚˋ|ㄌㄟˋ"),
    term("青蛙跳", "ㄑㄧㄥ|ㄨㄚ|ㄊㄧㄠˋ"),
    term("蝴蝶飛", "ㄏㄨˊ|ㄉㄧㄝˊ|ㄈㄟ"),
    term("我在後面追追追", "ㄨㄛˇ|ㄗㄞˋ|ㄏㄡˋ|ㄇㄧㄢˋ|ㄓㄨㄟ|ㄓㄨㄟ|ㄓㄨㄟ"),
  ],
  [
    term("菜園", "ㄘㄞˋ|ㄩㄢˊ"),
    term("黃牛", "ㄏㄨㄤˊ|ㄋㄧㄡˊ"),
    term("浣熊", "ㄨㄢˇ|ㄒㄩㄥˊ"),
    term("嘿喲", "ㄏㄟ|ㄧㄛ"),
    term("好熱鬧", "ㄏㄠˇ|ㄖㄜˋ|ㄋㄠˋ"),
    term("拔不動", "ㄅㄚˊ|ㄅㄨˊ|ㄉㄨㄥˋ"),
    term("長出蘿蔔", "ㄓㄤˇ|ㄔㄨ|ㄌㄨㄛˊ|˙ㄅㄛ"),
    term("捲起袖子", "ㄐㄩㄢˇ|ㄑㄧˇ|ㄒㄧㄡˋ|˙ㄗ"),
    // 2026-10: sentences split into words in circled-vocabulary.ts.
    term("快快來", "ㄎㄨㄞˋ|ㄎㄨㄞˋ|ㄌㄞˊ"),
    term("炒蘿蔔", "ㄔㄠˇ|ㄌㄨㄛˊ|ㄅㄛˊ"),
    term("煮蘿蔔", "ㄓㄨˇ|ㄌㄨㄛˊ|ㄅㄛˊ"),
    term("切切切", "ㄑㄧㄝ|ㄑㄧㄝ|ㄑㄧㄝ"),
    term("紅燒蘿蔔", "ㄏㄨㄥˊ|ㄕㄠ|ㄌㄨㄛˊ|ㄅㄛˊ"),
    term("清蒸蘿蔔", "ㄑㄧㄥ|ㄓㄥ|ㄌㄨㄛˊ|ㄅㄛˊ"),
    term("快快快", "ㄎㄨㄞˋ|ㄎㄨㄞˋ|ㄎㄨㄞˋ"),
    term("大家都來吃蘿蔔", "ㄉㄚˋ|ㄐㄧㄚ|ㄉㄡ|ㄌㄞˊ|ㄔ|ㄌㄨㄛˊ|ㄅㄛˊ"),
  ],
  [
    term("山崖", "ㄕㄢ|ㄧㄞˊ"),
    term("開心", "ㄎㄞ|ㄒㄧㄣ"),
    term("表演", "ㄅㄧㄠˇ|ㄧㄢˇ"),
    term("馴鹿", "ㄒㄩㄣˊ|ㄌㄨˋ"),
    term("孔雀", "ㄎㄨㄥˇ|ㄑㄩㄝˋ"),
    term("慶祝", "ㄑㄧㄥˋ|ㄓㄨˋ"),
    term("小熊", "ㄒㄧㄠˇ|ㄒㄩㄥˊ"),
    term("滾大球", "ㄍㄨㄣˇ|ㄉㄚˋ|ㄑㄧㄡˊ"),
    term("真精彩", "ㄓㄣ|ㄐㄧㄥ|ㄘㄞˇ"),
    // 2026-10: sentences split into words in circled-vocabulary.ts.
    term("咩咩咩咩站山崖", "ㄇㄧㄝ|ㄇㄧㄝ|ㄇㄧㄝ|ㄇㄧㄝ|ㄓㄢˋ|ㄕㄢ|ㄧㄞˊ"),
    term("吱吱喳喳大合唱", "ㄓ|ㄓ|ㄓㄚ|ㄓㄚ|ㄉㄚˋ|ㄏㄜˊ|ㄔㄤˋ"),
    term("泥巴地裡躲迷藏", "ㄋㄧˊ|ㄅㄚ|ㄉㄧˋ|ㄌㄧˇ|ㄉㄨㄛˇ|ㄇㄧˊ|ㄘㄤˊ"),
    term("跳水轉圈樣樣棒", "ㄊㄧㄠˋ|ㄕㄨㄟˇ|ㄓㄨㄢˋ|ㄑㄩㄢ|ㄧㄤˋ|ㄧㄤˋ|ㄅㄤˋ"),
  ],
];

// Review sentences split into words in 2026-10; index 0 is 複習一 (lesson index -1).
export const legacyReviewVocabulary: readonly (readonly CircledTerm[])[] = [
  [
    term("媽媽罵", "ㄇㄚ|˙ㄇㄚ|ㄇㄚˋ"),
    term("漁夫捕魚", "ㄩˊ|ㄈㄨ|ㄅㄨˇ|ㄩˊ"),
    term("鯉魚好大", "ㄌㄧˇ|ㄩˊ|ㄏㄠˇ|ㄉㄚˋ"),
  ],
  [
    term("姐姐上街買鞋", "ㄐㄧㄝˇ|˙ㄐㄧㄝ|ㄕㄤˋ|ㄐㄧㄝ|ㄇㄞˇ|ㄒㄧㄝˊ"),
    term("買了黑球鞋", "ㄇㄞˇ|˙ㄌㄜ|ㄏㄟ|ㄑㄧㄡˊ|ㄒㄧㄝˊ"),
    term("打上蝴蝶結", "ㄉㄚˇ|ㄕㄤˋ|ㄏㄨˊ|ㄉㄧㄝˊ|ㄐㄧㄝˊ"),
    term("妹妹拍手說好美", "ㄇㄟˋ|˙ㄇㄟ|ㄆㄞ|ㄕㄡˇ|ㄕㄨㄛ|ㄏㄠˇ|ㄇㄟˇ"),
    term("老伯伯和老婆婆", "ㄌㄠˇ|ㄅㄛˊ|˙ㄅㄛ|ㄏㄢˋ|ㄌㄠˇ|ㄆㄛˊ|˙ㄆㄛ"),
    term("帶著小狗慢慢走", "ㄉㄞˋ|˙ㄓㄜ|ㄒㄧㄠˇ|ㄍㄡˇ|ㄇㄢˋ|ㄇㄢˋ|ㄗㄡˇ"),
    term("哪個彎彎河中央", "ㄋㄚˇ|˙ㄍㄜ|ㄨㄢ|ㄨㄢ|ㄏㄜˊ|ㄓㄨㄥ|ㄧㄤ"),
    term("小橋彎彎河中央", "ㄒㄧㄠˇ|ㄑㄧㄠˊ|ㄨㄢ|ㄨㄢ|ㄏㄜˊ|ㄓㄨㄥ|ㄧㄤ"),
    term("哪個彎彎樹上有", "ㄋㄚˇ|˙ㄍㄜ|ㄨㄢ|ㄨㄢ|ㄕㄨˋ|ㄕㄤˋ|ㄧㄡˇ"),
    term("香蕉彎彎樹上有", "ㄒㄧㄤ|ㄐㄧㄠ|ㄨㄢ|ㄨㄢ|ㄕㄨˋ|ㄕㄤˋ|ㄧㄡˇ"),
    term("哪個彎彎高高掛", "ㄋㄚˇ|˙ㄍㄜ|ㄨㄢ|ㄨㄢ|ㄍㄠ|ㄍㄠ|ㄍㄨㄚˋ"),
    term("月亮彎彎高高掛", "ㄩㄝˋ|ㄌㄧㄤˋ|ㄨㄢ|ㄨㄢ|ㄍㄠ|ㄍㄠ|ㄍㄨㄚˋ"),
  ],
  [
    term("小雞小鴨", "ㄒㄧㄠˇ|ㄐㄧ|ㄒㄧㄠˇ|ㄧㄚ"),
    term("一起回家", "ㄧˋ|ㄑㄧˇ|ㄏㄨㄟˊ|ㄐㄧㄚ"),
    term("小豬開車", "ㄒㄧㄠˇ|ㄓㄨ|ㄎㄞ|ㄔㄜ"),
    term("學轉彎", "ㄒㄩㄝˊ|ㄓㄨㄢˇ|ㄨㄢ"),
    term("一群巨人", "ㄧˋ|ㄑㄩㄣˊ|ㄐㄩˋ|ㄖㄣˊ"),
    term("去運動", "ㄑㄩˋ|ㄩㄣˋ|ㄉㄨㄥˋ"),
    term("圓圓的月亮高高掛", "ㄩㄢˊ|ㄩㄢˊ|˙ㄉㄜ|ㄩㄝˋ|ㄌㄧㄤˋ|ㄍㄠ|ㄍㄠ|ㄍㄨㄚˋ"),
    term("就像美麗的大圓盤", "ㄐㄧㄡˋ|ㄒㄧㄤˋ|ㄇㄟˇ|ㄌㄧˋ|˙ㄉㄜ|ㄉㄚˋ|ㄩㄢˊ|ㄆㄢˊ"),
    term("愛漂亮", "ㄞˋ|ㄆㄧㄠˋ|ㄌㄧㄤˋ"),
    term("穿短裙", "ㄔㄨㄢ|ㄉㄨㄢˇ|ㄑㄩㄣˊ"),
    term("跳街舞", "ㄊㄧㄠˋ|ㄐㄧㄝ|ㄨˇ"),
    term("英雄好漢", "ㄧㄥ|ㄒㄩㄥˊ|ㄏㄠˇ|ㄏㄢˋ"),
    term("蕃茄炒蛋", "ㄈㄢ|ㄑㄧㄝˊ|ㄔㄠˇ|ㄉㄢˋ"),
    term("蝸牛走路", "ㄍㄨㄚ|ㄋㄧㄡˊ|ㄗㄡˇ|ㄌㄨˋ"),
  ],
];
