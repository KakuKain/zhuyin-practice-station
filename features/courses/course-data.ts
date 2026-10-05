import type { LessonExercise, ListeningSeed, SyllableItem } from "../types";

export const lessonNumerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

export const lessons = [
  {
    title: "貓咪",
    lines: ["咪咪咪", "咪咪咪", "逼", "貓咪弟弟", "跑第一"],
    symbols: ["ㄅ", "ㄆ", "ㄇ", "ㄉ", "ㄧ", "ㄠ"],
  },
  {
    title: "鵝寶寶",
    lines: ["鵝鵝鵝", "鵝鵝鵝", "哈哈哈", "好得意", "孵出", "五隻鵝寶寶"],
    symbols: ["ㄈ", "ㄏ", "ㄓ", "ㄔ", "ㄨ", "ㄚ", "ㄜ"],
  },
  {
    title: "河馬和河狸",
    lines: ["河馬要去泡澡", "半路遇到河狸", "喔", "河狸", "忙著築巢"],
    symbols: ["ㄌ", "ㄑ", "ㄗ", "ㄩ", "ㄛ", "ㄢ", "ㄤ"],
  },
  {
    title: "笑嘻嘻",
    lines: ["背著書包", "手拉手", "背著書包", "笑嘻嘻", "一二一", "好歡喜"],
    symbols: ["ㄒ", "ㄕ", "ㄟ", "ㄡ", "ㄦ", "ㄧㄠ", "ㄨㄢ"],
  },
  {
    title: "翹翹板",
    lines: ["好朋友", "一起來玩", "翹翹板", "上上下下", "高高低低", "好像小鳥", "飛飛飛"],
    symbols: ["ㄋ", "ㄍ", "ㄞ", "ㄥ", "ㄧㄚ", "ㄧㄡ", "ㄧㄤ"],
  },
  {
    title: "謝謝老師",
    lines: ["我要送老師", "一朵小紅花", "謝謝老師", "教我讀書", "也謝謝老師", "教我畫畫"],
    symbols: ["ㄐ", "ㄙ", "ㄝ", "ㄧㄝ", "ㄨㄚ", "ㄨㄛ", "ㄨㄥ"],
  },
  {
    title: "龜兔賽跑",
    lines: [
      "烏龜兔子來比賽",
      "看誰跑得快",
      "兔子領先",
      "哈哈笑",
      "樹下睡午覺",
      "烏龜落後",
      "不氣餒",
      "跟在後面",
      "追追追",
    ],
    symbols: ["ㄊ", "ㄎ", "ㄣ", "ㄧㄢ", "ㄧㄥ", "ㄨㄞ", "ㄨㄟ"],
  },
  {
    title: "拔蘿蔔",
    lines: [
      "菜園裡",
      "長出大蘿蔔",
      "兔子拔不動",
      "大家快快來",
      "大象拉著黃牛",
      "黃牛拉著浣熊",
      "浣熊拉著兔子",
      "嘿喲嘿喲",
      "好熱鬧",
      "捲起袖子",
      "大家一起拔蘿蔔",
    ],
    symbols: ["ㄖ", "ㄘ", "ㄧㄛ", "ㄨㄤ", "ㄩㄢ", "ㄩㄥ"],
  },
  {
    title: "動物狂歡會",
    lines: [
      "山崖下",
      "動物狂歡會",
      "大家開心來慶祝",
      "小熊滾大球",
      "馴鹿敲大鼓",
      "孔雀變魔術",
      "青蛙大合唱",
      "嘓嘓嘓 咚咚咚",
      "大家的表演",
      "真精彩",
    ],
    symbols: ["ㄧㄞ", "ㄧㄣ", "ㄨㄣ", "ㄩㄝ", "ㄩㄣ"],
  },
] as const;

export const courseArtwork = [
  "cat",
  "swan-riding-family",
  "river",
  "happy",
  "seesaw",
  "teacher",
  "race",
  "radish",
  "festival",
] as const;

