/**
 * Everything a child reads on the stamp card, in 國字注音: each sentence with one reading per
 * Han character ({n} and {m} are numbers, which carry no reading). A unit test checks the
 * annotated font shows exactly these readings.
 */
export const stampWords = {
  card: ["集章卡", "ㄐㄧˊ ㄓㄤ ㄎㄚˇ"],
  full: ["集滿了！", "ㄐㄧˊ ㄇㄢˇ ˙ㄌㄜ"],
  myCard: ["我的集章卡", "ㄨㄛˇ ˙ㄉㄜ ㄐㄧˊ ㄓㄤ ㄎㄚˇ"],
  ofCard: ["的集章卡", "˙ㄉㄜ ㄐㄧˊ ㄓㄤ ㄎㄚˇ"],
  toGo: [
    "再蓋 {n} 個章，就可以選一個獎勵！",
    "ㄗㄞˋ ㄍㄞˋ ㄍㄜˋ ㄓㄤ ㄐㄧㄡˋ ㄎㄜˇ ㄧˇ ㄒㄩㄢˇ ㄧ ㄍㄜˋ ㄐㄧㄤˇ ㄌㄧˋ",
  ],
  noRewards: [
    "集滿了！請爸爸媽媽到「更多 → 集章卡」加上獎勵。",
    "ㄐㄧˊ ㄇㄢˇ ˙ㄌㄜ ㄑㄧㄥˇ ㄅㄚˋ ˙ㄅㄚ ㄇㄚ ˙ㄇㄚ ㄉㄠˋ ㄍㄥˋ ㄉㄨㄛ ㄐㄧˊ ㄓㄤ ㄎㄚˇ ㄐㄧㄚ ㄕㄤˋ ㄐㄧㄤˇ ㄌㄧˋ",
  ],
  choose: ["集滿了！選一個獎勵：", "ㄐㄧˊ ㄇㄢˇ ˙ㄌㄜ ㄒㄩㄢˇ ㄧ ㄍㄜˋ ㄐㄧㄤˇ ㄌㄧˋ"],
  ask: ["要選", "ㄧㄠˋ ㄒㄩㄢˇ"],
  askEnd: ["嗎？", "˙ㄇㄚ"],
  yes: ["就選這個", "ㄐㄧㄡˋ ㄒㄩㄢˇ ㄓㄜˋ ˙ㄍㄜ"],
  rethink: ["再想想", "ㄗㄞˋ ㄒㄧㄤˇ ㄒㄧㄤˇ"],
  picked: ["你選了", "ㄋㄧˇ ㄒㄩㄢˇ ˙ㄌㄜ"],
  together: [
    "請爸爸媽媽陪你一起完成。",
    "ㄑㄧㄥˇ ㄅㄚˋ ˙ㄅㄚ ㄇㄚ ˙ㄇㄚ ㄆㄟˊ ㄋㄧˇ ㄧ ㄑㄧˇ ㄨㄢˊ ㄔㄥˊ",
  ],
  ok: ["好", "ㄏㄠˇ"],
  practice: ["練習章", "ㄌㄧㄢˋ ㄒㄧˊ ㄓㄤ"],
  fix: ["訂正之星", "ㄉㄧㄥˋ ㄓㄥˋ ㄓ ㄒㄧㄥ"],
  cheer: ["鼓勵章", "ㄍㄨˇ ㄌㄧˋ ㄓㄤ"],
  task: ["任務章", "ㄖㄣˋ ㄨˋ ㄓㄤ"],
  history: ["換過的獎勵：", "ㄏㄨㄢˋ ㄍㄨㄛˋ ˙ㄉㄜ ㄐㄧㄤˇ ㄌㄧˋ"],
  stamped: ["蓋了一個章！", "ㄍㄞˋ ˙ㄌㄜ ㄧ ㄍㄜˋ ㄓㄤ"],
  taskDone: ["完成今天的任務！", "ㄨㄢˊ ㄔㄥˊ ㄐㄧㄣ ㄊㄧㄢ ˙ㄉㄜ ㄖㄣˋ ㄨˋ"],
  gotFix: ["得到訂正之星！", "ㄉㄜˊ ㄉㄠˋ ㄉㄧㄥˋ ㄓㄥˋ ㄓ ㄒㄧㄥ"],
  gotCheer: ["得到鼓勵章！", "ㄉㄜˊ ㄉㄠˋ ㄍㄨˇ ㄌㄧˋ ㄓㄤ"],
  cardFull: [
    "集滿一張卡了！回到課程列表選獎勵吧。",
    "ㄐㄧˊ ㄇㄢˇ ㄧ ㄓㄤ ㄎㄚˇ ˙ㄌㄜ ㄏㄨㄟˊ ㄉㄠˋ ㄎㄜˋ ㄔㄥˊ ㄌㄧㄝˋ ㄅㄧㄠˇ ㄒㄩㄢˇ ㄐㄧㄤˇ ㄌㄧˋ ˙ㄅㄚ",
  ],
  rest: ["今天好認真！", "ㄐㄧㄣ ㄊㄧㄢ ㄏㄠˇ ㄖㄣˋ ㄓㄣ"],
  tomorrow: ["明天繼續蓋章。", "ㄇㄧㄥˊ ㄊㄧㄢ ㄐㄧˋ ㄒㄩˋ ㄍㄞˋ ㄓㄤ"],
} as const satisfies Record<string, readonly [string, string]>;

export type StampWord = keyof typeof stampWords;

/** The suggested rewards, so a child can read the ones a parent ticked; their own are as typed. */
export const rewardReadings: Record<string, string> = {
  一起去公園玩: "ㄧ ㄑㄧˇ ㄑㄩˋ ㄍㄨㄥ ㄩㄢˊ ㄨㄢˊ",
  睡前多講一個故事: "ㄕㄨㄟˋ ㄑㄧㄢˊ ㄉㄨㄛ ㄐㄧㄤˇ ㄧ ㄍㄜˋ ㄍㄨˋ ㄕˋ",
  週末選晚餐吃什麼: "ㄓㄡ ㄇㄛˋ ㄒㄩㄢˇ ㄨㄢˇ ㄘㄢ ㄔ ㄕㄣˊ ˙ㄇㄜ",
  一起玩桌遊: "ㄧ ㄑㄧˇ ㄨㄢˊ ㄓㄨㄛ ㄧㄡˊ",
  一起烤餅乾: "ㄧ ㄑㄧˇ ㄎㄠˇ ㄅㄧㄥˇ ㄍㄢ",
  選一部卡通一起看: "ㄒㄩㄢˇ ㄧ ㄅㄨˋ ㄎㄚˇ ㄊㄨㄥ ㄧ ㄑㄧˇ ㄎㄢˋ",
  去圖書館借書: "ㄑㄩˋ ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ ㄐㄧㄝˋ ㄕㄨ",
  一張喜歡的貼紙: "ㄧ ㄓㄤ ㄒㄧˇ ㄏㄨㄢ ˙ㄉㄜ ㄊㄧㄝ ㄓˇ",
};

export const fillWord = (word: StampWord, n?: number, m?: number) =>
  stampWords[word][0].replace("{n}", String(n ?? "")).replace("{m}", String(m ?? ""));
