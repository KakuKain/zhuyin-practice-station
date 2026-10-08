# 辨音作答頁：第一版設計 QA

final result: passed

## 比對目標與證據

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0fbf5-48fc-7592-8416-00b533a6e8ce/exec-1d6098ae-35c5-4a8a-a12c-5545c8626d81.png`，使用者選定第一版。
- Implementation: `http://127.0.0.1:4186/zhuyin-practice-station/`，練習 → 辨音練習 → ㄢ／ㄤ → 開始練習。
- Final implementation: `outputs/sound-redesign/question-mobile-final.jpg`。
- Full-view comparison: `outputs/sound-redesign/question-comparison-final.png`，同一張影像左側來源、右側實作。
- Focused comparison: `outputs/sound-redesign/question-detail-final.png`，檢查播放區、注音與卡片。
- Responsive evidence: `outputs/sound-redesign/question-narrow-final.jpg`、`question-tablet-final.jpg`、`question-tone-narrow.jpg`（同一資料夾）。
- Interaction evidence: `question-retry.jpg`、`question-correct.jpg`、`question-complete-final.jpg`（同一資料夾）。

來源為 847 × 1857 px 的無瀏覽器邊框示意图，等比例縮為約 390 × 855。實作 CSS viewport 及主截圖為 390 × 855、DPR 1。最終比較皆為第 1 題、播放完畢、未作答，左側 ㄤ、右側 ㄢ；沒有更動實作截圖中的 UI。答案次序仍由既有題庫隨機配置。窄螢幕為 320 × 740，平板為 834 × 1194，密度皆為 1。平板最終截圖以明確 viewport clip 擷取完整畫面，避免先前截圖工具的局部裁切。

## Findings

沒有剩餘的 actionable P0／P1／P2 findings。

### 必要 fidelity surfaces

- **Fonts / typography**：基本注音使用網站共用直立無襯線字體，手機主注音 88 px；二／三聲沿用 `ZhuyinStack` 完整直式字形與聲調位置。文字與操作元件清晰、沒有 blur。沿用既有 shared chrome 的字級與圓體 UI，略小於示意圖，屬產品一致性約束。
- **Spacing / layout rhythm**：換組與簡潔進度以 flex 分置同一列，不再以負 margin 疊放。390 × 855 的答案為 175 × 176 px，底部約 687 px、導覽起點 788 px；320 × 740 的基本答案底部約 592 px，聲調答案約 615 px、導覽起點 673 px；834 × 1194 的答案底部約 879 px、導覽起點 1127 px。核心控制皆不需捲動，沒有被導覽列遮住、沒有橫向 overflow。平板保留既有 app shell 上限。
- **Colors / tokens**：淡藍場景、白色紙質播放中心、深藍注音與原有藍色控制一致。錯誤及正確仍使用既有紅／綠語意色；播放時不替任何答案上光暈，避免提示答案。focus-visible 與 reduced-motion 行為保留。
- **Image quality / asset fidelity**：保留原水彩播放按鈕、耳機貓、雲朵卡片細節及草地 footer。新增透明淡藍水彩 wash，只有背景影像，沒有嵌入文字或 UI；保留原 PNG，WebP 為 960 × 561、100,312 bytes、品質 90，確認 alpha 與自然羽化邊緣。裝飾層不接受 pointer events。卡片雲朵較來源淡，屬 P3 視覺差異，未影響辨識與操作。
- **Copy / content**：使用「你聽到哪個音？」、一處 `1 / 6`、換組及播放狀態，沒有新增重複說明。頂部「練習」及三頁籤保持一致。完成頁僅保留「這一組練完了！」與兩個按鈕。

## Comparison history

1. **[P2] 首次主注音偏小，答案位置約低 10 px**
   - Evidence: `question-mobile-before.jpg`、`question-comparison-before.png`。
   - Fix: 主注音由 76 增至 88 px，播放區與答案間距由 18 降至 8 px。
   - Post-fix evidence: `question-comparison-final.png`、`question-detail-final.png`。
