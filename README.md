# 一年級注音練習站

給台灣國小一年級學生與家長使用的免登入網站，收錄第一至第九課。

公開網站：[一年級注音練習站](https://zhuyin-practice-station.ihealdev.chatgpt.site/)

- 課文：國字＋注音／純注音直排預覽，手機支援翻頁。
- 默寫：逐格 Canvas 手寫、草稿續寫、整篇家長對照與錯字收藏重練。
- 聽寫：每回合隨機抽 4 題符號、4 題生字、2 題教師圈詞；語詞每字都有手寫格。
- 家長可調整播放次數與間隔，判定答對／需要補強；收藏題目可單題重練。

草稿、收藏、最近練習與設定保存在目前瀏覽器的 localStorage，不會上傳或跨裝置同步。清除網站資料、無痕模式結束或換裝置會失去紀錄。儲存被封鎖時仍可練習，但會提示無法保存。完成默寫的勾選狀態與當次聽寫筆跡只保留在本次頁面工作階段。

## 開發與驗證

使用 Node.js 24（CI 同版本；最低 22.13）與 npm。

```sh
npm ci
npm run dev
npm run check                 # 零警告 lint、TypeScript、單元測試
npm test                      # 單元測試、正式建置、Worker HTML 渲染測試
npx playwright install chromium webkit
npm run test:e2e              # Android Chrome、iPhone WebKit、桌面 Chrome
```

瀏覽器測試自行使用 4173 埠，不會關閉既有的 3001 預覽。涵蓋手寫／縮放後筆跡、續寫、家長檢查、收藏、正常速度符號、語詞多格限制、倒數暫停，以及慢網路／儲存失敗提示。GitHub Actions 執行相同檢查，失敗時保存 trace 與截圖。

## 目錄與部署

`app/` 只放路由、layout 和樣式入口；`features/` 按功能分組；`components/` 放共用 UI；`lib/` 放音訊及儲存基礎設施。詳見 [架構說明](docs/architecture.md)。

`public/` 只放部署用素材，原始字體／插圖留在 `assets/`，視覺參考在 `docs/visual-qa/`。未啟用的 D1／登入範例在 `examples/`，不參與 app 的 lint／型別檢查／建置；沒有安裝資料庫套件。

正式站使用既有 Sites 專案，設定在 `.openai/hosting.json`。`npm run build` 產生 Cloudflare Worker 相容的 `dist/`，`tooling/build/sites-vite-plugin.ts` 複製部署 metadata。GitHub 是公開原始碼與 CI；推送 GitHub 不代表已部署，發布仍須完成 Sites 的版本保存與部署流程。不要把 token、實際 binding ID 或其他密鑰寫進版本控制。

## 素材與授權

字體出自 [But Ko 的注音 IVS 字型專案](https://github.com/ButTaiwan/bpmfvs)，採 SIL Open Font License 1.1。授權及修改紀錄在 `public/fonts/`。部署版使用 WOFF2，原始 TTF 在 `assets/font-sources/`。

```sh
python3 scripts/build-fonts.py # 需 fontTools、brotli；包含「喲」ㄧㄛ校正
npm run assets:artwork        # 保留 PNG 原稿，產生無損 WebP
```

單個注音符號使用教育部《國語注音符號手冊》F1–F37 錄音，以正常速度播放。其餘生字、語詞及複合韻使用產生的音檔。來源、CC BY 4.0 授權與轉檔說明見 [音檔出處](public/listening-audio/ATTRIBUTION.md)。可用 `node scripts/generate-listening-audio.mjs --refresh-symbols` 更新官方錄音。

目前仍為 Beta。依賴掃描的已知項目與後續升級界線見 [安全維護說明](docs/security-maintenance.md)。
