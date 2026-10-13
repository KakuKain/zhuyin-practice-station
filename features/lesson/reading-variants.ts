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
