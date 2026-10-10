import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
const output = "dist-pages";
const html = readFileSync(join(output, "index.html"), "utf8");
assert(html.includes(`${base}assets/`), "HTML must load the bundle from the base path");
assert(html.includes(`${base}favicon.svg`), "Favicon must use the base path");

function files(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Scripts reference public files with page-relative paths ("course-art/…"). A
// root-absolute one would skip the project sub-path on GitHub Pages and 404.
const publicFolders = readdirSync("public").filter((name) =>
  statSync(join("public", name)).isDirectory(),
);
const rootAbsolute = new RegExp(`["'\`(]/(${publicFolders.join("|")})/`);
for (const path of files(join(output, "assets"))) {
  if (!path.endsWith(".js")) continue;
  assert(
    !rootAbsolute.test(readFileSync(path, "utf8")),
    `${path} references a public file with a root-absolute path`,
  );
}
for (const path of files(join(output, "assets"))) {
  if (!path.endsWith(".css")) continue;
  const css = readFileSync(path, "utf8");
  for (const [, url] of css.matchAll(/url\((?!data:)["']?([^"')]+)/g))
    assert(url.startsWith(base) || !url.startsWith("/"), `${path} has ${url} outside ${base}`);
}

// The open app compares its compiled build with version.json to load a newer deploy.
const { build } = JSON.parse(readFileSync(join(output, "version.json"), "utf8"));
assert(typeof build === "string" && build, "version.json must name the build");
assert(
  files(join(output, "assets")).some(
    (path) => path.endsWith(".js") && readFileSync(path, "utf8").includes(build),
  ),
  "The bundle must carry the same build as version.json",
);

const publicFiles = files("public");
for (const path of publicFiles) {
  const deployed = join(output, path.slice("public/".length));
  assert(readFileSync(path).equals(readFileSync(deployed)), `${path} is missing or changed`);
}
console.log(`Build verified: ${publicFiles.length} public files, including audio and fonts.`);
