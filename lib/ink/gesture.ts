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

/**
 * A capacitive stylus and a fingertip both arrive as pointerType "touch", so contact size
 * is the only hint that a touch is the side of a hand resting on the screen. Devices that
 * do not report contact size send 1 × 1 and are never rejected. The threshold, about 17 mm
 * on a 10-inch tablet, is far above a stylus tip or a child's fingertip. It has not been
 * tuned on the Redmi tablet itself.
 */
export const palmContactSize = 100;
export function isPalmContact(event: { pointerType: string; width: number; height: number }) {
  return event.pointerType === "touch" && Math.max(event.width, event.height) >= palmContactSize;
}

/**
 * Every sample the browser collected since the last frame. Stylus input often arrives
 * faster than the display refresh; without these, quick curves become straight segments.
 */
export function pointerSamples(event: PointerEvent): readonly PointerEvent[] {
  const coalesced = event.getCoalescedEvents?.();
  return coalesced?.length ? coalesced : [event];
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
