# 依賴安全維護

2026-10-01 的 `npm audit` 發現既有 Next、React Server DOM、Vinext、Vite、Cloudflare 開發工具及傳遞依賴有安全公告。這是依賴掃描結果，不代表已確認本站可被利用，也不能視為已排除風險。

本次結構整理沒有執行 `npm audit fix --force`、跨大版本框架遷移或強制 overrides。未使用的 Drizzle 已移除。本站沒有 Server Actions、登入、DB 或檔案上傳；圖片預先轉檔，沒有即時 IMAGES 服務，未配置優化端點回傳 501。

後續安全更新應獨立驗證：重新執行 `npm audit --json`，一起核對 Next／React／React Server DOM／Vinext 相容性，再更新 Vite／Cloudflare plugin／Wrangler，確認 Worker build 與 Sites metadata 契約。通過單元、SSR 和三種瀏覽器測試才發布。

`npm run check` 是程式／行為品質門檻，不是安全稽核通過宣告。不要以本輪測試代替安全升級驗證，也不要將密鑰放進原始碼或 deployment archive。
