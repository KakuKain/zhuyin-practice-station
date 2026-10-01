export function withPronunciationVariants(
  text: string,
  variants: Readonly<Record<number, string>> = {},
) {
  return Array.from(text, (character, index) => character + (variants[index] ?? "")).join("");
}

// The second 寶／謝 and 蔔 are neutral tone in these lesson titles.
export const lessonTitleVariants: Readonly<Record<number, Readonly<Record<number, string>>>> = {
  1: { 2: "\u{E01E1}" },
  5: { 1: "\u{E01E1}" },
  7: { 2: "\u{E01E1}" },
};

export const lessonTitleGroups: Readonly<Record<number, readonly string[]>> = {
  2: ["河馬", "和", "河狸"],
  5: ["謝謝", "老師"],
  6: ["龜兔", "賽跑"],
  8: ["動物", "狂歡會"],
};
