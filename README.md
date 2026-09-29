# 一年級注音練習站

第一課練習網站，依照 Handoff v5 與提供的手機畫面參考製作。

- 課文默寫：全注音直式格、完整音節拖曳填空，也可點卡片後點空格。
- 聽寫：兩次語音播放、30 秒書寫、家長判定及三選一補強。
- 手機與平板可使用觸控拖曳及 Canvas 手寫；不需登入。

目前只有第一課的人工確認示例題目，其餘課次尚未開放。練習狀態保存在目前頁面，重新整理後會重置。

公開網站：[一年級注音練習站](https://zhuyin-practice-station.ihealdev.chatgpt.site/)

## 本機執行

需要 Node.js 22.13 或更新版本。

```bash
npm install
npm run dev
```

`npm run lint` 檢查程式碼，`npm run build` 建置網站。

## 字體

課文、卡片和聽寫答案使用使用者既有專案中的 `BpmfZihiOnly-R.ttf`（ㄅ字嗨注音而已），並隨網站載入，讓其他裝置也能顯示相同字形。字體出自 [But Ko 的注音 IVS 字型專案](https://github.com/ButTaiwan/bpmfvs)，以 SIL Open Font License 1.1 授權；相關著作權與授權文字見 `public/fonts/BpmfZihiSans-LICENSE.txt`。

第八課課文預覽另載入同字體的修正版 WOFF2，將「喲」的內建注音從 ㄧㄠ 校正為 ㄧㄛ，保留原字形與直排位置。來源、修改紀錄與授權見 `public/fonts/LESSON-YO-NOTICE.txt`；可用 `python3 scripts/build-yo-fonts.py` 重建（需 fontTools 與 brotli）。

## 聽寫音檔

單個注音符號的讀音使用教育部《國語注音符號手冊》F1–F37 錄音，原始 WAV 轉為網站使用的 M4A；播放時再稍微放慢。音檔依 CC BY 4.0 授權使用，詳細來源與修改說明見 `public/listening-audio/ATTRIBUTION.md`。其餘生字、語詞與複合韻音檔仍由 `scripts/generate-listening-audio.mjs` 產生。可用 `node scripts/generate-listening-audio.mjs --refresh-symbols` 更新官方符號音檔。