2. **[P2] 初次淡藍場景過短，播放圓偏上**
   - Fix: 調整播放區內距及水彩背景覆蓋範圍；保留原播放按鈕比例。
   - Post-fix evidence: 最終完整與局部比較，播放圓與注音主要區域符合來源。
3. **[P2] 中間版本 cover 裁切羽化邊緣，產生矩形邊界**
   - Fix: 使用獨立透明背景偽元素，保留水彩外圍 alpha，將低對比裝飾適度適應區域大小。
   - Post-fix evidence: `question-detail-final.png`，沒有明顯直線裁邊或方框。

## Browser interactions and verification

- 實際測試答錯：紅色 X 短暫顯示，同題恢復可點擊，未切換題目。
- 答錯後可重播同一個音；音訊實際播放中沒有答案光暈或其他正解提示。
- 答對出現綠色圓圈勾，自動進入下一題；播放新題後恢復作答。
- 完整走完二／三聲六題，包括第一次答對與答錯後重選，最後進入完成頁。
- 換組按鈕實際返回成功，中心 DOM hit test 命中自身，沒有被題數遮住；取消／返回沿用音訊中止行為。
- 390 px、320 px 與平板核心控制可見；窄螢幕二／三聲注音、聲調與標籤完整。圖片均完整載入，字體載入完成。
- 最新 console warn / error: `[]`。未做強制斷網測試，本次語音內容與語速未更動。
- `npm run check` 通過：ESLint、TypeScript、100 項單元測試。
- `npm run build:pages` 通過，驗證 776 個 public files，包含音檔與字體。

## Implementation checklist

- [x] 第一版淡藍水彩播放區、耳機貓、原播放按鈕與大答案格。
- [x] 作答、重播、答錯重選、答對自動換題與六題完成流程。
- [x] 同狀態全畫面及局部對照；手機／窄螢幕／平板與聲調版面檢查。
- [x] 本機預覽保留；本次尚未推送或部署到 GitHub Pages。

---

# 辨音試聽頁：第二版與播放光暈設計 QA

final result: passed

## 比對目標與證據

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0fbf5-48fc-7592-8416-00b533a6e8ce/exec-b9f022da-838d-457d-961d-3f4c884ffbc6.png`，使用者選定第二版後加入「ㄤ 播放時放大與光暈」的示意圖。
- Implementation: `http://127.0.0.1:4186/zhuyin-practice-station/`，練習 → 辨音練習 → ㄢ／ㄤ → 依序聽兩個音。
- Active implementation screenshot: `outputs/sound-redesign/compare-active-final.jpg`。
- Idle screenshot: `outputs/sound-redesign/compare-idle-final.jpg`。
- Full-view comparison: `outputs/sound-redesign/compare-full-final.png`；同一張影像左側來源、右側實作，皆為 ㄤ 播放中。
- Focused comparison: `outputs/sound-redesign/compare-detail-final.png`；兩側從 y=280 裁切 390 × 390，檢查注音、光暈、水彩與播放控制。
- Responsive evidence: `outputs/sound-redesign/compare-tablet-final.jpg`、`compare-narrow-final.jpg`、`compare-tone-mobile.jpg`、`compare-tone-narrow.jpg`（同一資料夾）。

來源為 847 × 1857 px 的無瀏覽器邊框示意圖，等比例縮為 390 × 855；實作主比較截圖為 390 × 855 px，CSS viewport 為 390 × 855、devicePixelRatio 為 1。未拉伸、未更動截圖中的 UI。平板截圖為 834 × 1194，窄螢幕截圖為 320 × 740，密度皆為 1。第一次比較使用 390 × 844 的實作截圖，下方補 11 px 白底以對齊来源容器，僅用於初次版面差異判定。

## Findings

沒有剩餘的 actionable P0／P1／P2 findings。

### 必要 fidelity surfaces

