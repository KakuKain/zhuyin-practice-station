# 一年級注音練習站

給台灣國小一年級學生與家長使用的免登入網站，收錄第一至第九課及三組複習。

公開網站：[一年級注音練習站](https://kakukain.github.io/zhuyin-practice-station/)

- 課文：國字＋注音／純注音直排預覽，課名與課文頁標題都有旁注音，手機支援翻頁。
- 注音表：下方「注音」導覽，21 個聲符、16 個韻符、22 個結合韻分區；基本符號播放教育部錄音，結合韻使用 Gemini 靜態音檔。
- 默寫：逐格 Canvas 手寫、草稿續寫、整篇家長對照與錯字收藏重練。
- 聽寫：每回合抽 4 題符號及該課全部教師圈詞；複習僅聽寫。先整輪作答，再全部對照，期間可重聽或返回修改。語詞每字都有直式大格。
- 家長可調整播放次數與間隔，判定答對／需要補強；收藏題目可單題重練。
- 練習頁：自由聽寫畫板、練習紀錄、辨音三個分頁。
- 更多 → 裝置備份：一次保存教材、草稿、收藏、設定、畫作與自訂錄音。匯入先預覽，還原前下載目前備份。
- 更多 → 自訂讀音：優先修正「半、狸、裡」等讀音，或選一至九課的生字、語詞，錄製／匯入自己的音檔，完整試聽與確認後才替換。

草稿、收藏、最近練習與設定保存在目前瀏覽器的 localStorage，不會上傳或跨裝置同步。清除網站資料、無痕模式結束或換裝置會失去紀錄。儲存被封鎖時仍可練習，但會提示無法保存。完成默寫的勾選狀態與當次聽寫筆跡只保留在本次頁面工作階段。

自訂音檔另存於目前網站來源的 IndexedDB（`zhuyin-custom-audio-v1`），每段最多 20 秒／2 MB。以「完整字詞＋指定注音（包含聲調與音節分隔）」對應，不混用多音字、不拼接單字成語詞。自訂讀音正常速度播放，播放失敗不改播合成音；未設定的字詞仍使用原本音檔。新錄音成功提交前保留舊錄音，取消、停止或換頁會關閉麥克風。可下載單段錄音備份並重新匯入；本機 localhost 與正式站的資料互不相通。瀏覽器錄音需 HTTPS 或 localhost 及麥克風權限；不支援 MediaRecorder 時可匯入已取得許可的音檔。沒有自動上傳、跨裝置同步或自動判讀發音。

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

瀏覽器測試自行使用 4173 埠，不會關閉既有的 3001 預覽。涵蓋手寫／縮放後筆跡、續寫、家長檢查、收藏、正常速度符號、語詞大格垂直排列、整輪往返／重聽／批次檢查、辨音自動換題、完整備份、九課標題旁注音、37 符號分組／發音／中斷／重試，以及慢網路／儲存失敗提示。GitHub Actions 執行相同檢查，失敗時保存 trace 與截圖。

## 目錄與部署

`app/` 只放路由、layout 和樣式入口；`features/` 按功能分組；`components/` 放共用 UI；`lib/` 放音訊及儲存基礎設施。詳見 [架構說明](docs/architecture.md)。

`public/` 只放部署用素材，原始字體／插圖留在 `assets/`，視覺參考在 `docs/visual-qa/`。未啟用的 D1／登入範例在 `examples/`，不參與 app 的 lint／型別檢查／建置；沒有安裝資料庫套件。

正式站改用 KakuKain 儲存庫的 GitHub Pages。推送 `main` 會由 `.github/workflows/pages.yml` 執行檢查、靜態建置與部署；只有檢查通過才發布。網站沿用原本的 React 元件與靜態音檔，沒有伺服器 API。

```sh
npm run build:pages            # 產生 dist-pages/，檢查素材完整性與子路徑
npm run preview:pages          # 開啟 /zhuyin-practice-station/ 預覽
```

`vite.pages.config.ts` 處理專案子路徑；需要根目錄或自訂網域時可設定 `PAGES_BASE_PATH=/`。原 Sites 的 `.openai/hosting.json` 與 `npm run build` 保留作為舊站的相容建置。不要把 token 或其他密鑰寫進版本控制。

網站來源改變後，瀏覽器不會自動移轉舊站的紀錄。先在[舊站](https://zhuyin-practice-station.ihealdev.chatgpt.site/)「更多 → 裝置備份」匯出，再於新站匯入；音檔和教材隨網站一起發布，不需要另行移轉。

## 素材與授權

字體出自 [But Ko 的注音 IVS 字型專案](https://github.com/ButTaiwan/bpmfvs)，採 SIL Open Font License 1.1。授權及修改紀錄在 `public/fonts/`。部署版使用 WOFF2，原始 TTF 在 `assets/font-sources/`。

```sh
python3 scripts/build-fonts.py # 需 fontTools、brotli；包含「喲」ㄧㄛ校正
npm run assets:artwork        # 保留 PNG 原稿，產生無損 WebP
npm run assets:audio-registry # 更新音檔身份、長度與 hash 快取版本
```

單個注音符號使用教育部《國語注音符號手冊》F1–F37 錄音，以正常速度播放。九課朗讀及 22 結合韻使用 Gemini Fola 音檔（見 [朗讀製作紀錄](docs/gemini-readings.md)）；其餘生字／語詞仍主要使用舊合成檔。音檔清單記錄 hash、長度及來源，未宣稱全部通過人耳校對。來源、CC BY 4.0 授權與轉檔說明見 [音檔出處](public/listening-audio/ATTRIBUTION.md)。可用 `node scripts/generate-listening-audio.mjs --refresh-symbols` 更新官方錄音。

目前仍為 Beta。依賴掃描的已知項目與後續升級界線見 [安全維護說明](docs/security-maintenance.md)。
