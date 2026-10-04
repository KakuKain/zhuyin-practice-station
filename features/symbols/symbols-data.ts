export const consonants = Array.from("ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ");
export const vowels = Array.from("ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ");
export const allSymbols = [...consonants, ...vowels];

export const combinedRhymeGroups = [
  {
    id: "i",
    title: "ㄧ 的結合韻",
    cells: ["ㄧㄚ", "ㄧㄛ", "ㄧㄝ", "ㄧㄞ", "ㄧㄠ", "ㄧㄡ", "ㄧㄢ", "ㄧㄣ", "ㄧㄤ", "ㄧㄥ"],
  },
  {
    id: "u",
    title: "ㄨ 的結合韻",
    cells: ["ㄨㄚ", "ㄨㄛ", "ㄨㄞ", "ㄨㄟ", "ㄨㄢ", "ㄨㄣ", "ㄨㄤ", "ㄨㄥ"],
  },
  { id: "yu", title: "ㄩ 的結合韻", cells: ["ㄩㄝ", "ㄩㄢ", "ㄩㄣ", "ㄩㄥ"] },
] as const;

// Columns flow right to left; reading down each keeps related sounds together.
export const symbolGroups = [
  {
    id: "consonants",
    title: "聲符",
    count: consonants.length,
    columns: 6,
    cells: [
      "ㄅ",
      "ㄉ",
      "ㄍ",
      "ㄐ",
      "ㄓ",
      "ㄗ",
      "ㄆ",
      "ㄊ",
      "ㄎ",
      "ㄑ",
      "ㄔ",
      "ㄘ",
      "ㄇ",
      "ㄋ",
      "ㄏ",
      "ㄒ",
      "ㄕ",
      "ㄙ",
      "ㄈ",
      "ㄌ",
      null,
      null,
      "ㄖ",
      null,
    ],
  },
  {
    id: "vowels",
    title: "韻符",
    count: vowels.length,
    columns: 5,
    cells: [
      "ㄦ",
      "ㄢ",
      "ㄞ",
      "ㄚ",
      "ㄧ",
      null,
      "ㄣ",
      "ㄟ",
      "ㄛ",
      "ㄨ",
      null,
      "ㄤ",
      "ㄠ",
      "ㄜ",
      "ㄩ",
      null,
      "ㄥ",
      "ㄡ",
      "ㄝ",
      null,
    ],
  },
] as const;