export const previewPronunciationVariants: Record<
  number,
  Record<number, Record<number, string>>
> = {
  0: { 3: { 3: "\u{E01E1}" } }, // 貓咪弟弟：第二個「弟」讀輕聲
  1: { 5: { 4: "\u{E01E1}" } }, // 五隻鵝寶寶：第二個「寶」依課本讀輕聲
  3: { 0: { 0: "\u{E01E1}" }, 2: { 0: "\u{E01E1}" } }, // 背著書包：背讀ㄅㄟ
  4: { 1: { 0: "\u{E01E2}" } }, // 一起：一讀ㄧˋ
  5: {
    1: { 0: "\u{E01E2}" },
    2: { 1: "\u{E01E1}" },
    4: { 2: "\u{E01E1}" },
    3: { 0: "\u{E01E1}" },
    5: { 0: "\u{E01E1}" },
  }, // 一朵、謝謝、教我（教讀第一聲）
  6: {
    0: { 3: "\u{E01E1}" },
    1: { 3: "\u{E01E1}" },
    2: { 1: "\u{E01E1}" },
    4: { 4: "\u{E01E1}" },
    6: { 0: "\u{E01E1}" },
  }, // 子、得、覺、不
  7: {
    1: { 0: "\u{E01E1}", 4: "\u{E01E1}" },
    2: { 1: "\u{E01E1}", 3: "\u{E01E1}" },
    6: { 5: "\u{E01E1}" },
    9: { 3: "\u{E01E1}" },
    10: { 2: "\u{E01E2}", 6: "\u{E01E1}" },
  }, // 長、蔔、子、不、一
};

export const firstLessonLines = [
  [
    { character: "咪", zhuyin: "ㄇㄧ" },
    { character: "咪", zhuyin: "ㄇㄧ" },
    { character: "咪", zhuyin: "ㄇㄧ" },
  ],
  [
    { character: "咪", zhuyin: "ㄇㄧ" },
    { character: "咪", zhuyin: "ㄇㄧ" },
    { character: "咪", zhuyin: "ㄇㄧ" },
  ],
  [{ character: "逼", zhuyin: "ㄅㄧ" }],
  [
    { character: "貓", zhuyin: "ㄇㄠ" },
    { character: "咪", zhuyin: "ㄇㄧ" },
    { character: "弟", zhuyin: "ㄉㄧˋ" },
    { character: "弟", zhuyin: "˙ㄉㄧ" },
  ],
  [
    { character: "跑", zhuyin: "ㄆㄠˇ" },
    { character: "第", zhuyin: "ㄉㄧˋ" },
    { character: "一", zhuyin: "ㄧ" },
  ],
] as const;

export const secondLessonLines = [
  [
    { character: "鵝", zhuyin: "ㄜˊ" },
    { character: "鵝", zhuyin: "ㄜˊ" },
    { character: "鵝", zhuyin: "ㄜˊ" },
  ],
  [
    { character: "鵝", zhuyin: "ㄜˊ" },
    { character: "鵝", zhuyin: "ㄜˊ" },
    { character: "鵝", zhuyin: "ㄜˊ" },
  ],
  [
    { character: "哈", zhuyin: "ㄏㄚ" },
    { character: "哈", zhuyin: "ㄏㄚ" },
    { character: "哈", zhuyin: "ㄏㄚ" },
  ],
  [
    { character: "好", zhuyin: "ㄏㄠˇ" },
    { character: "得", zhuyin: "ㄉㄜˊ" },
    { character: "意", zhuyin: "ㄧˋ" },
  ],
  [
    { character: "孵", zhuyin: "ㄈㄨ" },
    { character: "出", zhuyin: "ㄔㄨ" },
  ],
  [
    { character: "五", zhuyin: "ㄨˇ" },
    { character: "隻", zhuyin: "ㄓ" },
    { character: "鵝", zhuyin: "ㄜˊ" },
    { character: "寶", zhuyin: "ㄅㄠˇ" },
    { character: "寶", zhuyin: "˙ㄅㄠ" },
  ],
] as const;