- **Fonts / typography**：標題約 30 px，主注音 88 px，播放中 transform 為 1.12 倍；單音採網站共用直立無襯線字體，二／三聲使用 `ZhuyinStack` 的既有完整直式字形與聲調定位。標題、注音與控制均清晰，沒有模糊文字、換行擠壓或錯誤符號。手機、窄螢幕及平板的字體載入完成。
- **Spacing / layout rhythm**：單一標題與耳機貓分置左右，兩音以較小「與」連接，下方為一個圓形試聽控制及開始按鈕。390 × 855 的開始按鈕底部 681 px、導覽起點 788 px；320 × 740 的開始按鈕底部約 634 px、導覽起點 673 px；834 × 1194 的開始按鈕底部 922 px、導覽起點 1127 px。核心控制都不需要捲動才能操作，沒有橫向 overflow。窄螢幕文件可能有少量額外底部高度，但沒有遮住按鈕。平板沿用 760 px app shell 上限。
- **Colors / tokens**：深藍注音、白底與淡藍光暈對應選定版型。光暈使用低對比柔和藍色，僅提示目前試聽音，不改變答案顏色。開始按鈕沿用網站既有藍色 token；鍵盤操作有明確 focus-visible outline。
- **Image quality / asset fidelity**：保留既有耳機貓、草地與水彩播放按鈕；新增相同紙質藍圈風格的停止按鈕，以及透明水彩雲朵 underline。沒有用 emoji、手製 SVG 或 CSS 畫圖替代插畫。雲朵 WebP 為 960 × 240、54,906 bytes；停止按鈕為 640 × 640、53,610 bytes。均保留原 PNG 並確認透明 alpha、無紙張方框。相較示意圖的全藍播放圆，實作保留使用者先前指定的原本紙質水彩按鈕，屬刻意沿用既有產品資產。
- **Copy / content**：只保留「換一組」、「聽聽兩個音」、「依序聽兩個音／停止播放」、「開始練習」。沒有重複解說與「開始 6 題」字樣。三個頁籤及頂部「練習」保持一致。二／三聲的小標籤保留，以區分同一音節的不同聲調。

## Comparison history

1. **[P2] 首次實作標題偏小、注音與控制區約下移 50 px**
   - Evidence: `outputs/sound-redesign/compare-full-before.png`，已完成放大效果的 ㄤ 播放中畫面。
   - Fix: 手機標題提高到約 30 px；縮減符號區高度與標題間距。
   - Post-fix evidence: `compare-full-final.png`、`compare-detail-final.png`。主要區域位置與來源相近，保留既有 chrome 的字級及控制樣式。
2. **[P2] 水彩角落重複使用造成可見方形邊界**
   - Evidence: `compare-full-before.png`，符號下方為兩個底邊平直的矩形。
   - Fix: 使用專為此區域生成的透明雲朵水彩 bitmap。
   - Post-fix evidence: `compare-full-final.png`、`compare-detail-final.png`，邊缘自然、文字仍清晰。
3. **[P1] 作答頁題數區块遮住換組按鈕**
   - Evidence: `game-back-overlap-before.jpg`；DOM hit test 在按鈕中心命中 `.sound-progress`，實際點擊無法返回。
   - Fix: `.sound-back` 加上相對定位及 z-index，使其位於同列題數區上方。
   - Post-fix evidence: `game-back-overlap-fixed.jpg`；DOM hit test 命中 `.sound-back`，實際點擊成功返回選組，播放也停止。

## Browser interactions and verification

