import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
const output = "dist-pages";
const html = readFileSync(join(output, "index.html"), "utf8");
assert(html.includes(`${base}assets/`), "HTML must load the Pages JavaScript bundle");
assert(html.includes(`${base}favicon.svg`), "Favicon must use the Pages path");

function files(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

for (const path of files(join(output, "assets"))) {
  if (!/\.(js|css)$/.test(path)) continue;
  assert(
    !/(["'`(])\/(course-art|fonts|listening-audio)\//.test(readFileSync(path, "utf8")),
    `${path} contains a public URL missing its Pages prefix`,
  );
}
const publicFiles = files("public");
for (const path of publicFiles) {
  const deployed = join(output, path.slice("public/".length));
  assert(readFileSync(path).equals(readFileSync(deployed)), `${path} is missing or changed`);
}
console.log(
  `GitHub Pages build verified: ${publicFiles.length} public files, including audio and fonts.`,
);
