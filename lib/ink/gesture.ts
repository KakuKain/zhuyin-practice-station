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
 * is only a hint that a touch is the side of a hand resting on the screen. Require a
 * broad contact in both directions: a tilted capacitive tip or fingertip can report an
 * elongated contact. Devices that do not report contact size send 1 × 1 and are never
 * rejected. This conservative CSS-pixel threshold is not hardware palm detection and
 * has not been tuned on the Redmi tablet itself.
 */
export const palmContactSize = 100;
export function isPalmContact(event: { pointerType: string; width: number; height: number }) {
  return event.pointerType === "touch" && Math.min(event.width, event.height) >= palmContactSize;
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

/** Where a lifted contact was last seen and how fast it was moving, in CSS pixels. */
export type ContactEnd = { x: number; y: number; time: number; speed: number };

/**
 * A passive capacitive pen can lose the screen for a few frames mid-stroke, which arrives
 * as a lift and a new touch. Track recent speed so a touch that comes back right away, where
 * the pen was heading, continues the same stroke instead of leaving a gap.
 */
export function createContactMotion() {
  let last: { x: number; y: number; time: number } | null = null;
  let speed = 0;
  return {
    add(x: number, y: number, time: number) {
      if (last) {
        const elapsed = time - last.time;
        // Bursts of samples with near-identical timestamps say nothing about speed.
        if (elapsed >= 4)
          speed = speed * 0.5 + (Math.hypot(x - last.x, y - last.y) / elapsed) * 0.5;
        if (elapsed < 0) return;
      }
      last = { x, y, time };
    },
    end(time: number): ContactEnd | null {
      return last && { x: last.x, y: last.y, time, speed: Math.min(speed, 1.5) };
    },
  };
}

/** Only a gap no child would leave on purpose: under 0.12 s, close to where the pen was going. */
export const rejoinWindowMs = 120;
export function resumesContact(end: ContactEnd | null, x: number, y: number, time: number) {
  if (!end) return false;
  const elapsed = time - end.time;
  return (
    elapsed >= 0 &&
    elapsed <= rejoinWindowMs &&
    Math.hypot(x - end.x, y - end.y) <= 24 + end.speed * elapsed
  );
}
