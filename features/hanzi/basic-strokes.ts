/**
 * 認識國字基本筆畫 (康軒 一上 第一冊, pp. 8–11): the 28 basic strokes in the book's order, page by
 * page, each read column by column from the right as the book is.
 *
 * `find` is a character to find the stroke in and which of its strokes (from 0, in the order of
 * strokes.json or stroke-examples.json) are that stroke; the first of them is also the shape the
 * child traces and picks. Each was checked by eye against the book's examples, and is one of
 * those examples, a 第一冊 生字 where the book gives one.
 */
export type BasicStroke = {
  name: string;
  page: 8 | 9 | 10 | 11;
  find: { character: string; strokes: number[] };
};

const stroke = (name: string, page: BasicStroke["page"], character: string, ...strokes: number[]) =>
  ({ name, page, find: { character, strokes } }) satisfies BasicStroke;

export const basicStrokes: BasicStroke[] = [
  stroke("橫", 8, "子", 2),
  stroke("豎", 8, "上", 0),
  stroke("點", 8, "主", 0),
  stroke("撇", 8, "他", 0),
  stroke("挑", 8, "拍", 2),
  stroke("捺", 8, "大", 2),
  stroke("橫折", 9, "四", 1),
  stroke("豎折", 9, "七", 1),
  stroke("橫撇", 9, "又", 0),
  stroke("橫鉤", 9, "你", 3),
  stroke("豎鉤", 9, "小", 0),
  stroke("豎挑", 9, "比", 1),
  stroke("斜鉤", 9, "我", 4),
  stroke("臥鉤", 9, "心", 1),
  stroke("彎鉤", 10, "手", 3),
  stroke("橫折鉤", 10, "的", 6),
  stroke("橫曲鉤", 10, "九", 1),
  stroke("豎曲鉤", 10, "玩", 7),
  stroke("橫斜鉤", 10, "風", 1),
  stroke("豎撇", 10, "朋", 0, 4),
  stroke("撇橫", 11, "互", 1),
  stroke("撇挑", 11, "公", 2),
  stroke("撇頓點", 11, "好", 0),
  stroke("長頓點", 11, "不", 3),
  stroke("橫折橫", 11, "朵", 1),
  stroke("豎橫折", 11, "吳", 3),
  stroke("豎橫折鉤", 11, "弟", 4),
  stroke("橫撇橫折鉤", 11, "乃", 0),
];

export const strokePages = [8, 9, 10, 11] as const;
export type StrokePage = (typeof strokePages)[number];

/** One syllable for each character of the strokes' names, as the book annotates them. */
export const strokeNameReadings: Record<string, string> = {
  橫: "ㄏㄥˊ",
  豎: "ㄕㄨˋ",
  點: "ㄉㄧㄢˇ",
  撇: "ㄆㄧㄝˇ",
  挑: "ㄊㄧㄠˇ",
  捺: "ㄋㄚˋ",
  折: "ㄓㄜˊ",
  鉤: "ㄍㄡ",
  斜: "ㄒㄧㄝˊ",
  臥: "ㄨㄛˋ",
  彎: "ㄨㄢ",
  曲: "ㄑㄩ",
  長: "ㄔㄤˊ",
  頓: "ㄉㄨㄣˋ",
};

/** 「ㄏㄥˊ ㄓㄜˊ ㄍㄡ」 for 橫折鉤. */
export const strokeReading = (name: string) =>
  [...name].map((character) => strokeNameReadings[character]).join(" ");

/** The strokes lesson in 第一冊's list (`hanziLessonId`); 生字 lessons use 0 and up. */
export const strokesLessonId = -1;

/**
 * What each question says before the stroke's name, spoken as its own clip and then the name's
 * (no clip has both, so 28 names and 3 instructions voice every question).
 */
export const strokePrompts = {
  trace: { text: "照著箭頭描一描", readings: "ㄓㄠˋ ˙ㄓㄜ ㄐㄧㄢˋ ㄊㄡˊ ㄇㄧㄠˊ ㄧ ㄇㄧㄠˊ" },
  pick: {
    text: "聽一聽，點出這個筆畫",
    readings: "ㄊㄧㄥ ㄧ ㄊㄧㄥ ㄉㄧㄢˇ ㄔㄨ ㄓㄜˋ ˙ㄍㄜ ㄅㄧˇ ㄏㄨㄚˋ",
  },
  find: { text: "在這個字裡，找一找", readings: "ㄗㄞˋ ㄓㄜˋ ˙ㄍㄜ ㄗˋ ㄌㄧˇ ㄓㄠˇ ㄧ ㄓㄠˇ" },
} as const;
export type StrokeQuestionKind = keyof typeof strokePrompts;

/** Every clip the lesson plays, with one syllable per Han character. */
export const strokeClips = [
  ...Object.values(strokePrompts),
  ...basicStrokes.map((stroke) => ({ text: stroke.name, readings: strokeReading(stroke.name) })),
];

export type StrokeQuestion =
  | { kind: "trace"; stroke: string }
  | { kind: "pick"; stroke: string; choices: string[] }
  | { kind: "find"; stroke: string };

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * One page's round: 描一描 every stroke in the book's order, then 3 聽名稱找筆畫 (the stroke among
 * four of the page) and 3 在字裡找筆畫, which ask other strokes than the picks where the page has
 * enough.
 */
export function buildStrokeRound(page: StrokePage, random = Math.random): StrokeQuestion[] {
  const names = basicStrokes.filter((stroke) => stroke.page === page).map((stroke) => stroke.name);
  const order = shuffle(names, random);
  const picks = order.slice(0, 3);
  const finds = order.slice(3, 6);
  return [
    ...names.map((stroke): StrokeQuestion => ({ kind: "trace", stroke })),
    ...picks.map((stroke): StrokeQuestion => ({
      kind: "pick",
      stroke,
      choices: shuffle(
        [
          stroke,
          ...shuffle(
            names.filter((name) => name !== stroke),
            random,
          ).slice(0, 3),
        ],
        random,
      ),
    })),
    ...finds.map((stroke): StrokeQuestion => ({ kind: "find", stroke })),
  ];
}

export const strokeNamed = (name: string) => {
  const stroke = basicStrokes.find((item) => item.name === name);
  if (!stroke) throw new Error(`no stroke named ${name}`);
  return stroke;
};
