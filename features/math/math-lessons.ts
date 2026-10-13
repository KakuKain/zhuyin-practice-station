import { readingVariants } from "../lesson/reading-variants";

/** 康軒 115 一年級數學, 上學期 and 下學期, in the order the textbook teaches them. */
type LessonBase = {
  /**
   * Permanent: saved rounds, records and tasks name a lesson by id. What the child sees is the
   * list's order and `number`. Id 3 has always been 加法 (第七課 10以內的加法), so 第三課
   * 排順序、比多少 is id 7.
   */
  id: number;
  term: "上" | "下";
  number: string;
  title: string;
  /** The textbook's sections; for a lesson that is ready, what its round practises. */
  parts: string[];
};

export type MathLesson = LessonBase & {
  ready: true;
  /** Tapped and checked at once (no parent check, not saved mid-round), or written and checked. */
  practice: "tap" | "write";
  /** The watercolor picture on its course card and page. */
  art: string;
  /** Questions in one round. */
  questions: number;
};

/** A lesson in the textbook that the site does not have yet: listed as 製作中. */
export type ComingLesson = LessonBase & { ready: false };

const coming = (
  id: number,
  term: "上" | "下",
  number: string,
  title: string,
  parts: string[] = [],
) => ({ id, term, number, title, parts, ready: false }) as ComingLesson;

export const mathCourse: (MathLesson | ComingLesson)[] = [
  {
    id: 1,
    term: "上",
    number: "第一課",
    title: "10以內的數",
    ready: true,
    practice: "write",
    art: "goose-watercolor",
    questions: 9,
    parts: ["認識 1～5", "認識 6～10", "認識 0", "表示數量"],
  },
  {
    id: 2,
    term: "上",
    number: "第二課",
    title: "比長短",
    ready: true,
    practice: "tap",
    art: "blue-watercolor-pencil-v2",
    questions: 7,
    parts: ["比長短", "比高矮、比厚薄", "直線和曲線"],
  },
  {
    id: 7,
    term: "上",
    number: "第三課",
    title: "排順序、比多少",
    ready: true,
    practice: "tap",
    art: "race-watercolor",
    questions: 8,
    parts: ["排數字", "排在第幾個", "第幾個和幾個", "比多少"],
  },
  {
    id: 4,
    term: "上",
    number: "第四課",
    title: "分與合",
    ready: true,
    practice: "write",
    art: "seesaw-watercolor",
    questions: 8,
    parts: ["分一分", "合一合", "10的分與合"],
  },
  coming(5, "上", "第五課", "方盒、圓罐、球", ["堆疊與分類", "認識平面圖形", "做造型"]),
  // 比大小 here compares numbers up to 30.
  coming(6, "上", "第六課", "30以內的數", ["數到20", "數到30", "表示數量", "排在第幾個", "比大小"]),
  {
    id: 3,
    term: "上",
    number: "第七課",
    title: "10以內的加法",
    ready: true,
    practice: "write",
    art: "sound-complete-cat",
    questions: 8,
    parts: ["合起來是多少", "0的加法", "加加看"],
  },
  coming(8, "上", "第八課", "10以內的減法", ["剩下多少", "多多少、少多少", "減減看", "加加減減"]),
  coming(9, "上", "第九課", "幾點鐘", ["時間的先後和長短", "認識時鐘", "幾點鐘", "幾點半"]),
  // 下學期: only the textbook's list so far.
  coming(10, "下", "第一課", "50以內的數"),
  coming(11, "下", "第二課", "18以內的加法"),
  coming(12, "下", "第三課", "圖形與分類"),
  coming(13, "下", "第四課", "18以內的減法"),
  coming(14, "下", "第五課", "有多長"),
  coming(15, "下", "第六課", "100以內的數"),
  coming(16, "下", "第七課", "認識錢幣"),
  coming(17, "下", "第八課", "二位數的加減"),
  coming(18, "下", "第九課", "幾月幾日星期幾"),
];

/** The lessons a child can practise. */
export const mathLessons = mathCourse.filter((lesson): lesson is MathLesson => lesson.ready);

export const mathTerms = [
  { term: "上", name: "上學期" },
  { term: "下", name: "下學期" },
] as const;

/**
 * Every word on the math course cards, lesson pages and practice screens, with one reading per
 * Han character, so they show in 國字注音. A unit test checks the font shows exactly these readings.
 */
