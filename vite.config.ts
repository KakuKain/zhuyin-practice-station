import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from a project sub-path. Public files are referenced with
// page-relative paths ("course-art/…"), so only index.html and CSS need the base.
const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
if (!/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error("Invalid GitHub Pages base path");

// One identity per build, compiled into the app and published as version.json, so an open
// app can tell that a newer version is live (see lib/loading/useAppUpdate.ts).
const build = process.env.GITHUB_SHA?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;
const buildDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());

export default defineConfig({
  base,
  define: {
    __APP_BUILD__: JSON.stringify(build),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    {
      name: "app-version",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ build }),
        });
      },
    },
  ],
  build: { outDir: "dist-pages", emptyOutDir: true },
});
