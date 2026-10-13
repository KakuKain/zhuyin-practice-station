/**
 * 第二課 比長短. Every question is answered by tapping, checked at once and tried again until
 * right, like 辨音. When things are not lined up, the child first drags them to the start line
 * or down to the ground, so 一端對齊 is something they do, not only something they see.
 */
export type Measure = "length" | "height";

export type Bar = {
  /** Pencil length in % of the stage width, or a child's height in % of the stage height. */
  size: number;
  /** How far it is from lined up: right of the start line, or how high a box lifts it. */
  offset: number;
  color: number;
};

export type LineShape = "straight" | "arc" | "wave" | "s-curve" | "hook";
export type RouteShape = "straight" | "arch" | "wave";

export type CompareQuestion =
  | { kind: "compare"; measure: Measure; ask: "more" | "less"; bars: Bar[] }
  /** 比厚薄: books standing on a shelf, the same height; a book's thickness is its width. */
  | { kind: "thickness"; ask: "more" | "less"; books: { size: number; color: number }[] }
  | { kind: "line"; ask: "straight" | "curve"; lines: { shape: LineShape; angle: number }[] }
  | {
      kind: "route";
      /** Where the rabbit and the carrot sit, in the route's 160 × 100 drawing. */
      from: number;
      to: number;
      /** Sends the arch below and the wave above. */
      flip: boolean;
      routes: { shape: RouteShape; color: number }[];
    };

/** The start line, in % of the stage width. */
export const startLine = 6;
/** The ground, in % of the stage height from the top. */
export const ground = 86;
/** Released this close to lined up, a pencil or child settles there. */
export const snapDistance = 5;

export const palette = [
  { color: "#e0567a", name: "粉紅色" },
  { color: "#3474d7", name: "藍色" },
  { color: "#2f9a55", name: "綠色" },
  { color: "#e8a21f", name: "黃色" },
  { color: "#8a5cd6", name: "紫色" },
  { color: "#ef7d1f", name: "橘色" },
];

