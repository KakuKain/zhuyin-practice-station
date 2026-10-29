import { readingVariants } from "../lesson/reading-variants";

/**
 * 一年級英語, 上學期, in the workbook's order: Unit 1 Go to School (Aa Bb Cc), Unit 2 After School
 * (Dd Ee Ff), Review 1, Unit 3 Let's Count (Gg–Jj), Unit 4 Let's Exercise (Kk–Mm), Review 2 and
 * the Final Review. The words are the workbook's key words (I Can Write) and the ones the school's
 * quizzes used; the dialogues are each unit's Listen and Check.
 */
type LessonBase = {
  /** Permanent: saved rounds, records and tasks name a lesson by id. */
  id: number;
  number: string;
  /** The unit's English name, as the workbook prints it. */
  title: string;
  /** The letters it teaches, small. */
  letters: string[];
};

export type EnglishLesson = LessonBase & {
  ready: true;
  /** The watercolor picture on its course card and page. */
  art: string;
  /** Its words, key words first. */
  words: string[];
  /** The dialogues it teaches. */
  dialogues: string[];
};

/** A unit the site does not have yet: listed as 製作中. */
export type ComingEnglishLesson = LessonBase & { ready: false };

export type EnglishMode = "tap" | "write";

const coming = (id: number, number: string, title: string, letters: string) =>
  ({ id, number, title, letters: [...letters], ready: false }) as ComingEnglishLesson;

export const englishCourse: (EnglishLesson | ComingEnglishLesson)[] = [
  {
    id: 1,
    number: "第一課",
    title: "Go to School",
    letters: ["a", "b", "c"],
    ready: true,
    art: "teacher-watercolor",
    words: ["apple", "bear", "cat", "ant", "bag", "banana", "cake"],
    dialogues: ["hello", "good-morning", "listen", "look"],
  },
  {
    id: 2,
    number: "第二課",
    title: "After School",
    letters: ["d", "e", "f"],
    ready: true,
    art: "happy-watercolor",
    words: ["duck", "egg", "fish", "bed", "elephant", "fan"],
    dialogues: ["goodbye-bye", "goodbye-see-you", "sit-down"],
  },
  coming(11, "複習一", "Review 1", "abcdef"),
  coming(3, "第三課", "Let's Count", "ghij"),
  coming(4, "第四課", "Let's Exercise", "klm"),
  coming(12, "複習二", "Review 2", "ghijklm"),
  coming(13, "總複習", "Final Review", "abcdefghijklm"),
];

/** The lessons a child can practise. */
export const englishLessons = englishCourse.filter(
  (lesson): lesson is EnglishLesson => lesson.ready,
);

/** Letters taught up to and including this lesson, in the alphabet's order. */
export function lettersTaught(lessonId: number) {
  const place = englishLessons.findIndex((lesson) => lesson.id === lessonId);
  return englishLessons.slice(0, place + 1).flatMap((lesson) => lesson.letters);
}

/** Dialogues taught up to and including this lesson. */
export function dialoguesTaught(lessonId: number) {
  const place = englishLessons.findIndex((lesson) => lesson.id === lessonId);
  return englishLessons.slice(0, place + 1).flatMap((lesson) => lesson.dialogues);
}

/**
 * The picture of each word: the watercolor cut from the sheets by scripts/slice-words.py, listed
 * in `paintedWords`. A word without one yet shows its emoji.
 */
export const englishWords: Record<string, { emoji: string; name: string }> = {
  ant: { emoji: "🐜", name: "螞蟻" },
  apple: { emoji: "🍎", name: "蘋果" },
  bag: { emoji: "🎒", name: "書包" },
  banana: { emoji: "🍌", name: "香蕉" },
  bear: { emoji: "🐻", name: "熊" },
  bed: { emoji: "🛏️", name: "床" },
  cake: { emoji: "🎂", name: "蛋糕" },
  cat: { emoji: "🐱", name: "貓" },
  duck: { emoji: "🦆", name: "鴨子" },
  egg: { emoji: "🥚", name: "蛋" },
  elephant: { emoji: "🐘", name: "大象" },
  fan: { emoji: "🌀", name: "電風扇" },
  fish: { emoji: "🐟", name: "魚" },
};
export const paintedWords: ReadonlySet<string> = new Set([
  ...["ant", "apple", "bag", "banana", "bear", "bed", "cake", "cat"],
  ...["duck", "egg", "elephant", "fan", "fish"],
]);
export const wordPicture = (word: string) =>
  paintedWords.has(word) ? `course-art/words/${word}.webp` : null;

/**
 * Each dialogue: what the two people say, and an emoji scene for one not painted yet. Two
 * goodbyes never share a question (`group`).
 */
export const englishDialogues: Record<
  string,
  { lines: string[]; scene: string; name: string; group?: string }
