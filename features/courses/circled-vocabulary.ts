export type CircledTerm = { text: string; syllables: readonly string[] };

function term(text: string, reading: string): CircledTerm {
  const syllables = reading.split("|");
  if (Array.from(text).length !== syllables.length)
    throw new Error(`圈詞「${text}」的注音格數不一致`);
  return { text, syllables };
}

// The teacher's circled vocabulary is the only source for listening sections
// two (individual characters) and three (complete words or phrases).
export const circledVocabulary: readonly (readonly CircledTerm[])[] = [
  [
    term("逼", "ㄅㄧ"),
    term("貓咪", "ㄇㄠ|ㄇㄧ"),
    term("弟弟", "ㄉㄧˋ|˙ㄉㄧ"),
    term("跑第一", "ㄆㄠˇ|ㄉㄧˋ|ㄧ"),
  ],
  [
    term("哈", "ㄏㄚ"),
    term("孵出", "ㄈㄨ|ㄔㄨ"),
    term("五隻", "ㄨˇ|ㄓ"),
    term("鵝媽媽", "ㄜˊ|ㄇㄚ|˙ㄇㄚ"),
    term("好得意", "ㄏㄠˇ|ㄉㄜˊ|ㄧˋ"),
  ],
  [
    term("半路", "ㄅㄢˋ|ㄌㄨˋ"),
    term("忙著", "ㄇㄤˊ|˙ㄓㄜ"),
    term("築巢", "ㄓㄨˊ|ㄔㄠˊ"),
    term("河狸", "ㄏㄜˊ|ㄌㄧˊ"),
    term("泡澡", "ㄆㄠˋ|ㄗㄠˇ"),
  ],
  [
    term("笑嘻嘻", "ㄒㄧㄠˋ|ㄒㄧ|ㄒㄧ"),
    term("背書包", "ㄅㄟ|ㄕㄨ|ㄅㄠ"),
    term("手拉手", "ㄕㄡˇ|ㄌㄚ|ㄕㄡˇ"),
    term("一二一", "ㄧ|ㄦˋ|ㄧ"),
    term("好歡喜", "ㄏㄠˇ|ㄏㄨㄢ|ㄒㄧˇ"),
  ],
  [
    term("朋友", "ㄆㄥˊ|ㄧㄡˇ"),
    term("上下", "ㄕㄤˋ|ㄒㄧㄚˋ"),
    term("高低", "ㄍㄠ|ㄉㄧ"),
    term("好像", "ㄏㄠˇ|ㄒㄧㄤˋ"),
    term("小鳥", "ㄒㄧㄠˇ|ㄋㄧㄠˇ"),
    term("翹翹板", "ㄑㄧㄠˋ|ㄑㄧㄠˋ|ㄅㄢˇ"),
  ],
  [
    term("也", "ㄧㄝˇ"),
    term("謝謝", "ㄒㄧㄝˋ|˙ㄒㄧㄝ"),
    term("讀書", "ㄉㄨˊ|ㄕㄨ"),
    term("送老師", "ㄙㄨㄥˋ|ㄌㄠˇ|ㄕ"),
    term("一朵紅花", "ㄧˋ|ㄉㄨㄛˇ|ㄏㄨㄥˊ|ㄏㄨㄚ"),
    term("教我畫畫", "ㄐㄧㄠˋ|ㄨㄛˇ|ㄏㄨㄚˋ|ㄏㄨㄚˋ"),
  ],
  [
    term("烏龜", "ㄨ|ㄍㄨㄟ"),
    term("兔子", "ㄊㄨˋ|˙ㄗ"),
    term("領先", "ㄌㄧㄥˇ|ㄒㄧㄢ"),
    term("落後", "ㄌㄨㄛˋ|ㄏㄡˋ"),
    term("睡午覺", "ㄕㄨㄟˋ|ㄨˇ|ㄐㄧㄠˋ"),
    term("看誰跑得快", "ㄎㄢˋ|ㄕㄟˊ|ㄆㄠˇ|˙ㄉㄜ|ㄎㄨㄞˋ"),
    term("跟在後面追", "ㄍㄣ|ㄗㄞˋ|ㄏㄡˋ|ㄇㄧㄢˋ|ㄓㄨㄟ"),
  ],
  [
    term("菜園", "ㄘㄞˋ|ㄩㄢˊ"),
    term("黃牛", "ㄏㄨㄤˊ|ㄋㄧㄡˊ"),
    term("浣熊", "ㄨㄢˇ|ㄒㄩㄥˊ"),
    term("嘿喲", "ㄏㄟ|ㄧㄛ"),
    term("好熱鬧", "ㄏㄠˇ|ㄖㄜˋ|ㄋㄠˋ"),
    term("拔不動", "ㄅㄚˊ|ㄅㄨˊ|ㄉㄨㄥˋ"),
    term("長出蘿蔔", "ㄓㄤˇ|ㄔㄨ|ㄌㄨㄛˊ|˙ㄅㄛ"),
    term("捲起袖子", "ㄐㄩㄢˇ|ㄑㄧˇ|ㄒㄧㄡˋ|˙ㄗ"),
  ],
  [
    term("山崖", "ㄕㄢ|ㄧㄞˊ"),
    term("開心", "ㄎㄞ|ㄒㄧㄣ"),
    term("表演", "ㄅㄧㄠˇ|ㄧㄢˇ"),
    term("馴鹿", "ㄒㄩㄣˊ|ㄌㄨˋ"),
    term("孔雀", "ㄎㄨㄥˇ|ㄑㄩㄝˋ"),
    term("慶祝", "ㄑㄧㄥˋ|ㄓㄨˋ"),
    term("小熊", "ㄒㄧㄠˇ|ㄒㄩㄥˊ"),
    term("滾大球", "ㄍㄨㄣˇ|ㄉㄚˋ|ㄑㄧㄡˊ"),
    term("真精彩", "ㄓㄣ|ㄐㄧㄥ|ㄘㄞˇ"),
  ],
];
