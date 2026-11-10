/** 康軒 一上 第一冊's 生字 in the order of 本冊生字 (pp. 80–81): the numbers, then each lesson's.
 * `art` is the lesson's watercolor in course-art/ (scripts/slice-book1.py). */
export const book1Lessons = [
  {
    id: 0,
    number: "一到十",
    title: "國字真簡單",
    art: "book1-numbers",
    characters: "一二三四五六七八九十",
  },
  { id: 1, number: "第一課", title: "拍拍手", art: "book1-clap", characters: "拍手左右你他也上下" },
  {
    id: 2,
    number: "第二課",
    title: "這是誰的",
    art: "book1-whose",
    characters: "這是誰的我分好了啊多個",
  },
  {
    id: 3,
    number: "第三課",
    title: "秋千",
    art: "book1-swing",
    characters: "秋千和玩陪高山到大海朋友們起",
  },
  {
    id: 4,
    number: "第四課",
    title: "大個子小個子",
    art: "book1-frogs",
    characters: "子小課兩人拉看找隻青蛙開心",
  },
  {
    id: 5,
    number: "第五課",
    title: "比一比",
    art: "book1-door",
    characters: "比門裡外有什麼不同早晚王主又",
  },
  {
    id: 6,
    number: "第六課",
    title: "小路",
    art: "book1-path",
    characters: "路長白花紅走在向說朵從頭那",
  },
] as const;
export type Book1Lesson = (typeof book1Lessons)[number];
/** 「第一課 拍拍手」, or 「國字真簡單」 for the numbers. */
export const book1LessonLabel = (lesson: Book1Lesson) =>
  lesson.id === 0 ? lesson.title : `${lesson.number} ${lesson.title}`;

/**
 * Each 生字's 部首 and 總筆畫數 as 我會寫字 prints them (the numbers' from 全字庫, since
 * 國字真簡單 prints none). Where 全字庫 differs, the book wins: it counts 裡 as 12 strokes.
 */
export const book1Facts: Record<string, { radical: string; strokes: number }> = Object.fromEntries(
  [
    "一一1 二二2 三一3 四囗5 五二4 六八4 七一2 八八2 九乙2 十十2",
    "拍手8 手手4 左工5 右口5 你人7 他人5 也乙3 上一3 下一3",
    "這辵11 是日9 誰言15 的白8 我戈7 分刀4 好女6 了亅2 啊口11 多夕6 個人10",
    "秋禾9 千十3 和口8 玩玉8 陪阜11 高高10 山山3 到刀8 大大3 海水10 朋月8 友又4 們人10 起走10",
    "子子3 小小3 課言15 兩入8 人人2 拉手8 看目9 找手7 隻隹10 青青8 蛙虫12 開門12 心心4",
    "比比4 門門8 裡衣12 外夕5 有月6 什人4 麼麻14 不一4 同口6 早日6 晚日11 王玉4 主丶5 又又2",
    "路足13 長長8 白白5 花艸8 紅糸9 走走7 在土6 向口6 說言14 朵木6 從彳11 頭頁16 那邑7",
  ]
    .join(" ")
    .split(" ")
    .map((entry) => {
      const [character, radical, ...count] = [...entry];
      return [character, { radical, strokes: Number(count.join("")) }];
    }),
);

/** Each 生字's reading as 本冊生字 prints it, one syllable per character, in the book's order. */
const readings = [
  "ㄧ ㄦˋ ㄙㄢ ㄙˋ ㄨˇ ㄌㄧㄡˋ ㄑㄧ ㄅㄚ ㄐㄧㄡˇ ㄕˊ",
  "ㄆㄞ ㄕㄡˇ ㄗㄨㄛˇ ㄧㄡˋ ㄋㄧˇ ㄊㄚ ㄧㄝˇ ㄕㄤˋ ㄒㄧㄚˋ",
  "ㄓㄜˋ ㄕˋ ㄕㄟˊ ˙ㄉㄜ ㄨㄛˇ ㄈㄣ ㄏㄠˇ ˙ㄌㄜ ㄚ ㄉㄨㄛ ㄍㄜˋ",
  "ㄑㄧㄡ ㄑㄧㄢ ㄏㄢˋ ㄨㄢˊ ㄆㄟˊ ㄍㄠ ㄕㄢ ㄉㄠˋ ㄉㄚˋ ㄏㄞˇ ㄆㄥˊ ㄧㄡˇ ˙ㄇㄣ ㄑㄧˇ",
  "˙ㄗ ㄒㄧㄠˇ ㄎㄜˋ ㄌㄧㄤˇ ㄖㄣˊ ㄌㄚ ㄎㄢˋ ㄓㄠˇ ㄓ ㄑㄧㄥ ㄨㄚ ㄎㄞ ㄒㄧㄣ",
  "ㄅㄧˇ ㄇㄣˊ ㄌㄧˇ ㄨㄞˋ ㄧㄡˇ ㄕㄣˊ ˙ㄇㄜ ㄅㄨˋ ㄊㄨㄥˊ ㄗㄠˇ ㄨㄢˇ ㄨㄤˊ ㄓㄨˇ ㄧㄡˋ",
  "ㄌㄨˋ ㄔㄤˊ ㄅㄞˊ ㄏㄨㄚ ㄏㄨㄥˊ ㄗㄡˇ ㄗㄞˋ ㄒㄧㄤˋ ㄕㄨㄛ ㄉㄨㄛˇ ㄘㄨㄥˊ ㄊㄡˊ ㄋㄚˋ",
];
export const book1Readings: Record<string, string> = Object.fromEntries(
  book1Lessons.flatMap((lesson, i) => {
    const syllables = readings[i].split(" ");
    return [...lesson.characters].map((character, k) => [character, syllables[k]]);
  }),
);