const curveShapes: LineShape[] = ["arc", "wave", "s-curve", "hook"];

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const between = (random: () => number, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

function colors(count: number, random: () => number) {
  return shuffle(
    palette.map((_, index) => index),
    random,
  ).slice(0, count);
}

/**
 * Two things to compare. Out of line, the shorter one is placed so that its far end reaches
 * past the longer one's: a child who skips lining up picks the wrong one.
 */
export function compareBars(measure: Measure, aligned: boolean, random = Math.random): Bar[] {
  const [first, second] = colors(2, random);
  let big: Bar;
  let small: Bar;
  if (measure === "length") {
    if (aligned) {
      const size = between(random, 58, 82);
      big = { size, offset: 0, color: first };
      small = { size: size - between(random, 14, 28), offset: 0, color: second };
    } else {
      const size = between(random, 48, 64);
      const gap = between(random, 10, 20);
      const offset = between(random, 10, 16);
      big = { size, offset, color: first };
      small = { size: size - gap, offset: offset + gap + between(random, 5, 10), color: second };
    }
  } else if (aligned) {
    const size = between(random, 58, 72);
    big = { size, offset: 0, color: first };
    small = { size: size - between(random, 12, 20), offset: 0, color: second };
  } else {
    // The taller child stands on the ground; the shorter one stands on a box.
    const size = between(random, 52, 64);
    const gap = between(random, 10, 16);
    big = { size, offset: 0, color: first };
    small = { size: size - gap, offset: gap + between(random, 6, 12), color: second };
  }
  return shuffle([big, small], random);
}

/** Two books, one clearly thicker: thickness in % of the shelf's width. */
export function thicknessQuestion(
  random = Math.random,
): Extract<CompareQuestion, { kind: "thickness" }> {
  const [first, second] = colors(2, random);
  const thick = between(random, 20, 30);
  const thin = thick - between(random, 8, 13);
  return {
    kind: "thickness",
    ask: random() < 0.5 ? "more" : "less",
    books: shuffle(
      [
        { size: thick, color: first },
        { size: thin, color: second },
      ],
      random,
    ),
  };
}

export function lineQuestion(random = Math.random): Extract<CompareQuestion, { kind: "line" }> {
  const ask = random() < 0.5 ? "straight" : "curve";
  const straightAngles = shuffle([0, 30, 60, 90, 120, 150], random);
  const curves = shuffle(curveShapes, random);
  const angle = () => between(random, 0, 7) * 45;
  const lines =
    ask === "straight"
      ? [
          { shape: "straight" as const, angle: straightAngles[0] },
          ...curves.slice(0, 3).map((shape) => ({ shape, angle: angle() })),
        ]
      : [
          { shape: curves[0], angle: angle() },
          ...straightAngles
            .slice(0, 3)
            .map((value) => ({ shape: "straight" as const, angle: value })),
        ];
  return { kind: "line", ask, lines: shuffle(lines, random) };
}

export function routeQuestion(random = Math.random): Extract<CompareQuestion, { kind: "route" }> {
  const shades = colors(3, random);
  return {
    kind: "route",
    from: between(random, 44, 56),
    to: between(random, 44, 56),
    flip: random() < 0.5,
    routes: shuffle(
      (["straight", "arch", "wave"] as const).map((shape, index) => ({
        shape,
        color: shades[index],
      })),
      random,
    ),
  };
}

export const compareRoundSize = 7;

/**
 * One round walks the lesson in the textbook's order: 比長短, 比高矮、比厚薄, then 直線和曲線
 * with 哪條路最近. 排順序 is 第三課's, with numbers.
 */
export function buildCompareRound(random = Math.random): CompareQuestion[] {
  const ask = () => (random() < 0.5 ? ("more" as const) : ("less" as const));
  return [
    { kind: "compare", measure: "length", ask: ask(), bars: compareBars("length", true, random) },
    { kind: "compare", measure: "length", ask: ask(), bars: compareBars("length", false, random) },
    { kind: "compare", measure: "height", ask: ask(), bars: compareBars("height", true, random) },
    { kind: "compare", measure: "height", ask: ask(), bars: compareBars("height", false, random) },
    thicknessQuestion(random),
    lineQuestion(random),
    routeQuestion(random),
  ];
}

export const needsLining = (question: CompareQuestion) =>
  question.kind === "compare" && question.bars.some((bar) => bar.offset > 0);

/** The tap that answers a question. */
export function answerOf(question: CompareQuestion): number[] {
  switch (question.kind) {
    case "compare": {
      const sizes = question.bars.map((bar) => bar.size);
      const target = question.ask === "more" ? Math.max(...sizes) : Math.min(...sizes);
      return [sizes.indexOf(target)];
    }
    case "thickness": {
      const sizes = question.books.map((book) => book.size);
      const target = question.ask === "more" ? Math.max(...sizes) : Math.min(...sizes);
      return [sizes.indexOf(target)];
    }
    case "line":
      return [
        question.lines.findIndex(
          (line) => (line.shape === "straight") === (question.ask === "straight"),
        ),
      ];
    case "route":
      return [question.routes.findIndex((route) => route.shape === "straight")];
  }
}

/** Where a route runs, as points in its 160 × 100 drawing. */
export function routePoints(
  question: Extract<CompareQuestion, { kind: "route" }>,
  shape: RouteShape,
  steps = 64,
): [number, number][] {
  const sign = question.flip ? -1 : 1;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const base = question.from + (question.to - question.from) * t;
    const bend =
      shape === "straight"
        ? 0
        : shape === "arch"
          ? -36 * Math.sin(Math.PI * t)
          : 26 * Math.sin(Math.PI * t) + 9 * Math.sin(5 * Math.PI * t);
    return [24 + 112 * t, base + sign * bend];
  });
}

export const routeLength = (points: [number, number][]) =>
  points.slice(1).reduce((total, [x, y], index) => {
    const [px, py] = points[index];
    return total + Math.hypot(x - px, y - py);
  }, 0);

/** What a question practises, for the result and the parent's records. */
export function compareTopic(question: CompareQuestion) {
  switch (question.kind) {
    case "compare":
      return question.measure === "length"
        ? needsLining(question)
          ? "比長短（先對齊）"
          : "比長短"
        : needsLining(question)
          ? "比高矮（先站到地上）"
          : "比高矮";
    case "thickness":
      return "比厚薄";
    case "line":
      return "直線和曲線";
    case "route":
      return "直線和曲線（哪條路最近）";
  }
}

/** The instruction ids read aloud: first how to line things up, then what to answer. */
export function comparePromptIds(question: CompareQuestion): { lineUp?: string; ask: string } {
  switch (question.kind) {
    case "compare":
      return {
        lineUp: needsLining(question) ? `align-${question.measure}` : undefined,
        ask: `${question.measure}-${question.ask}`,
      };
    case "thickness":
      return { ask: `thick-${question.ask}` };
    case "line":
      return { ask: `line-${question.ask}` };
    case "route":
      return { ask: "route" };
  }
}
