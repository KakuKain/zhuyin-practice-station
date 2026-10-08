import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { prefixPublicAssets } from "./tooling/pages/public-assets";

const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
if (!/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error("Invalid GitHub Pages base path");

export default defineConfig({
  base,
  plugins: [
    {
      name: "pages-public-assets",
      enforce: "pre",
      transform(source, id) {
        if (id.includes("node_modules") || !/\.(tsx?|json)(?:\?|$)/.test(id)) return;
        return { code: prefixPublicAssets(source, base), map: null };
      },
    },
    react(),
  ],
  build: { outDir: "dist-pages", emptyOutDir: true },
});