- 使用 Codex in-app browser 實際渲染及播放；依序觀察 ㄢ active、停頓時無 active 且 audio.paused=true、ㄤ active、完成後恢復試聽按鈕。
- 在 ㄤ 發聲期間讀取 audio.currentTime=0.188、paused=false，transform=`matrix(1.12, 0, 0, 1.12, 0, 0)`，光暈 opacity=1。效果由音訊實際開始／結束回呼同步，載入期間不啟動。
- 停止播放可中止第一個音，也可在兩音間隔時取消下一個音。停止後 active=0、audio.paused=true、currentTime=0。
- 不需先試聽即可開始。間隔中開始練習會取消後續示範音並進入第 1 題；作答頁 active hint=0。
- 正確回答後出現「答對了！」並自動進入下一題。既有答錯後重選機制保留，本次沒有重測全部六題或所有聲調題庫。
- 切換到練習紀錄會停止試聽；返回辨音頁是選組狀態，沒有殘留光暈或排隊音訊。
- 二／三聲使用直式字形，手機及窄螢幕沒有裁切核心控制。原生 button、可見鍵盤焦點與 aria-live 播放狀態保留；prefers-reduced-motion 下取消縮放及過渡，仍以靜態光暈標示正在聽的音。
- 最新 console warn / error: `[]`。比較頁圖片均完整載入；沒有瀏覽器端強制斷網測試。播放失敗與取消中的晚到回呼由單元測試驗證。
- `npm run check` 通過：ESLint、TypeScript、100 項測試。新增 3 項播放生命週期測試，確認實際開始後才通知、取消後晚到 play promise 不啟動效果、播放失敗不通知開始且呼叫錯誤回呼。
- `npm run build:pages` 通過，驗證 775 個 public files，包含音檔與字體。本次未替換語音檔或變更語速。

## Implementation checklist

- [x] 第二版單鍵依序比較，原水彩播放按鈕與同風格停止按鈕。
- [x] 正在發聲的注音放大、光暈；間隔及停止恢復原樣。
- [x] 開始練習不需等待試聽，作答不提示答案。
- [x] 修正換組按鈕被遮擋，返回／切換頁籤取消排隊播放。
- [x] 完成全畫面及細節對照、手機／窄螢幕／平板與播放流程檢查。
- [x] 本機預覽保留；本次尚未推送或部署到 GitHub Pages。

---

# 先前選組頁：第一版設計 QA（歷史紀錄）

## 比對目標與證據

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0fbf5-48fc-7592-8416-00b533a6e8ce/exec-a5c6575f-0d88-4a83-a3fb-c26e4bdef1af.png`。
- Implementation: `http://127.0.0.1:4186/zhuyin-practice-station/`，練習 → 辨音練習 → 尚未選組。
- Implementation screenshot: `/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/tablet-final.jpg`。
- Full-view comparison: `/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/comparison-final.png`，左側來源、右側實作，同一影像內比對。
- Focused comparison: `/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/cards-comparison-final.png`，前三列的注音字形、連接字、箭頭與水彩角落。
- Mobile evidence: `/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/mobile-final.jpg`、`/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/narrow-final.jpg`。

來源為 1048 × 1501 px 的無瀏覽器邊框示意圖；實作截圖為 834 × 1194 px，CSS viewport 同為 834 × 1194，devicePixelRatio 為 1。來源等比例縮至 834 × 1194 的白底容器後比對，沒有拉伸。focused comparison 分別從來源卡片起點與實作卡片起點裁切，保留同樣大小的區域。

刻意沿用網站既有的 760 px app shell 上限、logo、草地插畫與導覽列，而非將平板整個視窗拉滿。兩侧各 37 px 的網站外框不視為設計誤差。平板卡片區寬 712 px、卡片 348 × 144 px；最後一組維持單張卡片寬度。

## Findings

沒有剩餘的 actionable P0／P1／P2 findings。

### 必要 fidelity surfaces