> = {
  hello: { lines: ["Hello!", "Hi!"], scene: "👦👋👧", name: "打招呼" },
  "good-morning": { lines: ["Good morning.", "Good morning."], scene: "🌅👧👦", name: "早安" },
  listen: { lines: ["Listen!"], scene: "👩‍🏫👂", name: "仔細聽" },
  look: { lines: ["Look!"], scene: "👧🍎👀", name: "你看" },
  "goodbye-bye": { lines: ["Goodbye.", "Bye."], scene: "👦👋🏠", name: "再見", group: "goodbye" },
  "goodbye-see-you": {
    lines: ["Goodbye.", "See you."],
    scene: "👩‍🏫👋🧒🧒",
    name: "再見",
    group: "goodbye",
  },
  "sit-down": { lines: ["Sit down, please."], scene: "👩‍🏫🪑🧒", name: "請坐下" },
  // 第三、四課's, painted with the others.
  "thank-you": { lines: ["Thank you.", "You're welcome."], scene: "👩‍🏫📚🧒", name: "謝謝" },
  "my-turn": { lines: ["Who's next?", "It's my turn."], scene: "🎲🧒👧", name: "輪到我" },
};

/** Dialogues whose painted scene is in public/course-art/scenes/ (scripts/slice-scenes.py). */
export const paintedScenes: ReadonlySet<string> = new Set(Object.keys(englishDialogues));

/** The workbook's writing tips, shown on the parent's check beside the letter they are about. */
export const writingTips: Record<string, string> = {
  b: "大B和小b的肚子同一邊。",
  B: "大B和小b的肚子同一邊。",
  d: "大D和小d的肚子不同邊。",
  D: "大D和小d的肚子不同邊。",
  f: "小f的頭要頂到天。",
  g: "g和j的腳踩底線，長腳向左彎。",
  j: "g和j的腳踩底線，長腳向左彎。",
  k: "小k的頭頂到天，手要縮起來。",
};

/**
 * Every Chinese word on the English course cards, lesson pages and practice screens, with one
 * reading per Han character, so they show in 國字注音. A unit test checks them against the font.
 */
export const englishWordReadings: Record<string, string> = {
  英語: "ㄧㄥ ㄩˇ",
  上學期: "ㄕㄤˋ ㄒㄩㄝˊ ㄑㄧˊ",
  第一課: "ㄉㄧˋ ㄧ ㄎㄜˋ",
  第二課: "ㄉㄧˋ ㄦˋ ㄎㄜˋ",
  第三課: "ㄉㄧˋ ㄙㄢ ㄎㄜˋ",
  第四課: "ㄉㄧˋ ㄙˋ ㄎㄜˋ",
  複習一: "ㄈㄨˋ ㄒㄧˊ ㄧ",
  複習二: "ㄈㄨˋ ㄒㄧˊ ㄦˋ",
  總複習: "ㄗㄨㄥˇ ㄈㄨˋ ㄒㄧˊ",
  認一認: "ㄖㄣˋ ㄧ ㄖㄣˋ",
  寫一寫: "ㄒㄧㄝˇ ㄧ ㄒㄧㄝˇ",
  這一課: "ㄓㄜˋ ㄧ ㄎㄜˋ",
  開始: "ㄎㄞ ㄕˇ",
  繼續: "ㄐㄧˋ ㄒㄩˋ",
  繼續練習: "ㄐㄧˋ ㄒㄩˋ ㄌㄧㄢˋ ㄒㄧˊ",
  從頭開始: "ㄘㄨㄥˊ ㄊㄡˊ ㄎㄞ ㄕˇ",
  第: "ㄉㄧˋ",
  題: "ㄊㄧˊ",
  // What a lesson practises, on its page and in the practice header.
  字母: "ㄗˋ ㄇㄨˇ",
  大寫和小寫: "ㄉㄚˋ ㄒㄧㄝˇ ㄏㄢˋ ㄒㄧㄠˇ ㄒㄧㄝˇ",
  單字: "ㄉㄢ ㄗˋ",
  對話: "ㄉㄨㄟˋ ㄏㄨㄚˋ",
  描一描: "ㄇㄧㄠˊ ㄧ ㄇㄧㄠˊ",
  聽寫字母: "ㄊㄧㄥ ㄒㄧㄝˇ ㄗˋ ㄇㄨˇ",
  字母順序: "ㄗˋ ㄇㄨˇ ㄕㄨㄣˋ ㄒㄩˋ",
  // On the writing squares.
  大寫: "ㄉㄚˋ ㄒㄧㄝˇ",
  小寫: "ㄒㄧㄠˇ ㄒㄧㄝˇ",
};

/** An English-page word with the selectors that make it show its reading. */
export const englishWord = (text: string) => ({
  text,
  variants: readingVariants(text, englishWordReadings[text] ?? ""),
});
