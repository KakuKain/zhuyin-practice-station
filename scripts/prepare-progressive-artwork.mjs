import { readdir, mkdir, copyFile, writeFile, access, readFile } from "node:fs/promises";
import sharp from "sharp";
const dir = "public/course-art";
const backup = "assets/artwork/optimized-originals";
await mkdir(backup, { recursive: true });
const previews = {};
let before = 0,
  after = 0;
for (const name of (await readdir(dir)).filter((name) => name.endsWith(".webp"))) {
  const path = `${dir}/${name}`;
  try {
    await access(`${backup}/${name}`);
  } catch {
    await copyFile(path, `${backup}/${name}`);
  }
  const original = await readFile(`${backup}/${name}`);
  const metadata = await sharp(original).metadata();
  const width = /landscape|paper|footer/.test(name) ? 1400 : /play-button/.test(name) ? 640 : 800;
  const optimized = await sharp(original)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toBuffer();
  const result = optimized.length < original.length ? optimized : original;
  await writeFile(path, result);
  previews[`/course-art/${name}`] = {
    src: `data:image/webp;base64,${(await sharp(original).resize({ width: 24, withoutEnlargement: true }).webp({ quality: 40 }).toBuffer()).toString("base64")}`,
    width: metadata.width,
    height: metadata.height,
  };
  before += original.length;
  after += result.length;
}
await writeFile("components/artwork-previews.json", JSON.stringify(previews));
console.log(JSON.stringify({ before, after, saved: before - after }));