export const thirdLessonLines = [
  [
    { character: "河", zhuyin: "ㄏㄜˊ" },
    { character: "馬", zhuyin: "ㄇㄚˇ" },
    { character: "要", zhuyin: "ㄧㄠˋ" },
    { character: "去", zhuyin: "ㄑㄩˋ" },
    { character: "泡", zhuyin: "ㄆㄠˋ" },
    { character: "澡", zhuyin: "ㄗㄠˇ" },
  ],
  [
    { character: "半", zhuyin: "ㄅㄢˋ" },
    { character: "路", zhuyin: "ㄌㄨˋ" },
    { character: "遇", zhuyin: "ㄩˋ" },
    { character: "到", zhuyin: "ㄉㄠˋ" },
    { character: "河", zhuyin: "ㄏㄜˊ" },
    { character: "狸", zhuyin: "ㄌㄧˊ" },
  ],
  [{ character: "喔", zhuyin: "ㄛ" }],
  [
    { character: "河", zhuyin: "ㄏㄜˊ" },
    { character: "狸", zhuyin: "ㄌㄧˊ" },
  ],
  [
    { character: "忙", zhuyin: "ㄇㄤˊ" },
    { character: "著", zhuyin: "˙ㄓㄜ" },
    { character: "築", zhuyin: "ㄓㄨˊ" },
    { character: "巢", zhuyin: "ㄔㄠˊ" },
  ],
] as const;

export const fourthLessonLines = [
  [
    { character: "背", zhuyin: "ㄅㄟ" },
    { character: "著", zhuyin: "˙ㄓㄜ" },
    { character: "書", zhuyin: "ㄕㄨ" },
    { character: "包", zhuyin: "ㄅㄠ" },
  ],
  [
    { character: "手", zhuyin: "ㄕㄡˇ" },
    { character: "拉", zhuyin: "ㄌㄚ" },
    { character: "手", zhuyin: "ㄕㄡˇ" },
  ],
  [
    { character: "背", zhuyin: "ㄅㄟ" },
    { character: "著", zhuyin: "˙ㄓㄜ" },
    { character: "書", zhuyin: "ㄕㄨ" },
    { character: "包", zhuyin: "ㄅㄠ" },
  ],
  [
    { character: "笑", zhuyin: "ㄒㄧㄠˋ" },
    { character: "嘻", zhuyin: "ㄒㄧ" },
    { character: "嘻", zhuyin: "ㄒㄧ" },
  ],
  [
    { character: "一", zhuyin: "ㄧ" },
    { character: "二", zhuyin: "ㄦˋ" },
    { character: "一", zhuyin: "ㄧ" },
  ],
  [
    { character: "好", zhuyin: "ㄏㄠˇ" },
    { character: "歡", zhuyin: "ㄏㄨㄢ" },
    { character: "喜", zhuyin: "ㄒㄧˇ" },
  ],
] as const;

export function annotateLessonLines(
  lines: readonly string[],
  pronunciations: readonly (readonly string[])[],
): SyllableItem[][] {
  if (lines.length !== pronunciations.length) throw new Error("課文行數與注音行數不一致");
  return lines.map((line, lineIndex) => {
    const characters = Array.from(line).filter((character) => character.trim() !== "");
    const sounds = pronunciations[lineIndex];
    if (characters.length !== sounds.length)
      throw new Error(`第 ${lineIndex + 1} 行的課文與注音格數不一致`);
    return characters.map((character, index) => ({ character, zhuyin: sounds[index] }));
  });
}

