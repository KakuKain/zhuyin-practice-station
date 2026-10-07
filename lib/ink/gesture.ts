/** One owner until it lifts; additional touch points never continue its path. */
export class PointerLease {
  private owner: number | null = null;
  acquire(id: number) {
    if (this.owner !== null) return false;
    this.owner = id;
    return true;
  }
  owns(id: number) {
    return this.owner === id;
  }
  release() {
    const id = this.owner;
    this.owner = null;
    return id;
  }
}

/** Keep endpoints and bound long strokes without storing a bitmap. */
export function appendSample<T>(
  points: T[],
  point: T,
  distance: (a: T, b: T) => number,
  minimum: number,
) {
  if (points.length && distance(points[points.length - 1], point) < minimum) return;
  points.push(point);
  if (points.length > 1900) {
    const sampled = points.filter((_, i) => i === 0 || i % 2 === 1 || i === points.length - 1);
    points.splice(0, points.length, ...sampled);
  }
}

export function createPaintScheduler() {
  let frame: number | null = null;
  return {
    schedule(paint: () => void) {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        paint();
      });
    },
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
