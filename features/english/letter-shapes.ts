/**
 * Every letter the English lessons show or ask for, drawn the way first graders are taught to
 * write it on four lines: a single-storey a and g, a capital I with bars (so it never looks like
 * l), and each stroke in the order and direction the workbook numbers it. The shapes are paths
 * in "band" units: the top line is y = 0, the dashed middle line 1, the baseline 2 and the bottom
 * line 3. Capitals stand from 0 to 2, small letters from 1 to 2, ascenders reach 0 (小f的頭要頂到
 * 天) and descenders 3 (g和j的腳踩底線). Each stroke starts where its path starts, which is the
 * blue dot in 描一描.
 */
export type LetterShape = {
  /** How wide the letter is, in band units. */
  width: number;
  /** SVG path data per stroke, in writing order. */
  strokes: string[];
};

/** The small letters' round part: a circle on the x-height band, drawn anticlockwise from 2 o'clock. */
const bowlLeft = "M0.93 1.25 A0.5 0.5 0 1 0 0.93 1.75";
/** b and p: the bowl drawn clockwise from the stem. */
const bowlRight = "M0.07 1.25 A0.5 0.5 0 1 1 0.07 1.75";
const dot = (x: number) => `M${x} 0.52 L${x} 0.58`;

export const lowerShapes: Record<string, LetterShape> = {
  a: { width: 1, strokes: [bowlLeft, "M1 1 V2"] },
  b: { width: 1, strokes: ["M0 0 V2", bowlRight] },
  c: { width: 0.95, strokes: [bowlLeft] },
  d: { width: 1, strokes: [bowlLeft, "M1 0 V2"] },
  e: { width: 1, strokes: ["M0.04 1.5 H0.98 A0.47 0.5 0 1 0 0.85 1.85"] },
  f: { width: 0.9, strokes: ["M0.9 0.18 C0.72 -0.04 0.3 -0.02 0.3 0.45 V2", "M0 1 H0.75"] },
  g: { width: 1, strokes: [bowlLeft, "M1 1 V2.55 C1 3.08 0.25 3.08 0.04 2.7"] },
  h: { width: 0.95, strokes: ["M0 0 V2", "M0 1.5 A0.475 0.45 0 0 1 0.95 1.5 V2"] },
  i: { width: 0.2, strokes: ["M0.1 1 V2", dot(0.1)] },
  j: { width: 0.75, strokes: ["M0.7 1 V2.55 C0.7 3.08 0.12 3.08 0 2.75", dot(0.7)] },
  // 小k的頭頂到天，手要縮起來: the arm and leg stay inside the x-height band.
  k: { width: 0.85, strokes: ["M0 0 V2", "M0.82 1 L0 1.6", "M0.28 1.4 L0.85 2"] },
  l: { width: 0.2, strokes: ["M0.1 0 V2"] },
  m: {
    width: 1.4,
    strokes: [
      "M0 1 V2",
      "M0 1.42 A0.35 0.38 0 0 1 0.7 1.42 V2",
      "M0.7 1.42 A0.35 0.38 0 0 1 1.4 1.42 V2",
    ],
  },
  n: { width: 0.9, strokes: ["M0 1 V2", "M0 1.48 A0.45 0.45 0 0 1 0.9 1.48 V2"] },
  o: { width: 1, strokes: ["M0.5 1 A0.5 0.5 0 1 0 0.5 2 A0.5 0.5 0 1 0 0.5 1"] },
  p: { width: 1, strokes: ["M0 1 V3", bowlRight] },
  q: { width: 1, strokes: [bowlLeft, "M1 1 V3"] },
  r: { width: 0.75, strokes: ["M0 1 V2", "M0 1.48 C0.12 1.06 0.5 0.95 0.75 1.1"] },
  s: {
    width: 0.85,
    strokes: [
      "M0.8 1.18 C0.62 0.94 0.04 0.97 0.06 1.28 C0.08 1.56 0.84 1.44 0.84 1.76 C0.84 2.08 0.2 2.06 0.02 1.84",
    ],
  },
  t: { width: 0.75, strokes: ["M0.3 0.4 V1.82 C0.3 2.04 0.55 2.05 0.72 1.93", "M0 1 H0.72"] },
  u: { width: 0.9, strokes: ["M0 1 V1.55 A0.45 0.45 0 0 0 0.9 1.55", "M0.9 1 V2"] },
  v: { width: 0.9, strokes: ["M0 1 L0.45 2 L0.9 1"] },
  w: { width: 1.4, strokes: ["M0 1 L0.35 2 L0.7 1.2 L1.05 2 L1.4 1"] },
  x: { width: 0.9, strokes: ["M0 1 L0.9 2", "M0.9 1 L0 2"] },
  y: { width: 0.95, strokes: ["M0 1 L0.48 2", "M0.95 1 L0.2 3"] },
  z: { width: 0.9, strokes: ["M0 1 H0.9 L0 2 H0.9"] },
};

/**
 * Capitals, in the workbook's stroke order. Only the lessons built so far; a unit test checks
 * every letter a lesson teaches has one.
 */
export const upperShapes: Record<string, LetterShape> = {
  A: { width: 1.6, strokes: ["M0.8 0 L0 2", "M0.8 0 L1.6 2", "M0.32 1.3 H1.28"] },
  // 大B和小b的肚子同一邊.
  B: {
    width: 1.25,
    strokes: [
      "M0 0 V2",
      "M0 0 H0.68 A0.48 0.5 0 0 1 0.68 1 H0",
      "M0 1 H0.74 A0.5 0.5 0 0 1 0.74 2 H0",
    ],
  },
  C: { width: 1.85, strokes: ["M1.6 0.3 A0.95 1 0 1 0 1.6 1.7"] },
  // 大D和小d的肚子不同邊.
  D: { width: 1.6, strokes: ["M0 0 V2", "M0 0 H0.6 A1 1 0 0 1 0.6 2 H0"] },
  E: { width: 1.2, strokes: ["M0 0 V2", "M0 0 H1.2", "M0 1 H1", "M0 2 H1.2"] },
  F: { width: 1.2, strokes: ["M0 0 V2", "M0 0 H1.2", "M0 1 H1"] },
  // G–M are drawn for the course list; check their stroke order against the workbook before
  // 第三、四課 trace them.
  G: { width: 1.9, strokes: ["M1.6 0.3 A0.95 1 0 1 0 1.9 1.1", "M1.2 1.1 H1.9"] },
  H: { width: 1.3, strokes: ["M0 0 V2", "M1.3 0 V2", "M0 1 H1.3"] },
  I: { width: 0.9, strokes: ["M0 0 H0.9", "M0.45 0 V2", "M0 2 H0.9"] },
  J: { width: 1.3, strokes: ["M0.3 0 H1.3", "M0.85 0 V1.45 C0.85 2.12 0.05 2.12 0 1.55"] },
  K: { width: 1.25, strokes: ["M0 0 V2", "M1.2 0 L0 1.2", "M0.45 0.75 L1.25 2"] },
  L: { width: 1.1, strokes: ["M0 0 V2 H1.1"] },
  M: { width: 1.6, strokes: ["M0 0 V2", "M0 0 L0.8 1.4", "M0.8 1.4 L1.6 0", "M1.6 0 V2"] },
};

export const isUpper = (letter: string) => letter !== letter.toLowerCase();

export const letterShape = (letter: string): LetterShape | undefined =>
  isUpper(letter) ? upperShapes[letter] : lowerShapes[letter];

/** The space between letters of a word, in band units. */
export const letterGap = 0.32;