export const mathWordReadings: Record<string, string> = {
  數學: "ㄕㄨˋ ㄒㄩㄝˊ",
  上學期: "ㄕㄤˋ ㄒㄩㄝˊ ㄑㄧˊ",
  下學期: "ㄒㄧㄚˋ ㄒㄩㄝˊ ㄑㄧˊ",
  第一課: "ㄉㄧˋ ㄧ ㄎㄜˋ",
  第二課: "ㄉㄧˋ ㄦˋ ㄎㄜˋ",
  第三課: "ㄉㄧˋ ㄙㄢ ㄎㄜˋ",
  第四課: "ㄉㄧˋ ㄙˋ ㄎㄜˋ",
  第五課: "ㄉㄧˋ ㄨˇ ㄎㄜˋ",
  第六課: "ㄉㄧˋ ㄌㄧㄡˋ ㄎㄜˋ",
  第七課: "ㄉㄧˋ ㄑㄧ ㄎㄜˋ",
  第八課: "ㄉㄧˋ ㄅㄚ ㄎㄜˋ",
  第九課: "ㄉㄧˋ ㄐㄧㄡˇ ㄎㄜˋ",
  // 上學期
  "10以內的數": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄕㄨˋ",
  比長短: "ㄅㄧˇ ㄔㄤˊ ㄉㄨㄢˇ",
  "排順序、比多少": "ㄆㄞˊ ㄕㄨㄣˋ ㄒㄩˋ ㄅㄧˇ ㄉㄨㄛ ㄕㄠˇ",
  分與合: "ㄈㄣ ㄩˇ ㄏㄜˊ",
  "方盒、圓罐、球": "ㄈㄤ ㄏㄜˊ ㄩㄢˊ ㄍㄨㄢˋ ㄑㄧㄡˊ",
  "30以內的數": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄕㄨˋ",
  "10以內的加法": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄐㄧㄚ ㄈㄚˇ",
  "10以內的減法": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄐㄧㄢˇ ㄈㄚˇ",
  幾點鐘: "ㄐㄧˇ ㄉㄧㄢˇ ㄓㄨㄥ",
  // 下學期
  "50以內的數": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄕㄨˋ",
  "18以內的加法": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄐㄧㄚ ㄈㄚˇ",
  圖形與分類: "ㄊㄨˊ ㄒㄧㄥˊ ㄩˇ ㄈㄣ ㄌㄟˋ",
  "18以內的減法": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄐㄧㄢˇ ㄈㄚˇ",
  有多長: "ㄧㄡˇ ㄉㄨㄛ ㄔㄤˊ",
  "100以內的數": "ㄧˇ ㄋㄟˋ ˙ㄉㄜ ㄕㄨˋ",
  認識錢幣: "ㄖㄣˋ ㄕˋ ㄑㄧㄢˊ ㄅㄧˋ",
  二位數的加減: "ㄦˋ ㄨㄟˋ ㄕㄨˋ ˙ㄉㄜ ㄐㄧㄚ ㄐㄧㄢˇ",
  幾月幾日星期幾: "ㄐㄧˇ ㄩㄝˋ ㄐㄧˇ ㄖˋ ㄒㄧㄥ ㄑㄧˊ ㄐㄧˇ",
  // What each lesson practises, on its page.
  "認識 1～5": "ㄖㄣˋ ㄕˋ",
  "認識 6～10": "ㄖㄣˋ ㄕˋ",
  "認識 0": "ㄖㄣˋ ㄕˋ",
  表示數量: "ㄅㄧㄠˇ ㄕˋ ㄕㄨˋ ㄌㄧㄤˋ",
  "比高矮、比厚薄": "ㄅㄧˇ ㄍㄠ ㄞˇ ㄅㄧˇ ㄏㄡˋ ㄅㄛˊ",
  直線和曲線: "ㄓˊ ㄒㄧㄢˋ ㄏㄢˋ ㄑㄩ ㄒㄧㄢˋ",
  排數字: "ㄆㄞˊ ㄕㄨˋ ㄗˋ",
  排在第幾個: "ㄆㄞˊ ㄗㄞˋ ㄉㄧˋ ㄐㄧˇ ㄍㄜˋ",
  第幾個和幾個: "ㄉㄧˋ ㄐㄧˇ ㄍㄜˋ ㄏㄢˋ ㄐㄧˇ ㄍㄜˋ",
  比多少: "ㄅㄧˇ ㄉㄨㄛ ㄕㄠˇ",
  分一分: "ㄈㄣ ㄧ ㄈㄣ",
  合一合: "ㄏㄜˊ ㄧ ㄏㄜˊ",
  "10的分與合": "˙ㄉㄜ ㄈㄣ ㄩˇ ㄏㄜˊ",
  合起來是多少: "ㄏㄜˊ ㄑㄧˇ ˙ㄌㄞ ㄕˋ ㄉㄨㄛ ㄕㄠˇ",
  "0的加法": "˙ㄉㄜ ㄐㄧㄚ ㄈㄚˇ",
  加加看: "ㄐㄧㄚ ㄐㄧㄚ ㄎㄢˋ",
  // On the lesson page and practice screens.
  一樣多: "ㄧ ㄧㄤˋ ㄉㄨㄛ",
  左邊: "ㄗㄨㄛˇ ㄅㄧㄢ",
  右邊: "ㄧㄡˋ ㄅㄧㄢ",
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
