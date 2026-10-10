import type { InkPoint, InkStroke } from "../../features/types";
import { legacyInkWidth } from "./ink-brush";

const EPSILON = 0.000001;
export const cloneInk = (strokes: InkStroke[]) =>
  strokes.map((stroke) => stroke.map((point) => ({ ...point })));

const cross = (a: InkPoint, b: InkPoint) => a.x * b.y - a.y * b.x;
const subtract = (a: InkPoint, b: InkPoint) => ({ x: a.x - b.x, y: a.y - b.y });
const interpolate = (a: InkPoint, b: InkPoint, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  ...(a.width !== undefined || b.width !== undefined
    ? {
        width:
          (a.width ?? legacyInkWidth) +
          ((b.width ?? legacyInkWidth) - (a.width ?? legacyInkWidth)) * t,
      }
    : {}),
});
const samePoint = (a: InkPoint, b: InkPoint) => Math.hypot(a.x - b.x, a.y - b.y) < EPSILON;

export function isUsableLasso(points: InkPoint[]) {
  if (points.length < 3) return false;
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += cross(a, b);
  }
  // A tap or straight flick is not an erase selection.
  return Math.abs(area) / 2 >= 2;
}

export function pointInLasso(point: InkPoint, polygon: InkPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[previous];
    const b = polygon[index];
    const edge = subtract(b, a);
    const offset = subtract(point, a);
    if (
      Math.abs(cross(edge, offset)) < EPSILON &&
      point.x >= Math.min(a.x, b.x) - EPSILON &&
      point.x <= Math.max(a.x, b.x) + EPSILON &&
      point.y >= Math.min(a.y, b.y) - EPSILON &&
      point.y <= Math.max(a.y, b.y) + EPSILON
    )
      return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function intersectionParameters(a: InkPoint, b: InkPoint, polygon: InkPoint[]) {
  const direction = subtract(b, a);
  const lengthSquared = direction.x ** 2 + direction.y ** 2;
  const values = [0, 1];
  if (lengthSquared < EPSILON) return values;
  for (let index = 0; index < polygon.length; index++) {
    const c = polygon[index];
    const d = polygon[(index + 1) % polygon.length];
    const edge = subtract(d, c);
    const offset = subtract(c, a);
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) < EPSILON) {
      if (Math.abs(cross(offset, direction)) < EPSILON) {
        for (const point of [c, d]) {
          const relative = subtract(point, a);
          const t = (relative.x * direction.x + relative.y * direction.y) / lengthSquared;
          if (t > 0 && t < 1) values.push(t);
        }
      }
      continue;
    }
    const t = cross(offset, edge) / denominator;
    const u = cross(offset, direction) / denominator;
    if (t > EPSILON && t < 1 - EPSILON && u >= -EPSILON && u <= 1 + EPSILON) values.push(t);
  }
  return values
    .sort((x, y) => x - y)
    .filter((value, index, all) => index === 0 || value - all[index - 1] > EPSILON);
}

/** Clip only the portions inside the loop, including crossings between samples. */
export function eraseInsideLasso(strokes: InkStroke[], polygon: InkPoint[]): InkStroke[] {
  if (!isUsableLasso(polygon)) return strokes;
  const result: InkStroke[] = [];
  let changed = false;
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    if (stroke.length === 1) {
      if (pointInLasso(stroke[0], polygon)) changed = true;
      else result.push(stroke);
      continue;
    }
    let fragment: InkStroke = [];
    const flush = () => {
      if (fragment.length) result.push(fragment);
      fragment = [];
    };
    for (let index = 1; index < stroke.length; index++) {
      const a = stroke[index - 1];
      const b = stroke[index];
      if (samePoint(a, b)) {
        if (pointInLasso(a, polygon)) {
          changed = true;
          flush();
        } else if (!fragment.length) fragment.push(a);
        continue;
      }
      const parameters = intersectionParameters(a, b, polygon);
      for (let part = 1; part < parameters.length; part++) {
        const start = parameters[part - 1];
        const end = parameters[part];
        if (pointInLasso(interpolate(a, b, (start + end) / 2), polygon)) {
          changed = true;
          flush();
        } else {
          const first = interpolate(a, b, start);
          const last = interpolate(a, b, end);
          if (fragment.length && !samePoint(fragment[fragment.length - 1], first)) flush();
          if (!fragment.length) fragment.push(first);
          if (!samePoint(fragment[fragment.length - 1], last)) fragment.push(last);
        }
      }
    }
    flush();
  }
  return changed ? result : strokes;
}

/** Per-cell history; unchanged selections never consume an undo step. */
export class InkHistory {
  private previous: InkStroke[][] = [];
  constructor(
    public strokes: InkStroke[] = [],
    private readonly limit = 30,
  ) {}
  get canUndo() {
    return this.previous.length > 0;
  }
  commit(next: InkStroke[]) {
    if (next === this.strokes) return false;
    this.previous.push(this.strokes);
    if (this.previous.length > this.limit) this.previous.shift();
    this.strokes = next;
    return true;
  }
  /** Replace the current strokes without a new undo step (a stroke rejoined after a skip). */
  amend(next: InkStroke[]) {
    if (next === this.strokes) return false;
    this.strokes = next;
    return true;
  }
  undo() {
    const previous = this.previous.pop();
    if (!previous) return false;
    this.strokes = previous;
    return true;
  }
}
