/** 康軒 115 一年級上 數學, in the order the class teaches it. */
export type MathLesson = {
  id: number;
  number: string;
  title: string;
  /** What one round asks, for the start screen. */
  round: string;
  ready: boolean;
};

export const mathLessons: MathLesson[] = [
  {
    id: 1,
    number: "第一課",
    title: "認識 1～10",
    round: "8 題：先數一數寫數字，再畫圈圈。寫完請家長一起檢查。",
    ready: true,
  },
  {
    id: 2,
    number: "第二課",
    title: "比一比",
    round: "比長短、比高矮、排順序、直線和曲線。",
    ready: false,
  },
  { id: 3, number: "第三課", title: "加法", round: "用圈圈學加法。", ready: false },
];