- **Fonts / typography**：保留全站的圓體介面字體，注音採一致的粗體無襯線字形；卡片注音 44 px、聲調組 30 px，連接字「與」較小。字體載入狀態為 loaded。平板與 390／320 px 手機上均沒有截字、換成錯誤符號或多行擠壓。示意圖的較大 header 與導覽字級已依既有網站 chrome 適度縮小，屬既有元件約束。
- **Spacing / layout rhythm**：維持兩欄、16 px 平板卡片間距、22 px 圓角，箭頭與文字垂直置中。標題與耳機貓分置兩側。窄螢幕使用較小的插畫及卡片間距，320 × 740 下最後卡片底部 646 px，導覽列起點 673 px，沒有遮蓋。
- **Colors / tokens**：白色卡片、深藍文字、淡藍邊框與低透明度藍／綠／米色水彩符合第一版的前景背景平衡。互動焦點具有可見 outline；hover 不改成全張厚重背景。沒有將文字或操作元件模糊。
- **Image quality / asset fidelity**：耳機貓及草地使用網站既有實際水彩圖像；卡片角落使用新產生的透明水彩 bitmap，沒有 CSS 繪圖、emoji 或手製 SVG 替代。WebP 為 768 × 384、38,994 bytes，保留原 PNG，透明背景在白色卡片上沒有可见矩形或明顯壓縮失真。色相變化保留真實影像的細節。角落比來源略淡，符合使用者要求的淡水彩，不影響內容辨識。
- **Copy / content**：只保留「今天想練哪一組？」及「每組 6 題」，卡片以「與」連接兩音。七組順序延續既有資料：ㄓ／ㄔ、ㄓ／ㄗ、ㄔ／ㄘ、ㄢ／ㄞ、ㄢ／ㄤ、ㄤ／ㄥ、二聲／三聲，全部可選，沒有「之後學到再練」之類對話資訊。三頁籤共用「練習」標題。

## Comparison history

1. **[P2] 小螢幕末列被底部導覽遮住**
   - Evidence: `/Users/kaoru/Desktop/AppDev/kid/zhuyin-practice-site/outputs/sound-redesign/narrow-before.jpg`，320 × 740 下末列底部 710 px，導覽起點 673 px。
   - Fix: 高度 ≤ 740 且寬度 ≤ 600 的卡片 min-height 改為 86 px，仍保留兩欄。
   - Post-fix evidence: `outputs/sound-redesign/narrow.jpg`、`outputs/sound-redesign/narrow-final.jpg`，末列底部 646 px，沒有遮盖，scrollWidth 等於 viewport width。
2. **[P2] 平板卡片區與注音偏小，主畫面密度偏離示意圖**
   - Evidence: `outputs/sound-redesign/comparison.png`、`outputs/sound-redesign/cards-comparison.png`，卡片較窄、字與插畫偏小，末列之後留白過多。
   - Fix: 平板 practice main-content 上限 740 px，卡片 min-height 144 px、注音 44 px、聲調組 30 px、耳機貓 168 px；頁籤置中並調整草地圖背景高度。
   - Post-fix evidence: `outputs/sound-redesign/comparison-final.png`、`outputs/sound-redesign/cards-comparison-final.png`。第一至四列的形状、間距與文字層次符合選定版型，保留網站 shell 外框。

## Browser interactions and verification

- 使用 Codex in-app browser 實際渲染，測試 834 × 1194、390 × 844、320 × 740。
- 實際點選第一組，兩個示範音均完成播放，開始按鈕可用；開始六題練習、選擇正確答案，出現「答對了！」並自動進入第二題。
- 換一組聲音可返回選組頁。三個頁籤保持「練習」標題。
- 自由聽寫切換捲動模式並往下捲後，切換辨音頁籤時 scrollY 回到 0，標題完整顯示在 header 下方。
- 卡片為原生 button，保留既有 accessible name，以視覺文字的 aria-hidden 避免重複朗讀；有鍵盤焦點樣式，最小卡片高度 86 px。
- 最新 console warn / error 清單：`[]`。
- `npm run check` 通過：ESLint、TypeScript、97 項測試。
- `npm run build:pages` 通過，驗證 773 個 public files，包含音檔與字體。
- 本次未變更語音資料或播放流程；沒有重新評估全部語音發音正確性。

## Implementation checklist

- [x] 白色兩欄卡片、淡水彩角落及置中箭頭。
- [x] 沿用一致注音字形、耳機貓與草地背景。
- [x] 移除多餘敘述，所有組別皆可選。
- [x] 練習標題固定，切換頁籤回到頁面頂部。
- [x] 完成全畫面與細節區比對、手機與平板檢查。
- [x] 本機預覽保留；尚未將這次修改推送或部署到 GitHub Pages。
