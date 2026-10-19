/**
 * 第五課 方盒、圓罐、球. Like 第二、三課, every question is a tap, checked at once and tried again
 * until right. A round walks the textbook's sections: 堆疊與分類, 認識平面圖形, then 做造型.
 */

/** The three kinds of solid the lesson names. */
export type Solid = "box" | "can" | "ball";
/** The flat shapes a child finds by tracing a face, or builds pictures from. */
export type Flat = "square" | "rect" | "triangle" | "circle";

export const solidNames: Record<Solid, string> = { box: "方盒", can: "圓罐", ball: "球" };
export const flatNames: Record<Flat, string> = {
  square: "正方形",
  rect: "長方形",
  triangle: "三角形",
  circle: "圓形",
};
export const solids: Solid[] = ["box", "can", "ball"];
export const flats: Flat[] = ["square", "rect", "triangle", "circle"];

/** Things from home, drawn in ShapeArt.tsx: what kind of solid each is, and its traced face. */
export const things = {
  tissue: { solid: "box", name: "面紙盒", face: "rect" },
  gift: { solid: "box", name: "禮物盒", face: "square" },
  dice: { solid: "box", name: "骰子", face: "square" },
  tin: { solid: "can", name: "罐頭", face: "circle" },
  drum: { solid: "can", name: "鼓", face: "circle" },
  cookie: { solid: "can", name: "餅乾罐", face: "circle" },
  beachball: { solid: "ball", name: "海灘球" },
  orange: { solid: "ball", name: "柳丁" },
  basketball: { solid: "ball", name: "籃球" },
} as const satisfies Record<string, { solid: Solid; name: string; face?: Flat }>;
export type Thing = keyof typeof things;
const thingNames = Object.keys(things) as Thing[];
/** Things with a face to trace: the boxes and the cans. */
const traceable = thingNames.filter((thing) => "face" in things[thing]);

/** A flat shape among others to find: which kind, how it is drawn, and its colour. */
export type Piece = { flat: Flat; variant: number; color: number };
/** How many ways each flat shape is drawn: sizes, and wide or tall, so they are not all alike. */
export const pieceVariants: Record<Flat, number> = { square: 2, rect: 2, triangle: 3, circle: 2 };

/**
 * The 做造型 pictures, each made of flat shapes. Coordinates are in a 100 × 100 picture; a
 * triangle is its three corners. A shape may sit on another, like eyes on a head, but each is
 * outlined so it can be counted. A 正方形 is exactly square and a 長方形 at least half again as
 * long as it is wide, so the two are never confused.
 */
export type PicturePart =
  | { flat: "square" | "rect"; x: number; y: number; w: number; h: number; color: number }
  | { flat: "circle"; cx: number; cy: number; r: number; color: number }
  | { flat: "triangle"; points: [number, number][]; color: number };

