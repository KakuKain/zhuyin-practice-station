/**
 * 照樣造句 from each lesson's 我會造句 (第五課 has none in the photos, so it uses its 認識詞語,
 * 照樣寫短語: 比 → 比一比). Each question plays one of the book's examples, then shows its
 * pattern with blanks to fill in; the parent asked for blanks only, not whole sentences.
 *
 * A pattern is text with blanks written `{cells}` or `{label:cells}`: 「{誰:2}{做什麼事:3}。」.
 * Readings list one syllable per Han character, for the example and for the pattern's text
 * (labels included, in order).
 */
export type SentenceQuestion = {
  /** What is played (and shown, unless `shown` says otherwise). */
  example: string;
  /** The example as shown, where it reads better than it sounds: 「比→比一比」. */
  shown?: string;
  exampleReadings: string;
  pattern: string;
  patternReadings: string;
};
export type PatternPart =
  { kind: "text"; text: string } | { kind: "blank"; label?: string; cells: number };

export const sentenceLessons: Record<number, { name: string; questions: SentenceQuestion[] }> = {
  1: {
    name: "誰做什麼事",
    questions: [
      {
        example: "妹妹溜滑梯。",
        exampleReadings: "ㄇㄟˋ ˙ㄇㄟ ㄌㄧㄡ ㄏㄨㄚˊ ㄊㄧ",
        pattern: "{誰:2}{做什麼事:3}。",
        patternReadings: "ㄕㄟˊ ㄗㄨㄛˋ ㄕㄣˊ ˙ㄇㄜ ㄕˋ",
      },
      {
        example: "姐姐寫功課。",
        exampleReadings: "ㄐㄧㄝˇ ˙ㄐㄧㄝ ㄒㄧㄝˇ ㄍㄨㄥ ㄎㄜˋ",
        pattern: "{誰:2}{做什麼事:3}。",
        patternReadings: "ㄕㄟˊ ㄗㄨㄛˋ ㄕㄣˊ ˙ㄇㄜ ㄕˋ",
      },
      {
        example: "弟弟拍手。",
        exampleReadings: "ㄉㄧˋ ˙ㄉㄧ ㄆㄞ ㄕㄡˇ",
        pattern: "{誰:2}{做什麼事:3}。",
        patternReadings: "ㄕㄟˊ ㄗㄨㄛˋ ㄕㄣˊ ˙ㄇㄜ ㄕˋ",
      },
    ],
  },
  2: {
    name: "是",
    questions: [
      {
        example: "這是我的媽媽。",
        exampleReadings: "ㄓㄜˋ ㄕˋ ㄨㄛˇ ˙ㄉㄜ ㄇㄚ ˙ㄇㄚ",
        pattern: "這是{2}的{2}。",
        patternReadings: "ㄓㄜˋ ㄕˋ ˙ㄉㄜ",
      },
      {
        example: "這個是鉛筆盒。",
        exampleReadings: "ㄓㄜˋ ˙ㄍㄜ ㄕˋ ㄑㄧㄢ ㄅㄧˇ ㄏㄜˊ",
        pattern: "這個是{3}。",
        patternReadings: "ㄓㄜˋ ˙ㄍㄜ ㄕˋ",
      },
      {
        example: "那裡是學校的操場。",
        exampleReadings: "ㄋㄚˋ ㄌㄧˇ ㄕˋ ㄒㄩㄝˊ ㄒㄧㄠˋ ˙ㄉㄜ ㄘㄠ ㄔㄤˇ",
        pattern: "那裡是{4}。",
        patternReadings: "ㄋㄚˋ ㄌㄧˇ ㄕˋ",
      },
    ],
  },
  3: {
    name: "一起",
    questions: [
      {
        example: "爸爸和我一起跑步。",
        exampleReadings: "ㄅㄚˋ ˙ㄅㄚ ㄏㄢˋ ㄨㄛˇ ㄧˋ ㄑㄧˇ ㄆㄠˇ ㄅㄨˋ",
        pattern: "{2}和{2}一起{2}。",
        patternReadings: "ㄏㄢˋ ㄧˋ ㄑㄧˇ",
      },
      {
        example: "姐姐和我一起畫畫。",
        exampleReadings: "ㄐㄧㄝˇ ˙ㄐㄧㄝ ㄏㄢˋ ㄨㄛˇ ㄧˋ ㄑㄧˇ ㄏㄨㄚˋ ㄏㄨㄚˋ",
        pattern: "{2}和{2}一起{2}。",
        patternReadings: "ㄏㄢˋ ㄧˋ ㄑㄧˇ",
      },
      {
        example: "我們一起玩。",
        exampleReadings: "ㄨㄛˇ ˙ㄇㄣ ㄧˋ ㄑㄧˇ ㄨㄢˊ",
        pattern: "{2}一起{2}。",
        patternReadings: "ㄧˋ ㄑㄧˇ",
      },
    ],
  },
  4: {
    name: "誰怎麼樣",
    questions: [
      {
        example: "大個子好開心。",
        exampleReadings: "ㄉㄚˋ ㄍㄜˋ ˙ㄗ ㄏㄠˇ ㄎㄞ ㄒㄧㄣ",
        pattern: "{誰:3}好{怎麼樣:2}。",
        patternReadings: "ㄕㄟˊ ㄏㄠˇ ㄗㄣˇ ˙ㄇㄜ ㄧㄤˋ",
      },
      {
        example: "妹妹好可愛。",
        exampleReadings: "ㄇㄟˋ ˙ㄇㄟ ㄏㄠˇ ㄎㄜˇ ㄞˋ",
        pattern: "{誰:2}好{怎麼樣:2}。",
        patternReadings: "ㄕㄟˊ ㄏㄠˇ ㄗㄣˇ ˙ㄇㄜ ㄧㄤˋ",
      },
      {
        example: "蝴蝶真漂亮。",
        exampleReadings: "ㄏㄨˊ ㄉㄧㄝˊ ㄓㄣ ㄆㄧㄠˋ ˙ㄌㄧㄤ",
        pattern: "{誰:2}真{怎麼樣:2}。",
        patternReadings: "ㄕㄟˊ ㄓㄣ ㄗㄣˇ ˙ㄇㄜ ㄧㄤˋ",
      },
    ],
  },
  5: {
    name: "比一比",
    questions: [
      {
        example: "比，比一比。",
        shown: "比→比一比",
        exampleReadings: "ㄅㄧˇ ㄅㄧˇ ㄧ ㄅㄧˇ",
        pattern: "跑→{1}一{1}",
        patternReadings: "ㄆㄠˇ ㄧ",
      },
      {
        example: "比，比一比。",
        shown: "比→比一比",
        exampleReadings: "ㄅㄧˇ ㄅㄧˇ ㄧ ㄅㄧˇ",
        pattern: "走→{1}一{1}",
        patternReadings: "ㄗㄡˇ ㄧ",
      },
      {
        example: "比，比一比。",
        shown: "比→比一比",
        exampleReadings: "ㄅㄧˇ ㄅㄧˇ ㄧ ㄅㄧˇ",
        pattern: "拍→{1}一{1}",
        patternReadings: "ㄆㄞ ㄧ",
      },
    ],
  },
  6: {
    name: "也",
    questions: [
      {
        example: "爸爸想喝茶，媽媽也想喝茶。",
        exampleReadings: "ㄅㄚˋ ˙ㄅㄚ ㄒㄧㄤˇ ㄏㄜ ㄔㄚˊ ㄇㄚ ˙ㄇㄚ ㄧㄝˇ ㄒㄧㄤˇ ㄏㄜ ㄔㄚˊ",
        pattern: "{2}想喝茶，{2}也想喝茶。",
        patternReadings: "ㄒㄧㄤˇ ㄏㄜ ㄔㄚˊ ㄧㄝˇ ㄒㄧㄤˇ ㄏㄜ ㄔㄚˊ",
      },
      {
        example: "我向小紅花說你早，也向小白花說你好。",
        exampleReadings:
          "ㄨㄛˇ ㄒㄧㄤˋ ㄒㄧㄠˇ ㄏㄨㄥˊ ㄏㄨㄚ ㄕㄨㄛ ㄋㄧˇ ㄗㄠˇ ㄧㄝˇ ㄒㄧㄤˋ ㄒㄧㄠˇ ㄅㄞˊ ㄏㄨㄚ ㄕㄨㄛ ㄋㄧˇ ㄏㄠˇ",
        pattern: "我向{3}說你早，也向{3}說你好。",
        patternReadings: "ㄨㄛˇ ㄒㄧㄤˋ ㄕㄨㄛ ㄋㄧˇ ㄗㄠˇ ㄧㄝˇ ㄒㄧㄤˋ ㄕㄨㄛ ㄋㄧˇ ㄏㄠˇ",
      },
    ],
  },
};

/** The pattern as text and blanks. */
export function patternParts(pattern: string): PatternPart[] {
  const parts: PatternPart[] = [];
  for (const piece of pattern.split(/(\{[^}]+\})/).filter(Boolean)) {
    const blank = /^\{(?:([^:}]+):)?(\d)\}$/.exec(piece);
    parts.push(
      blank
        ? { kind: "blank", ...(blank[1] ? { label: blank[1] } : {}), cells: Number(blank[2]) }
        : { kind: "text", text: piece },
    );
  }
  return parts;
}

/** The readings of each text part and label, in the order they appear. */
export function partReadings(question: SentenceQuestion): string[] {
  const syllables = question.patternReadings.split(" ");
  let at = 0;
  const take = (text: string) => {
    const n = [...text].filter((c) => /\p{Script=Han}/u.test(c)).length;
    const readings = syllables.slice(at, at + n).join(" ");
    at += n;
    return readings;
  };
  return patternParts(question.pattern).map((part) =>
    part.kind === "text" ? take(part.text) : part.label ? take(part.label) : "",
  );
}
