// Course cards show their watercolor at about 80 px, but the pictures are 720–800 px for the
// lesson pages. This writes a 256 px copy of each card's picture (enough for 3× screens) to
// public/course-art/thumbs/, which the cards load instead (ProgressiveImage's `thumb`).
// Run after adding or replacing a lesson's picture: npm run assets:thumbs
import { access, mkdir, readdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { courseArtwork } from "../features/courses/course-data";
import { mathCourse } from "../features/math/math-lessons";
import { cardThumbName } from "../components/card-thumbs";

const dir = "public/course-art";
const originals = "assets/artwork/optimized-originals";
const names = [
  ...courseArtwork.map((art) => `${art}-watercolor.webp`),
  ...mathCourse.flatMap((lesson) => (lesson.ready ? [`${lesson.art}.webp`] : [])),
];
await mkdir(`${dir}/thumbs`, { recursive: true });
const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );
let total = 0;
for (const name of names) {
  // The untouched original when there is one, so the copy is not compressed twice.
  const source = (await exists(`${originals}/${name}`)) ? `${originals}/${name}` : `${dir}/${name}`;
  const info = await sharp(source)
    .resize({ width: 256, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(`${dir}/${cardThumbName(name)}`);
  total += info.size;
}
// Thumbnails of pictures no card uses any more.
for (const file of await readdir(`${dir}/thumbs`))
  if (!names.some((name) => cardThumbName(name) === `thumbs/${file}`))
    await rm(`${dir}/thumbs/${file}`);
console.log(`Card thumbnails: ${names.length} files, ${(total / 1024).toFixed(0)} KB.`);