export const pictures = {
  house: {
    name: "房子",
    parts: [
      { flat: "rect", x: 66, y: 12, w: 8, h: 22, color: 5 },
      {
        flat: "triangle",
        points: [
          [20, 42],
          [50, 14],
          [80, 42],
        ],
        color: 0,
      },
      { flat: "square", x: 25, y: 42, w: 50, h: 50, color: 3 },
      { flat: "rect", x: 44, y: 64, w: 13, h: 28, color: 5 },
      { flat: "square", x: 30, y: 50, w: 11, h: 11, color: 1 },
      { flat: "square", x: 60, y: 50, w: 11, h: 11, color: 1 },
    ],
  },
  robot: {
    name: "機器人",
    parts: [
      { flat: "circle", cx: 50, cy: 6, r: 4, color: 0 },
      { flat: "square", x: 37, y: 12, w: 26, h: 26, color: 1 },
      { flat: "circle", cx: 44, cy: 24, r: 3.5, color: 4 },
      { flat: "circle", cx: 56, cy: 24, r: 3.5, color: 4 },
      { flat: "rect", x: 28, y: 41, w: 44, h: 28, color: 2 },
      { flat: "rect", x: 18, y: 41, w: 10, h: 24, color: 3 },
      { flat: "rect", x: 72, y: 41, w: 10, h: 24, color: 3 },
      { flat: "rect", x: 35, y: 73, w: 11, h: 21, color: 5 },
      { flat: "rect", x: 54, y: 73, w: 11, h: 21, color: 5 },
    ],
  },
  train: {
    name: "火車",
    parts: [
      { flat: "rect", x: 20, y: 20, w: 9, h: 16, color: 5 },
      { flat: "square", x: 50, y: 20, w: 28, h: 28, color: 1 },
      { flat: "square", x: 57, y: 25, w: 13, h: 13, color: 3 },
      { flat: "rect", x: 10, y: 38, w: 70, h: 30, color: 0 },
      {
        flat: "triangle",
        points: [
          [80, 50],
          [94, 68],
          [80, 68],
        ],
        color: 4,
      },
      { flat: "circle", cx: 24, cy: 76, r: 8, color: 2 },
      { flat: "circle", cx: 46, cy: 76, r: 8, color: 2 },
      { flat: "circle", cx: 68, cy: 76, r: 8, color: 2 },
    ],
  },
  tree: {
    name: "大樹",
    parts: [
      { flat: "circle", cx: 84, cy: 16, r: 10, color: 3 },
      {
        flat: "triangle",
        points: [
          [32, 30],
          [50, 6],
          [68, 30],
        ],
        color: 2,
      },
      {
        flat: "triangle",
        points: [
          [26, 52],
          [50, 26],
          [74, 52],
        ],
        color: 2,
      },
      {
        flat: "triangle",
        points: [
          [20, 76],
          [50, 48],
          [80, 76],
        ],
        color: 2,
      },
      { flat: "rect", x: 44, y: 78, w: 12, h: 18, color: 5 },
    ],
  },
  rocket: {
    name: "火箭",
    parts: [
      {
        flat: "triangle",
        points: [
          [34, 30],
          [50, 4],
          [66, 30],
        ],
        color: 0,
      },
      { flat: "rect", x: 35, y: 32, w: 30, h: 50, color: 1 },
      { flat: "circle", cx: 50, cy: 46, r: 6, color: 3 },
      { flat: "circle", cx: 50, cy: 64, r: 6, color: 3 },
      {
        flat: "triangle",
        points: [
          [18, 82],
          [32, 58],
          [32, 82],
        ],
        color: 4,
      },
      {
        flat: "triangle",
        points: [
          [68, 58],
          [82, 82],
          [68, 82],
        ],
        color: 4,
      },
    ],
  },
  cat: {
    name: "小貓",
    parts: [
      {
        flat: "triangle",
        points: [
          [22, 30],
          [28, 6],
          [42, 22],
        ],
        color: 3,
      },
      {
        flat: "triangle",
        points: [
          [58, 22],
          [72, 6],
          [78, 30],
        ],
        color: 3,
      },
      { flat: "circle", cx: 50, cy: 52, r: 30, color: 3 },
      { flat: "circle", cx: 39, cy: 46, r: 5, color: 4 },
      { flat: "circle", cx: 61, cy: 46, r: 5, color: 4 },
      {
        flat: "triangle",
        points: [
          [45, 58],
          [55, 58],
          [50, 65],
        ],
        color: 0,
      },
      { flat: "rect", x: 38, y: 88, w: 24, h: 8, color: 5 },
    ],
  },
} as const satisfies Record<string, { name: string; parts: readonly PicturePart[] }>;
export type Picture = keyof typeof pictures;
const pictureNames = Object.keys(pictures) as Picture[];

/** How many shapes of a kind a picture is made of. */
export const countIn = (picture: Picture, flat: Flat) =>
  (pictures[picture].parts as readonly PicturePart[]).filter((part) => part.flat === flat).length;

export type ShapeQuestion =
  /** 分類: a thing from home; tap 方盒, 圓罐 or 球. */
  | { kind: "classify"; thing: Thing; choices: Solid[] }
  /** 疊疊看: which one cannot be stacked up (the ball). */
  | { kind: "stack"; choices: Solid[] }
  /** 滾滾看: which one does not roll (the box). */
  | { kind: "roll"; choices: Solid[] }
  /** 描下來: the coloured face of a box or a can, traced; tap the flat shape it makes. */
  | { kind: "trace"; thing: Thing; choices: Flat[] }
  /** 認識平面圖形: tap every shape of one kind among six, in any order. */
  | { kind: "find"; target: Flat; pieces: Piece[] }
  /** 做造型: how many shapes of one kind a picture is made of. */
  | { kind: "build"; picture: Picture; target: Flat; choices: number[] };

export const shapeKinds = ["classify", "stack", "roll", "trace", "find", "build"] as const;
export const isShapeQuestion = (question: { kind: string }): question is ShapeQuestion =>
  (shapeKinds as readonly string[]).includes(question.kind);

export const shapeRoundSize = 9;

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const pick = <T>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)];

