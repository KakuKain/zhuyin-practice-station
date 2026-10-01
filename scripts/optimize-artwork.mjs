// Lossless conversion only. Keep editable originals outside the public directory.
import { readdir, mkdir, readFile, rename, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = `${root}assets/artwork`;
await mkdir(source, { recursive: true });
const deployed = `${root}public/course-art`;
const newFiles = (await readdir(deployed)).filter((file) => file.endsWith(".png"));
for (const file of newFiles) await rename(`${deployed}/${file}`, `${source}/${file}`);
let before = 0,
  after = 0;
for (const file of (await readdir(source)).filter((file) => file.endsWith(".png"))) {
  const destination = `${deployed}/${file.replace(/\.png$/, ".webp")}`;
  before += (await stat(`${source}/${file}`)).size;
  const artwork = sharp(`${source}/${file}`);
  // The circular CTA never exceeds 282 CSS px; retain enough pixels for 2x displays.
  if (file === "listening-play-button-watercolor-v1.png") {
    artwork.resize({ width: 640, withoutEnlargement: true });
  }
  await artwork.webp({ lossless: true, effort: 6 }).toFile(destination);
  after += (await stat(destination)).size;
}
// Update both explicit and dynamic image paths in source/styles.
async function update(directory) {
  for (const entry of await readdir(`${root}${directory}`, { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await update(relative);
    else if (/\.(css|tsx?)$/.test(entry.name)) {
      const file = `${root}${relative}`;
      const original = await readFile(file, "utf8");
      const optimized = original.replace(/(\/course-art\/[^"'`)]*)\.png/g, "$1.webp");
      if (original !== optimized) await writeFile(file, optimized);
    }
  }
}
for (const directory of ["features", "components", "styles"]) await update(directory);
console.log(`Artwork: ${before.toLocaleString()} → ${after.toLocaleString()} bytes (lossless)`);
