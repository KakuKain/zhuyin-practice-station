import type { CatalogLesson } from "../courses/materials";

/**
 * Built-in lessons show the title as the rightmost column, but stored drafts keep the
 * original cell order (body first, title appended), so line starts map the two.
 */
export function fillLayout(lesson: CatalogLesson) {
  const lines = lesson.exercise.lines;
  const lessonLines =
    lesson.custom || lesson.listeningOnly
      ? lines
      : [lines[lines.length - 1], ...lines.slice(0, -1)];
  const lessonItems = lines.flat();
  const fillLineStarts = lessonLines.map((_, lineIndex) =>
    !lesson.custom && lineIndex === 0
      ? lessonItems.length - lessonLines[0].length
      : lessonLines
          .slice(lesson.custom ? 0 : 1, lineIndex)
          .reduce((count, line) => count + line.length, 0),
  );
  return { lessonLines, lessonItems, fillLineStarts };
}