/** Six shapes with two or three of the target among them, in no particular order. */
export function findQuestion(random = Math.random): Extract<ShapeQuestion, { kind: "find" }> {
  const target = pick(flats, random);
  const matching = 2 + Math.floor(random() * 2);
  const others = shuffle(
    flats.filter((flat) => flat !== target),
    random,
  );
  const kinds = [
    ...Array<Flat>(matching).fill(target),
    ...Array.from({ length: 6 - matching }, (_, index) => others[index % others.length]),
  ];
  const colors = shuffle([0, 1, 2, 3, 4, 5], random);
  return {
    kind: "find",
    target,
    pieces: shuffle(kinds, random).map((flat, index) => ({
      flat,
      variant: Math.floor(random() * pieceVariants[flat]),
      color: colors[index],
    })),
  };
}

/** A picture and a shape it uses at least twice, so there is counting to do; four numbers. */
export function buildQuestion(
  picture: Picture,
  random = Math.random,
): Extract<ShapeQuestion, { kind: "build" }> {
  const target = pick(
    flats.filter((flat) => countIn(picture, flat) >= 2),
    random,
  );
  const answer = countIn(picture, target);
  const near = shuffle(
    [1, 2, 3, 4, 5, 6, 7].filter((value) => value !== answer),
    random,
  ).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));
  return {
    kind: "build",
    picture,
    target,
    choices: [answer, ...near.slice(0, 3)].sort((a, b) => a - b),
  };
}

/**
 * One round in the textbook's order: 分類 twice (two different kinds of solid), 疊疊看, 滾滾看,
 * 描下來 twice (a box, then a can), finding shapes, then 做造型 twice with different pictures.
 */
export function buildShapeRound(random = Math.random): ShapeQuestion[] {
  const [firstKind, secondKind] = shuffle(solids, random);
  const thingOf = (solid: Solid) =>
    pick(
      thingNames.filter((thing) => things[thing].solid === solid),
      random,
    );
  const traceOf = (solid: Solid) =>
    pick(
      traceable.filter((thing) => things[thing].solid === solid),
      random,
    );
  const [firstPicture, secondPicture] = shuffle(pictureNames, random);
  return [
    { kind: "classify", thing: thingOf(firstKind), choices: shuffle(solids, random) },
    { kind: "classify", thing: thingOf(secondKind), choices: shuffle(solids, random) },
    { kind: "stack", choices: shuffle(solids, random) },
    { kind: "roll", choices: shuffle(solids, random) },
    { kind: "trace", thing: traceOf("box"), choices: shuffle(flats, random) },
    { kind: "trace", thing: traceOf("can"), choices: shuffle(flats, random) },
    findQuestion(random),
    buildQuestion(firstPicture, random),
    buildQuestion(secondPicture, random),
  ];
}

/** 「把所有的三角形都點出來」 takes its taps in any order. */
export const shapeInAnyOrder = (question: ShapeQuestion) => question.kind === "find";

/** The taps that answer a question: one, or every matching shape for 找圖形. */
export function shapeAnswer(question: ShapeQuestion): number[] {
  switch (question.kind) {
    case "classify":
      return [question.choices.indexOf(things[question.thing].solid)];
    case "stack":
      return [question.choices.indexOf("ball")];
    case "roll":
      return [question.choices.indexOf("box")];
    case "trace": {
      const thing = things[question.thing];
      return [question.choices.indexOf("face" in thing ? thing.face : "circle")];
    }
    case "find":
      return question.pieces.flatMap((piece, index) =>
        piece.flat === question.target ? [index] : [],
      );
    case "build":
      return [question.choices.indexOf(countIn(question.picture, question.target))];
  }
}

/** The section a question belongs to, shown in the header. */
export function shapeSection(question: ShapeQuestion) {
  switch (question.kind) {
    case "classify":
    case "stack":
    case "roll":
      return "堆疊與分類";
    case "trace":
    case "find":
      return "認識平面圖形";
    case "build":
      return "做造型";
  }
}

/** What a question practises, for the result and the parent's records. */
export function shapeTopic(question: ShapeQuestion) {
  switch (question.kind) {
    case "classify":
      return `堆疊與分類（${things[question.thing].name}是${solidNames[things[question.thing].solid]}）`;
    case "stack":
      return "堆疊與分類（球不能疊起來）";
    case "roll":
      return "堆疊與分類（方盒不會滾）";
    case "trace":
      return `認識平面圖形（描${things[question.thing].name}）`;
    case "find":
      return `認識平面圖形（找${flatNames[question.target]}）`;
    case "build":
      return `做造型（數${flatNames[question.target]}）`;
  }
}

/** The instruction read aloud. */
export function shapePromptId(question: ShapeQuestion) {
  switch (question.kind) {
    case "classify":
    case "stack":
    case "roll":
    case "trace":
      return `shape-${question.kind}`;
    case "find":
      return `find-${question.target}`;
    case "build":
      return `build-${question.target}`;
  }
}
