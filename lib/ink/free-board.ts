export const freeBoardKey = "kid-free-dictation-v1";
export const boardStep = 152;
export const boardHeight = 1812;
export type BoardStroke = { color: string; erase: boolean; points: [number, number][] };
export type BoardDraft = {
  version: 2;
  width: number;
  height: number;
  paper: "grid" | "blank";
  strokes: BoardStroke[];
};

/** v1 scaled ink independently of the grid. Convert once at its displayed width. */
export function readBoardDraft(raw: unknown, displayedWidth: number): BoardDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<BoardDraft>;
  const legacy = data.version === undefined;
  if ((!legacy && data.version !== 2) || !Array.isArray(data.strokes) || data.strokes.length > 2000)
    return null;
  const width = legacy ? displayedWidth : data.width!;
  const height = legacy
    ? data.paper === "blank"
      ? (displayedWidth * 2400) / 720
      : boardHeight
    : data.height!;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 140 ||
    width > 2400 ||
    height < 140 ||
    height > 10000
  )
    return null;
  const strokes: BoardStroke[] = [];
  for (const s of data.strokes) {
    if (
      !s ||
      !["#193458", "#d43838"].includes(s.color) ||
      typeof s.erase !== "boolean" ||
      !Array.isArray(s.points) ||
      !s.points.length ||
      s.points.length > 1900
    )
      return null;
    const points: [number, number][] = [];
    for (const p of s.points) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) return null;
      const x = legacy ? (p[0] * width) / 720 : p[0];
      const y = legacy ? (p[1] * height) / 2400 : p[1];
      if (x < 0 || y < 0 || x > width || y > height) return null;
      points.push([x, y]);
    }
    strokes.push({ color: s.color, erase: s.erase, points });
  }
  return { version: 2, width, height, paper: data.paper === "blank" ? "blank" : "grid", strokes };
}

export function paintBoard(ctx: CanvasRenderingContext2D, strokes: readonly BoardStroke[]) {
  for (const stroke of strokes) {
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.erase ? 28 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    stroke.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] + 0.1, stroke.points[0][1]);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}
