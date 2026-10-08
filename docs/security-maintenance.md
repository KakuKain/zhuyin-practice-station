# 依賴安全維護

2026-10-01 的 `npm audit` 發現 Next、React Server DOM、Vinext、Vite、Cloudflare 開發工具及傳遞依賴有安全公告。2026-10-08 移除舊 Sites／Cloudflare 建置（Next、vinext、Wrangler、`@cloudflare/vite-plugin`、`@vitejs/plugin-rsc`、`react-server-dom-webpack`）與 Tailwind 後，正式依賴（`npm audit --omit=dev`）為 0 項；開發工具由 29 項降為 1 項低風險（`tsx` 內含的 esbuild，只影響 Windows 開發伺服器）。Vite 升到同一小版本的修補版 8.0.16。

正式站是靜態檔案，沒有伺服器、Server Actions、登入、DB 或檔案上傳；這些公告多半屬於開發與建置工具。掃描結果不代表已確認可被利用，也不代表已排除風險。

後續更新：重新執行 `npm audit --json`，同一小版本內的修補可直接更新並跑完整檢查；跨大版本（React、Vite、ESLint 外掛）另開分支，通過 `npm run check`、`npm run build` 與全部 Playwright 專案後才發布。不要執行 `npm audit fix --force`。

`npm run check` 是程式／行為品質門檻，不是安全稽核通過宣告。不要將密鑰放進原始碼或部署檔案。
