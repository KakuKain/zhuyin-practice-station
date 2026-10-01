import {
  eighthLessonLines,
  fifthLessonLines,
  firstLessonLines,
  fourthLessonLines,
  ninthLessonLines,
  secondLessonLines,
  seventhLessonLines,
  sixthLessonLines,
  thirdLessonLines,
} from "../courses/course-data";
import { circledVocabulary } from "../courses/circled-vocabulary";

export const syllableGlyphs: Record<string, string> = {
  ...Object.fromEntries(
    [
      firstLessonLines,
      secondLessonLines,
      thirdLessonLines,
      fourthLessonLines,
      fifthLessonLines,
      sixthLessonLines,
      seventhLessonLines,
      eighthLessonLines,
      ninthLessonLines,
    ]
      .flat(2)
      .map(({ character, zhuyin }) => [zhuyin, character]),
  ),
  ...Object.fromEntries(
    circledVocabulary.flatMap((terms) =>
      terms.flatMap((term) =>
        Array.from(term.text).map((character, index) => [term.syllables[index], character]),
      ),
    ),
  ),
  ㄅㄟ: "背\u{E01E1}",
  ㄅㄟˋ: "背",
  ㄧㄠ: "腰",
  ㄨㄢ: "彎",
  "˙ㄅㄠ": "寶\u{E01E1}",
  "˙ㄇㄚ": "媽\u{E01E1}",
  "˙ㄒㄧㄝ": "謝\u{E01E1}",
  "˙ㄗ": "子\u{E01E1}",
  "˙ㄉㄜ": "得\u{E01E1}",
  "˙ㄅㄛ": "蔔\u{E01E1}",
  ㄐㄧㄠˋ: "覺\u{E01E1}",
  ㄅㄨˊ: "不\u{E01E1}",
  ㄓㄤˇ: "長\u{E01E1}",
  ㄧˋ: "一\u{E01E2}",
  ㄧㄛ: "唷",
  ㄇㄠˊ: "毛",
  ㄇㄠˇ: "卯",
  ㄇㄧˊ: "迷",
  ㄇㄧˇ: "米",
  ㄆㄠˊ: "袍",
  ㄆㄠˋ: "泡",
  ㄑㄩ: "區",
  ㄑㄩˇ: "取",
  ㄗㄠ: "遭",
  ㄗㄠˋ: "造",
  ㄔㄠ: "超",
  ㄔㄠˇ: "炒",
};
