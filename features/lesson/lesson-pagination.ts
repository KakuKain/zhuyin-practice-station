/** Balanced contiguous pages avoid a last page with just one isolated line. */
export function paginateLesson(lineCount: number, maxColumns: number) {
  const pageCount = Math.max(1, Math.ceil(lineCount / maxColumns));
  const base = Math.floor(lineCount / pageCount);
  const extra = lineCount % pageCount;
  let start = 0;
  return Array.from({ length: pageCount }, (_, index) => {
    const count = base + Number(index < extra);
    const page = { start, count };
    start += count;
    return page;
  });
}
