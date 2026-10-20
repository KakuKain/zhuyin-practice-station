import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { courseArtwork } from "../../features/courses/course-data";
import { mathCourse } from "../../features/math/math-lessons";
import { cardThumb } from "../../components/card-thumbs";

test("every course card has a 256 px thumbnail, much smaller than its picture", () => {
  const pictures = [
    ...courseArtwork.map((art) => `course-art/${art}-watercolor.webp`),
    ...mathCourse.flatMap((lesson) => (lesson.ready ? [`course-art/${lesson.art}.webp`] : [])),
  ];
  for (const picture of pictures) {
    const thumb = cardThumb(picture);
    assert.ok(existsSync(`public/${thumb}`), `${thumb}: run npm run assets:thumbs`);
    assert.ok(
      statSync(`public/${thumb}`).size < statSync(`public/${picture}`).size * 0.6,
      `${thumb} should be far smaller than ${picture}`,
    );
  }
  // No thumbnail is left behind for a picture no card shows.
  const shown = new Set(pictures.map((picture) => cardThumb(picture).split("/").pop()));
  for (const file of readdirSync("public/course-art/thumbs")) assert.ok(shown.has(file), file);
});
