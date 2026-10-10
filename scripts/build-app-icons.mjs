// Home-screen icons for "加到主畫面", rendered from public/favicon.svg.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = "public/favicon.svg";
const background = "#f8fcff";
await mkdir("public/icons", { recursive: true });

// `scale` is the logo's share of the square; maskable icons keep it inside the safe circle.
for (const [name, size, scale] of [
  ["app-192.png", 192, 0.72],
  ["app-512.png", 512, 0.72],
  ["app-maskable-512.png", 512, 0.56],
  ["apple-touch-icon.png", 180, 0.72],
]) {
  const logo = Math.round(size * scale);
  const inset = Math.round((size - logo) / 2);
  const rendered = await sharp(source, { density: 1200 }).resize(logo, logo).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: rendered, top: inset, left: inset }])
    .png()
    .toFile(`public/icons/${name}`);
}
console.log("Wrote public/icons.");
