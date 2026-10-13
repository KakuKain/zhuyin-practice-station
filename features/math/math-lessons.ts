import { readingVariants } from "../lesson/reading-variants";

/** 康軒 115 一年級上 數學, in the order the class teaches it. */
export type MathLesson = {
  /**
   * Permanent: saved rounds, records and tasks name a lesson by id. What the child sees is the
   * list's order and `number`. Id 3 was 加法 until 加法 became part of 分與合, so its saved rounds
   * and tasks carry on there; 排順序、比多少 came later as id 4.
   */
  id: number;
  number: string;
  title: string;
  ready: boolean;
  /** Tapped and checked at once (no parent check, not saved mid-round), or written and checked. */
  practice: "tap" | "write";
  /** The watercolor picture on its course card and page. */
  art: string;
  /** Questions in one round. */
  questions: number;
  /** What the lesson practises, shown on its page. */
  parts: string[];
};

export const mathLessons: MathLesson[] = [
  {
    id: 1,
    number: "第一課",
    title: "認識 1～10",
    ready: true,
    practice: "write",
    art: "goose-watercolor",
    questions: 8,
    parts: ["數一數", "畫圈圈"],
  },
  {
    id: 2,
    number: "第二課",
    title: "比長短",
    ready: true,
    practice: "tap",
    art: "blue-watercolor-pencil-v2",
    questions: 6,
    parts: ["比長短", "比高矮", "直線、曲線", "哪條路最近"],
  },
  {
    id: 4,
    number: "第三課",
    title: "排順序、比多少",
    ready: true,
    practice: "tap",
    art: "race-watercolor",
    questions: 8,
    parts: ["第幾個", "數的順序", "比多少", "比大小"],
  },
  {
    id: 3,
    number: "第四課",
    title: "分與合",
    ready: true,
    practice: "write",
    art: "seesaw-watercolor",
    questions: 10,
    parts: ["分一分", "合一合", "分分看", "合在一起", "畫圈圈算加法"],
  },
];

/**
 * Every word on the math course cards, lesson pages and practice screens, with one reading per
 * Han character, so they show in 國字注音. A unit test checks the font shows exactly these readings.
 */
export const mathWordReadings: Record<string, string> = {
  數學: "ㄕㄨˋ ㄒㄩㄝˊ",
  第一課: "ㄉㄧˋ ㄧ ㄎㄜˋ",
  第二課: "ㄉㄧˋ ㄦˋ ㄎㄜˋ",
  第三課: "ㄉㄧˋ ㄙㄢ ㄎㄜˋ",
  第四課: "ㄉㄧˋ ㄙˋ ㄎㄜˋ",
  "認識 1～10": "ㄖㄣˋ ㄕˋ",
  比長短: "ㄅㄧˇ ㄔㄤˊ ㄉㄨㄢˇ",
  "排順序、比多少": "ㄆㄞˊ ㄕㄨㄣˋ ㄒㄩˋ ㄅㄧˇ ㄉㄨㄛ ㄕㄠˇ",
  分與合: "ㄈㄣ ㄩˇ ㄏㄜˊ",
  數一數: "ㄕㄨˇ ㄧ ㄕㄨˇ",
  畫圈圈: "ㄏㄨㄚˋ ㄑㄩㄢ ㄑㄩㄢ",
  比高矮: "ㄅㄧˇ ㄍㄠ ㄞˇ",
  第幾個: "ㄉㄧˋ ㄐㄧˇ ㄍㄜˋ",
  數的順序: "ㄕㄨˋ ˙ㄉㄜ ㄕㄨㄣˋ ㄒㄩˋ",
  比多少: "ㄅㄧˇ ㄉㄨㄛ ㄕㄠˇ",
  比大小: "ㄅㄧˇ ㄉㄚˋ ㄒㄧㄠˇ",
  一樣多: "ㄧ ㄧㄤˋ ㄉㄨㄛ",
  左邊: "ㄗㄨㄛˇ ㄅㄧㄢ",
  右邊: "ㄧㄡˋ ㄅㄧㄢ",
  "直線、曲線": "ㄓˊ ㄒㄧㄢˋ ㄑㄩ ㄒㄧㄢˋ",
  哪條路最近: "ㄋㄚˇ ㄊㄧㄠˊ ㄌㄨˋ ㄗㄨㄟˋ ㄐㄧㄣˋ",
  合在一起: "ㄏㄜˊ ㄗㄞˋ ㄧ ㄑㄧˇ",
  畫圈圈算加法: "ㄏㄨㄚˋ ㄑㄩㄢ ㄑㄩㄢ ㄙㄨㄢˋ ㄐㄧㄚ ㄈㄚˇ",
  分一分: "ㄈㄣ ㄧ ㄈㄣ",
  合一合: "ㄏㄜˊ ㄧ ㄏㄜˊ",
  分分看: "ㄈㄣ ㄈㄣ ㄎㄢˋ",
  這一課: "ㄓㄜˋ ㄧ ㄎㄜˋ",
  開始: "ㄎㄞ ㄕˇ",
  開始練習: "ㄎㄞ ㄕˇ ㄌㄧㄢˋ ㄒㄧˊ",
  繼續: "ㄐㄧˋ ㄒㄩˋ",
  繼續練習: "ㄐㄧˋ ㄒㄩˋ ㄌㄧㄢˋ ㄒㄧˊ",
  第: "ㄉㄧˋ",
  從頭開始: "ㄘㄨㄥˊ ㄊㄡˊ ㄎㄞ ㄕˇ",
  題: "ㄊㄧˊ",
  多畫了: "ㄉㄨㄛ ㄏㄨㄚˋ ˙ㄌㄜ",
  個: "ㄍㄜˋ",
};

/** A math word with the selectors that make it show its reading. */
export const mathWord = (text: string) => ({
  text,
  variants: readingVariants(text, mathWordReadings[text] ?? ""),
});
