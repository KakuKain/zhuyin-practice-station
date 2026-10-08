import type { InkPoint, InkStroke } from "../../features/types";

export const legacyInkWidth = 1.5;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

type BrushSample = { timeStamp: number; pointerType: string; pressure: number };

/** Passive capacitive pens report touch with no useful pressure. Use speed instead. */
export function createInkBrush(canvasWidth: number) {
  // A clearly visible 4–8 CSS px body. Store relative widths so review and resize match.
  const base = (clamp(canvasWidth * 0.018, 4, 8) / canvasWidth) * 100;
  let previous: { point: InkPoint; time: number } | undefined;
  let weight = 1;
  return (point: InkPoint, event: BrushSample): InkPoint => {
    const elapsed = previous ? clamp(event.timeStamp - previous.time, 1, 64) : 16;
    const distance = previous
      ? (Math.hypot(point.x - previous.point.x, point.y - previous.point.y) * canvasWidth) / 100
      : 0;
    const speedWeight = 1.25 - clamp(distance / elapsed / 1.5, 0, 1) * 0.6;
    const pressure = event.pressure;
    // Zero at pen-up (or missing pressure) must never make a stroke disappear.
    const target =
      event.pointerType === "pen" && Number.isFinite(pressure) && pressure > 0
        ? 0.65 + Math.sqrt(clamp(pressure, 0, 1)) * 0.75
        : previous
          ? speedWeight
          : 1;
    weight += (target - weight) * (1 - Math.exp(-elapsed / 32));
    previous = { point, time: event.timeStamp };
    return { ...point, width: round(base * weight) };
  };
}

const outlineCache = new WeakMap<InkStroke, { last: InkPoint; length: number; path: string }>();

/** One filled outline for both the canvas and SVG review; rounded joins, no thin gaps. */
export function inkOutline(stroke: InkStroke): string {
  if (!stroke.length) return "";
  const last = stroke[stroke.length - 1];
  const cached = outlineCache.get(stroke);
  if (cached?.last === last && cached.length === stroke.length) return cached.path;
  const parts: string[] = [];
  const radius = (point: InkPoint) => (point.width ?? legacyInkWidth) / 2;
  for (let index = 0; index < stroke.length; index++) {
    const b = stroke[index];
    const r = radius(b);
    // Round dots also cover joins in the tapered segments below.
    parts.push(
      `M${round(b.x + r)} ${b.y}a${round(r)} ${round(r)} 0 1 1 ${round(-2 * r)} 0a${round(r)} ${round(r)} 0 1 1 ${round(2 * r)} 0Z`,
    );
    if (!index) continue;
    const a = stroke[index - 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (!length) continue;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    const ar = radius(a);
    parts.push(
      `M${round(a.x - nx * ar)} ${round(a.y - ny * ar)}L${round(b.x - nx * r)} ${round(b.y - ny * r)}L${round(b.x + nx * r)} ${round(b.y + ny * r)}L${round(a.x + nx * ar)} ${round(a.y + ny * ar)}Z`,
    );
  }
  const path = parts.join("");
  outlineCache.set(stroke, { last, length: stroke.length, path });
  return path;
}
