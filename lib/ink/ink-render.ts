import type { InkPoint, InkStroke } from "../../features/types";

export function pointerPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): InkPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
  };
}

export function renderInk(canvas: HTMLCanvasElement, strokes: InkStroke[], lasso?: InkStroke) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.strokeStyle = "#27463f";
  context.fillStyle = "#27463f";
  context.lineWidth = Math.max(3, rect.width * 0.009);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);
  const trace = (points: InkStroke) => {
    context.beginPath();
    context.moveTo((points[0].x * rect.width) / 100, (points[0].y * rect.height) / 100);
    for (const point of points.slice(1))
      context.lineTo((point.x * rect.width) / 100, (point.y * rect.height) / 100);
  };
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    if (stroke.length === 1) {
      context.beginPath();
      context.arc(
        (stroke[0].x * rect.width) / 100,
        (stroke[0].y * rect.height) / 100,
        context.lineWidth / 2,
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      trace(stroke);
      context.stroke();
    }
  }
  if (lasso?.length) {
    trace(lasso);
    context.closePath();
    context.fillStyle = "rgba(242, 175, 65, 0.16)";
    context.fill();
    context.strokeStyle = "#bd7418";
    context.lineWidth = 2;
    context.setLineDash([6, 5]);
    context.stroke();
    context.setLineDash([]);
  }
}
