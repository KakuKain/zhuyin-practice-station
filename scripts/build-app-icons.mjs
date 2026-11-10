// The 小書包 icons, rendered from assets/artwork/app-icon.png (a watercolor backpack on cream,
// painted with ChatGPT): the home-screen icons for "加到主畫面" in public/icons/, the favicon,
// and the header's logo (icons/logo.webp), which shows only the bag.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = "assets/artwork/app-icon.png";
const background = "#f9f6ed";
await mkdir("public/icons", { recursive: true });

// `scale` is the picture's share of the square; the maskable icon keeps the bag inside the
// safe circle (80% of the square), which Android may crop to.
for (const [name, size, scale] of [
  ["app-192.png", 192, 1],
  ["app-512.png", 512, 1],
  ["app-maskable-512.png", 512, 0.84],
  ["apple-touch-icon.png", 180, 1],
]) {
  const picture = Math.round(size * scale);
  const inset = Math.round((size - picture) / 2);
  const rendered = await sharp(source).resize(picture, picture).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: rendered, top: inset, left: inset }])
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/${name}`);
}

// The bag fills the favicon and the header logo, which are drawn at 16–31 px.
const bag = { left: 170, top: 160, width: 690, height: 690 };
await sharp(source)
  .extract(bag)
  .resize(64, 64)
  .png({ compressionLevel: 9 })
  .toFile("public/favicon.png");
await sharp(source)
  .extract(bag)
  .resize(96, 96)
  .webp({ quality: 90 })
  .toFile("public/icons/logo.webp");
console.log("Wrote public/icons and public/favicon.png.");