export const fifthLessonLines = annotateLessonLines(lessons[4].lines, [
  ["ㄏㄠˇ", "ㄆㄥˊ", "ㄧㄡˇ"],
  ["ㄧˋ", "ㄑㄧˇ", "ㄌㄞˊ", "ㄨㄢˊ"],
  ["ㄑㄧㄠˋ", "ㄑㄧㄠˋ", "ㄅㄢˇ"],
  ["ㄕㄤˋ", "ㄕㄤˋ", "ㄒㄧㄚˋ", "ㄒㄧㄚˋ"],
  ["ㄍㄠ", "ㄍㄠ", "ㄉㄧ", "ㄉㄧ"],
  ["ㄏㄠˇ", "ㄒㄧㄤˋ", "ㄒㄧㄠˇ", "ㄋㄧㄠˇ"],
  ["ㄈㄟ", "ㄈㄟ", "ㄈㄟ"],
]);

export const sixthLessonLines = annotateLessonLines(lessons[5].lines, [
  ["ㄨㄛˇ", "ㄧㄠˋ", "ㄙㄨㄥˋ", "ㄌㄠˇ", "ㄕ"],
  ["ㄧˋ", "ㄉㄨㄛˇ", "ㄒㄧㄠˇ", "ㄏㄨㄥˊ", "ㄏㄨㄚ"],
  ["ㄒㄧㄝˋ", "˙ㄒㄧㄝ", "ㄌㄠˇ", "ㄕ"],
  ["ㄐㄧㄠ", "ㄨㄛˇ", "ㄉㄨˊ", "ㄕㄨ"],
  ["ㄧㄝˇ", "ㄒㄧㄝˋ", "˙ㄒㄧㄝ", "ㄌㄠˇ", "ㄕ"],
  ["ㄐㄧㄠ", "ㄨㄛˇ", "ㄏㄨㄚˋ", "ㄏㄨㄚˋ"],
]);

export const seventhLessonLines = annotateLessonLines(lessons[6].lines, [
  ["ㄨ", "ㄍㄨㄟ", "ㄊㄨˋ", "˙ㄗ", "ㄌㄞˊ", "ㄅㄧˇ", "ㄙㄞˋ"],
  ["ㄎㄢˋ", "ㄕㄟˊ", "ㄆㄠˇ", "˙ㄉㄜ", "ㄎㄨㄞˋ"],
  ["ㄊㄨˋ", "˙ㄗ", "ㄌㄧㄥˇ", "ㄒㄧㄢ"],
  ["ㄏㄚ", "ㄏㄚ", "ㄒㄧㄠˋ"],
  ["ㄕㄨˋ", "ㄒㄧㄚˋ", "ㄕㄨㄟˋ", "ㄨˇ", "ㄐㄧㄠˋ"],
  ["ㄨ", "ㄍㄨㄟ", "ㄌㄨㄛˋ", "ㄏㄡˋ"],
  ["ㄅㄨˊ", "ㄑㄧˋ", "ㄋㄟˇ"],
  ["ㄍㄣ", "ㄗㄞˋ", "ㄏㄡˋ", "ㄇㄧㄢˋ"],
  ["ㄓㄨㄟ", "ㄓㄨㄟ", "ㄓㄨㄟ"],
]);

export const eighthLessonLines = annotateLessonLines(lessons[7].lines, [
  ["ㄘㄞˋ", "ㄩㄢˊ", "ㄌㄧˇ"],
  ["ㄓㄤˇ", "ㄔㄨ", "ㄉㄚˋ", "ㄌㄨㄛˊ", "˙ㄅㄛ"],
  ["ㄊㄨˋ", "˙ㄗ", "ㄅㄚˊ", "ㄅㄨˊ", "ㄉㄨㄥˋ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄎㄨㄞˋ", "ㄎㄨㄞˋ", "ㄌㄞˊ"],
  ["ㄉㄚˋ", "ㄒㄧㄤˋ", "ㄌㄚ", "˙ㄓㄜ", "ㄏㄨㄤˊ", "ㄋㄧㄡˊ"],
  ["ㄏㄨㄤˊ", "ㄋㄧㄡˊ", "ㄌㄚ", "˙ㄓㄜ", "ㄨㄢˇ", "ㄒㄩㄥˊ"],
  ["ㄨㄢˇ", "ㄒㄩㄥˊ", "ㄌㄚ", "˙ㄓㄜ", "ㄊㄨˋ", "˙ㄗ"],
  ["ㄏㄟ", "ㄧㄛ", "ㄏㄟ", "ㄧㄛ"],
  ["ㄏㄠˇ", "ㄖㄜˋ", "ㄋㄠˋ"],
  ["ㄐㄩㄢˇ", "ㄑㄧˇ", "ㄒㄧㄡˋ", "˙ㄗ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄧˋ", "ㄑㄧˇ", "ㄅㄚˊ", "ㄌㄨㄛˊ", "˙ㄅㄛ"],
]);

