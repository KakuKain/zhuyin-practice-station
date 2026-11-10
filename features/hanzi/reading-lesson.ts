/**
 * 閱讀階梯「擁抱」(康軒 一上 第一冊, pp. 74–79): practice after the child reads the story in the
 * book. The story's text stays in the book (it is an author's work and the site is public); the
 * scenes and questions here are short sentences of our own about what happens in it.
 *
 * Every text a child sees or hears has one syllable per Han character, as in the rest of 第一冊.
 */
export const readingLessonId = -2;

/** Pictures painted so far (`public/course-art/reading/<art>.webp`); the rest show words. */
export const paintedReading: string[] = [
  ...["alone", "frog-runs", "elephant-hurt", "stuck", "climb", "hug"],
  ...["frog", "elephant", "bear", "girl", "hedgehog", "balloon", "bag", "hat"],
];

import type { Said } from "./clip-voice";
export type { Said };

/** The story's scenes in order, each a picture (`art`, cut from the scenes sheet) and a line. */
export const readingScenes: (Said & { art: string })[] = [
  {
    art: "alone",
    text: "大家都不敢靠近小刺蝟",
    readings: "ㄉㄚˋ ㄐㄧㄚ ㄉㄡ ㄅㄨˋ ㄍㄢˇ ㄎㄠˋ ㄐㄧㄣˋ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ",
  },
  {
    art: "frog-runs",
    text: "青蛙大叫，跳走了",
    readings: "ㄑㄧㄥ ㄨㄚ ㄉㄚˋ ㄐㄧㄠˋ ㄊㄧㄠˋ ㄗㄡˇ ˙ㄌㄜ",
  },
  {
    art: "elephant-hurt",
    text: "小象被刺到，痛得抬起腳",
    readings: "ㄒㄧㄠˇ ㄒㄧㄤˋ ㄅㄟˋ ㄘˋ ㄉㄠˋ ㄊㄨㄥˋ ˙ㄉㄜ ㄊㄞˊ ㄑㄧˇ ㄐㄧㄠˇ",
  },
  {
    art: "stuck",
    text: "小女孩的氣球卡在樹上",
    readings: "ㄒㄧㄠˇ ㄋㄩˇ ㄏㄞˊ ˙ㄉㄜ ㄑㄧˋ ㄑㄧㄡˊ ㄑㄧㄚˇ ㄗㄞˋ ㄕㄨˋ ㄕㄤˋ",
  },
  {
    art: "climb",
    text: "小刺蝟爬上樹，拿下氣球",
    readings: "ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ ㄆㄚˊ ㄕㄤˋ ㄕㄨˋ ㄋㄚˊ ㄒㄧㄚˋ ㄑㄧˋ ㄑㄧㄡˊ",
  },
  { art: "hug", text: "小熊抱住小刺蝟", readings: "ㄒㄧㄠˇ ㄒㄩㄥˊ ㄅㄠˋ ㄓㄨˋ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ" },
];

/** Who and what the questions' picture answers show, cut from the characters sheet. */
export const readingThings: Record<string, Said> = {
  frog: { text: "青蛙", readings: "ㄑㄧㄥ ㄨㄚ" },
  elephant: { text: "小象", readings: "ㄒㄧㄠˇ ㄒㄧㄤˋ" },
  bear: { text: "小熊", readings: "ㄒㄧㄠˇ ㄒㄩㄥˊ" },
  girl: { text: "小女孩", readings: "ㄒㄧㄠˇ ㄋㄩˇ ㄏㄞˊ" },
  hedgehog: { text: "小刺蝟", readings: "ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ" },
  balloon: { text: "氣球", readings: "ㄑㄧˋ ㄑㄧㄡˊ" },
  bag: { text: "書包", readings: "ㄕㄨ ㄅㄠ" },
  hat: { text: "帽子", readings: "ㄇㄠˋ ˙ㄗ" },
};

/**
 * A question heard and shown, answered by tapping one of three: pictures of `readingThings`, or
 * short sentences in 國字注音 where no picture can say it. The first choice is the answer.
 */
export type ReadingQuestion = Said & { id: string } & (
    { pictures: string[] } | { sentences: Said[] }
  );

