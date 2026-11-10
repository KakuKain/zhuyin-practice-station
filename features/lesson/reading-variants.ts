/**
 * Annotated text (國字注音) shows each character's usual reading; a few readings need a
 * variation selector. Sentences written for children list one reading per character, and this
 * adds the selectors the font needs. Unit tests check every sentence against the shipped font.
 */
export const alternateReadings: Record<string, string> = {
  數ㄕㄨˇ: "\u{E01E1}",
  "子˙ㄗ": "\u{E01E1}",
  曲ㄑㄩ: "\u{E01E1}",
  "蔔˙ㄅㄛ": "\u{E01E1}",
  "爸˙ㄅㄚ": "\u{E01E1}",
  "媽˙ㄇㄚ": "\u{E01E1}",
  "個˙ㄍㄜ": "\u{E01E1}",
  // 和 joining two things, as the lessons read it (河馬和河狸).
  和ㄏㄢˋ: "\u{E01E1}",
  // 一 and 不 as the 聽寫 sheets mark them before another syllable (一ˊ個, 一ˋ起, 不ˊ是).
  一ㄧˊ: "\u{E01E1}",
  一ㄧˋ: "\u{E01E2}",
  不ㄅㄨˊ: "\u{E01E1}",
  // 第一冊's 生字 啊, as 本冊生字 reads it alone.
  啊ㄚ: "\u{E01E1}",
  // 合起來: added to the fonts by scripts/build-yo-fonts.py, which the upstream fonts lack.
  "來˙ㄌㄞ": "\u{E01E1}",
  // 照樣造句's 妹妹, 弟弟, 姐姐 and 漂亮; 姐 and 亮 are added to the fonts like 來.
  "妹˙ㄇㄟ": "\u{E01E1}",
  "弟˙ㄉㄧ": "\u{E01E1}",
  "姐˙ㄐㄧㄝ": "\u{E01E1}",
  "亮˙ㄌㄧㄤ": "\u{E01E1}",
  // 閱讀階梯「擁抱」's questions and answers (痛得, 東西, 卡在樹上, 為什麼).
  "得˙ㄉㄜ": "\u{E01E1}",
  "西˙ㄒㄧ": "\u{E01E1}",
  卡ㄑㄧㄚˇ: "\u{E01E1}",
  為ㄨㄟˋ: "\u{E01E1}",
};

export const isHan = (character: string) => /\p{Script=Han}/u.test(character);

/** The selectors that make each character of `text` show its reading in `readings`. */
export function readingVariants(text: string, readings: string): Record<number, string> {
  const syllables = readings.split(" ");
  const variants: Record<number, string> = {};
  let syllable = 0;
  Array.from(text).forEach((character, index) => {
    if (!isHan(character)) return;
    const selector = alternateReadings[character + syllables[syllable++]];
    if (selector) variants[index] = selector;
  });
  return variants;
}
