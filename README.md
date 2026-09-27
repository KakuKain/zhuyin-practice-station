# 一年級注音練習站

依照開發 Handoff v5 建立的第一課測試版本，提供：

- App Shell 與固定 Bottom Navigation
- 全注音直式格課文默寫
- 以完整音節為單位的觸控拖曳／點選填空
- Focus Mode 聽寫、Web Speech 播放與 Canvas 手寫
- 時間到後由家長人工判定，含三選一錯題補強

目前題庫是前端的人工確認 seed data，未蒐集孩子姓名、Email 或帳號。

把南湖國小 115 學年度第 1 學期課外社團 PDF，整理成可以快速搜尋、篩選與比較的互動式週課表。

🌐 **正式網站：** <https://nanhu-club-schedule.ihealdev.chatgpt.site/>

## 作品特色

- 週一至週五的半小時時間軸，讓上課區間一眼可見
- 自動為同時段課程分配欄位，避免大量社團重疊時互相遮住
- 課程欄位至少 80px，支援 `text-wrap: pretty`，長名稱會自然換行
- Hover 顯示快速資訊卡，點擊開啟完整課程資料
- 顯示招生年級、學費、總金額、指導老師、教室位置與 PDF 原文說明
- 同一系列課程以連接提示標示，可從卡片快速跳到其他時段
- 支援關鍵字、社團類型篩選，以及課表／清單檢視
- 手機版改為依星期瀏覽的課程清單
- 顯示應用程式版號，方便部署後辨識快取更新

## 技術

- React 19 + TypeScript
- vinext / Next.js 相容路由
- CSS Grid、響應式 CSS 與原生互動元件
- Cloudflare Sites 部署

## 本機執行

需求：Node.js `>=22.13.0`

```bash
npm install
npm run dev
```

其他常用指令：

```bash
npm run build   # 建置正式版本
npm test        # 建置並執行渲染測試
npm run lint    # 執行 ESLint
```

## 專案結構

- `app/page.tsx`：課程資料、篩選、課表、Hover 卡片與詳細 Modal
- `app/globals.css`：時間軸、重疊欄位、卡片與響應式版面
- `app/layout.tsx`：頁面 metadata 與版號快取識別
- `tests/`：基本渲染測試
- `.openai/hosting.json`：正式網站的 Sites 專案設定

## 資料來源與使用提醒

課程資料整理自南湖國小 115 學年度第 1 學期課外社團 PDF；網站內容是方便查閱的資料整理與介面示例，實際招生資訊請以學校公告為準。PDF 原文、課程名稱與相關內容的權利歸原權利人所有，如需再利用請先確認授權。

## 後續可擴充方向

- 將課程資料移到 JSON 或 Google Sheets，降低每學期更新成本
- 加入「我的選課」與衝堂檢查
- 支援匯出個人課表或列印版本
- 建立資料清理與 PDF 匯入流程，讓新學期可以快速更新