export const readingQuestions: ReadingQuestion[] = [
  {
    id: "why-sad",
    text: "一開始，小刺蝟為什麼不快樂？",
    readings: "ㄧˋ ㄎㄞ ㄕˇ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ ㄨㄟˋ ㄕㄣˊ ˙ㄇㄜ ㄅㄨˊ ㄎㄨㄞˋ ㄌㄜˋ",
    sentences: [
      { text: "大家都怕他的刺", readings: "ㄉㄚˋ ㄐㄧㄚ ㄉㄡ ㄆㄚˋ ㄊㄚ ˙ㄉㄜ ㄘˋ" },
      { text: "他找不到家", readings: "ㄊㄚ ㄓㄠˇ ㄅㄨˊ ㄉㄠˋ ㄐㄧㄚ" },
      { text: "他的肚子餓了", readings: "ㄊㄚ ˙ㄉㄜ ㄉㄨˋ ˙ㄗ ㄜˋ ˙ㄌㄜ" },
    ],
  },
  {
    id: "frog",
    text: "誰看到小刺蝟，就大叫跳走了？",
    readings: "ㄕㄟˊ ㄎㄢˋ ㄉㄠˋ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ ㄐㄧㄡˋ ㄉㄚˋ ㄐㄧㄠˋ ㄊㄧㄠˋ ㄗㄡˇ ˙ㄌㄜ",
    pictures: ["frog", "elephant", "bear"],
  },
  {
    id: "elephant",
    text: "誰被小刺蝟刺到，痛得抬起腳？",
    readings: "ㄕㄟˊ ㄅㄟˋ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ ㄘˋ ㄉㄠˋ ㄊㄨㄥˋ ˙ㄉㄜ ㄊㄞˊ ㄑㄧˇ ㄐㄧㄠˇ",
    pictures: ["elephant", "frog", "girl"],
  },
  {
    id: "girl",
    text: "誰在樹下哭？",
    readings: "ㄕㄟˊ ㄗㄞˋ ㄕㄨˋ ㄒㄧㄚˋ ㄎㄨ",
    pictures: ["girl", "bear", "elephant"],
  },
  {
    id: "stuck",
    text: "什麼東西卡在樹上？",
    readings: "ㄕㄣˊ ˙ㄇㄜ ㄉㄨㄥ ˙ㄒㄧ ㄑㄧㄚˇ ㄗㄞˋ ㄕㄨˋ ㄕㄤˋ",
    pictures: ["balloon", "bag", "hat"],
  },
  {
    id: "glad",
    text: "小刺蝟拿下氣球以後，為什麼好開心？",
    readings:
      "ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ ㄋㄚˊ ㄒㄧㄚˋ ㄑㄧˋ ㄑㄧㄡˊ ㄧˇ ㄏㄡˋ ㄨㄟˋ ㄕㄣˊ ˙ㄇㄜ ㄏㄠˇ ㄎㄞ ㄒㄧㄣ",
    sentences: [
      { text: "他沒有把氣球刺破", readings: "ㄊㄚ ㄇㄟˊ ㄧㄡˇ ㄅㄚˇ ㄑㄧˋ ㄑㄧㄡˊ ㄘˋ ㄆㄛˋ" },
      { text: "小女孩送他氣球", readings: "ㄒㄧㄠˇ ㄋㄩˇ ㄏㄞˊ ㄙㄨㄥˋ ㄊㄚ ㄑㄧˋ ㄑㄧㄡˊ" },
      { text: "他飛到天上", readings: "ㄊㄚ ㄈㄟ ㄉㄠˋ ㄊㄧㄢ ㄕㄤˋ" },
    ],
  },
  {
    id: "hug",
    text: "最後，誰抱了小刺蝟？",
    readings: "ㄗㄨㄟˋ ㄏㄡˋ ㄕㄟˊ ㄅㄠˋ ˙ㄌㄜ ㄒㄧㄠˇ ㄘˋ ㄨㄟˋ",
    pictures: ["bear", "elephant", "frog"],
  },
];

/** What 排一排 asks before the scenes. */
export const orderPrompt: Said = {
  text: "照故事的順序，點一點",
  readings: "ㄓㄠˋ ㄍㄨˋ ㄕˋ ˙ㄉㄜ ㄕㄨㄣˋ ㄒㄩˋ ㄉㄧㄢˇ ㄧ ㄉㄧㄢˇ",
};

export type ReadingStep =
  | { kind: "order"; scenes: number[] }
  | { kind: "question"; question: ReadingQuestion; order: number[] };

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A round: 排一排 four of the six scenes (shown mixed, tapped in the story's order), then five of
 * the questions in the story's order, each with its three choices mixed.
 */
export function buildReadingRound(random = Math.random): ReadingStep[] {
  const scenes = shuffle(
    readingScenes.map((_, i) => i),
    random,
  )
    .slice(0, 4)
    .sort((a, b) => a - b);
  const asked = shuffle(
    readingQuestions.map((_, i) => i),
    random,
  )
    .slice(0, 5)
    .sort((a, b) => a - b);
  return [
    { kind: "order", scenes: shuffle(scenes, random) },
    ...asked.map((i): ReadingStep => ({
      kind: "question",
      question: readingQuestions[i],
      order: shuffle([0, 1, 2], random),
    })),
  ];
}

/** Every text the lesson speaks, for the clips. */
export const readingClips: Said[] = [
  orderPrompt,
  ...readingScenes,
  ...Object.values(readingThings),
  ...readingQuestions.flatMap((q) => [q, ...("sentences" in q ? q.sentences : [])]),
];
