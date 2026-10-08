import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from a project sub-path. Public files are referenced with
// page-relative paths ("course-art/…"), so only index.html and CSS need the base.
const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
if (!/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error("Invalid GitHub Pages base path");

export default defineConfig({
  base,
  plugins: [react()],
  build: { outDir: "dist-pages", emptyOutDir: true },
});
