# 未啟用範例

這些 starter 範例不是目前注音網站的一部分。

- `d1/`：notes API、schema、Drizzle config；`db/schema-empty.ts` 保存原始空 schema。啟用時搬回正式 db／API 位置、安裝 drizzle-orm／drizzle-kit、宣告 DB binding 與 Cloudflare 型別、產生／驗證 migrations，才啟用 Sites D1。
- `auth/`：原始登入 helper。啟用前需核對當下官方身分驗證文件與 Sites 設定；複製檔案不代表已有完整登入流程。

tsconfig 與 ESLint 明確排除 examples。搬回 app 前必須補型別、安全檢查與測試。