export const ninthLessonLines = annotateLessonLines(lessons[8].lines, [
  ["ㄕㄢ", "ㄧㄞˊ", "ㄒㄧㄚˋ"],
  ["ㄉㄨㄥˋ", "ㄨˋ", "ㄎㄨㄤˊ", "ㄏㄨㄢ", "ㄏㄨㄟˋ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄎㄞ", "ㄒㄧㄣ", "ㄌㄞˊ", "ㄑㄧㄥˋ", "ㄓㄨˋ"],
  ["ㄒㄧㄠˇ", "ㄒㄩㄥˊ", "ㄍㄨㄣˇ", "ㄉㄚˋ", "ㄑㄧㄡˊ"],
  ["ㄒㄩㄣˊ", "ㄌㄨˋ", "ㄑㄧㄠ", "ㄉㄚˋ", "ㄍㄨˇ"],
  ["ㄎㄨㄥˇ", "ㄑㄩㄝˋ", "ㄅㄧㄢˋ", "ㄇㄛˊ", "ㄕㄨˋ"],
  ["ㄑㄧㄥ", "ㄨㄚ", "ㄉㄚˋ", "ㄏㄜˊ", "ㄔㄤˋ"],
  ["ㄍㄨㄛ", "ㄍㄨㄛ", "ㄍㄨㄛ", "ㄉㄨㄥ", "ㄉㄨㄥ", "ㄉㄨㄥ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "˙ㄉㄜ", "ㄅㄧㄠˇ", "ㄧㄢˇ"],
  ["ㄓㄣ", "ㄐㄧㄥ", "ㄘㄞˇ"],
]);

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

export const exercises: Record<number, LessonExercise> = {
  0: { lines: firstLessonLines, questions: firstListeningQuestions },
  1: { lines: secondLessonLines, questions: secondListeningQuestions },
  2: { lines: thirdLessonLines, questions: thirdListeningQuestions },
  3: { lines: fourthLessonLines, questions: fourthListeningQuestions },
  4: { lines: fifthLessonLines, questions: fifthListeningQuestions },
  5: { lines: sixthLessonLines, questions: sixthListeningQuestions },
  6: { lines: seventhLessonLines, questions: seventhListeningQuestions },
  7: { lines: eighthLessonLines, questions: eighthListeningQuestions },
  8: { lines: ninthLessonLines, questions: ninthListeningQuestions },
};

export const siteReleaseNotes = [
  [
    "0.1.0-beta.2",
    "裝置內自訂讀音與書寫整理",
    "新增生字、語詞錄音與音檔匯入，試聽確認後依字詞及指定注音替換聽寫／短練習讀音；正常速度播放，可下載備份。錄音只存在目前瀏覽器，不會上傳。默寫工作區更精簡，位置預覽維持按住查看。",
  ],
  [
    "0.1.0-beta.1",
    "首個公開測試版",
    "收錄一至九課，提供直式課文預覽、逐格手寫默寫與家長檢查；聽寫會隨機抽題，並支援間隔重播、補強和錯題收藏。單個注音符號使用教育部錄音。",
  ],
] as const;
