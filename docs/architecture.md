# 架構與維護界線

```text
app/                       路由、metadata、樣式入口
components/                品牌標頭、頁面標題、注音、檢查控制與筆跡縮圖
features/
  courses/                 九課、三組複習、教材 identity／匯入／封存
  lesson/                  直排課文、分頁、IVS、課文朗讀
  navigation/              導覽狀態、切頁守衛、焦點／捲動
  symbols/                 37 基本符號、22 結合韻
  sound-practice/          兩音對照、六題辨音與動畫回饋
  fill/                    默寫狀態、逐格書寫、草稿／退出／整篇檢查
  listening/               聽寫狀態、整輪作答／檢查、單題補強、播放／計時
  practice/                收藏／待補強／歷史、自由畫板
  settings/                設定、教材管理、自訂讀音、完整裝置備份
  usePracticeApp.ts        跨功能協調與相容 controller 介面
  types.ts                 共用 domain 型別
lib/ink/                   單點手勢、筆畫取樣／重繪排程、圈選切割、畫板遷移
lib/audio/                 靜態語音清單、可取消預載／播放、自訂錄音 metadata／LRU
lib/storage/               本機 external store、完整備份驗證與還原
lib/loading/               字型就緒、圖片漸進顯示（圖片不阻塞作答）
styles/                    保留 cascade 順序的分檔樣式、共用字型與尺寸 token
worker/                    Cloudflare adapter；無 DB／登入
tooling/build/             Sites metadata 建置插件
tests/unit/                資料、遷移、圈選、快取、備份／失敗保護
tests/e2e/                 Chromium／WebKit 操作與小螢幕回歸
assets/                    可重建的原始素材（不公開部署）
public/                    靜態部署素材與完整語音 registry
```

## 狀態與功能界線

`app/page.tsx` 不持有練習狀態。`useFillSession`、`useListeningSession`、`useNavigationSession` 各自管理狀態；`useListeningRound` 管理整輪草稿、前後題與批次檢查，`useListeningPlayback` 管理重播／計時，`useFillProgress` 管理默寫保存與退出。`usePracticeApp` 保留既有元件的 controller 介面，協調跨模式重練及收藏。

課程列表維持 server render。練習頁、注音表、設定頁分成下載區塊，教材管理、自訂讀音、自由畫板、辨音和裝置備份再按需載入。沒有為了重構更換路由框架或全域狀態套件。

`PageHeading` 統一四個主頁的標題與黃色底線；練習子分頁不替換主標題。瀏覽標頭保留品牌與返回／教材選擇，作答標頭保留目前位置與重聽。`ShowMsg` 統一可關閉提示，`ReviewActions` 與 `FavoriteButton` 分開操作。

## 教材及保存

課文與圈詞先改 `course-data.ts`／`circled-vocabulary.ts`，再檢查注音、IVS、語音。題目 ID 維持 `類別:朗讀文字`；舊收藏可取用舊範圍，但新整輪只抽教師指定範圍。九課之外的複習一／二／三分別涵蓋 1–3、4–6、7–9，只有聽寫。

教材改名、排序、封存保留 identity；修改內容建立新 index 並封存原版本，避免舊筆跡掛到新答案。目錄保留封存課次供紀錄查找。教材讀取失敗時不覆寫原值；寫入失敗保留記憶體操作並提示。自訂教材支援逐字注音的字詞，尚未提供整篇課文或照片匯入。

默寫標題在畫面最右欄，但 storage 的舊正文索引不改，標題資料附加於正文之後。pending 與完成格分開；明確的空 pending 不回退到舊完成筆跡。默寫草稿可重新整理續寫，未完成整輪聽寫仍只存在記憶體。

收藏與待補強是獨立旗標：取消收藏不清除補強；家長確認掌握才移出補強。舊版 v1／v2／v3 紀錄轉成 v4 時保留原 key。默寫收藏保持 v1。歷史保留最近 20 次真正完成的練習；開啟課文不算完成。

## 書寫與檢查

默寫／聽寫共用 `useInkCanvas`，保存 0–100 座標路徑及每格最近 30 步復原。自由畫板保存彩色／擦除路徑，共用 `PointerLease`、`appendSample`、`createPaintScheduler`。同時只有一個 pointer 畫線，第二個觸控不接續第一筆；這不是硬體防手掌誤觸，手掌先觸控仍可能成為書寫點。

長筆畫抽樣限制在 1900 點以內，重繪合併到 animation frame。取消／失去 capture 不完成圈選擦除；旋轉螢幕時重畫向量筆跡。圈選在放開時依多邊形邊界切割路徑，保留圈外片段。

自由畫板 v2 使用格線相同的 CSS 像素座標，格子 138px、間距 14px。首次開啟依可用寬度選完整欄數；保存後固定畫板尺寸，旋轉或換螢幕寬度不把筆跡伸縮到另一格，必要時在「捲動」模式內平移。匯出的 PNG 使用相同格線／座標且 2 倍解析度。v1 於首次讀取按目前顯示寬度轉換；舊資料沒有保存原始寬度，無法推回其他裝置的歷史顯示尺寸。損壞資料保留原值並禁止覆寫。

整輪聽寫讓孩子先寫全部題目，可往返、重聽；完成後統一檢查。較長語詞維持足夠大的田字格並向下捲動，不換頁、不隨字數縮小。左邊作答、右邊答案直排；單題補強保留原有家長判定／重寫流程。

位置圖按住顯示標題與正文位置，只接受孩子筆跡與行長度，不接收答案；放開／取消／失焦即關閉，不卸載畫布。鍵盤 Space／Enter 按住查看，Escape 關閉。

辨音獨立於練習紀錄分頁。先聽完兩個音再開始六題，答對跳綠色打勾動畫並自動換題，答錯顯示 X 再選。沒有第一下正確率文字，不將二選一視為手寫掌握，也不寫入正式紀錄。所有對照組都可使用；二、三聲用相同音節的既有音檔。

## 語音與載入

37 基本符號使用教育部錄音；22 結合韻與九課朗讀使用既有 Gemini Fola 靜態音檔。生字／語詞多數仍是舊 macOS Meijia 合成檔，未宣稱全部通過人耳校對。正式站不呼叫 AI API、不需要語音服務金鑰。

`public/listening-audio/registry.json` 記錄檔案來源、指定讀音、長度、SHA-256 與校對狀態；`lib/audio/audio-index.json` 是精簡的播放索引。更新任何音檔後執行 `npm run assets:audio-registry`，播放 URL 以檔案 hash 更新快取版本。已知文字與指定讀音不符時不借用另一聲調的音檔；可使用指定讀音的自訂錄音。未知自訂字詞仍保留瀏覽器合成備援。registry 的時間／hash 驗證不代表聽感與發音正確。

自訂錄音身份是完整文字＋注音（含聲調與 `|` 音節分隔），每段最多 20 秒／2 MB，以原始音訊位元組保存在 IndexedDB，播放時重建 Blob，並相容既有 Blob 紀錄。這避開 WebKit 的 Blob/File 儲存錯誤，不重新壓縮音訊。metadata 先載入一次，不存在的錄音不逐次查詢資料庫；近期錄音以最多 12 段的記憶體 LRU 共用讀取。新增、移除或重新載入會失效快取，自訂錄音播放失敗不替換成合成音。

背景預載最多同時兩筆、每筆 8 秒逾時、近期保留 64 段。顯式播放優先取消同音檔未完成預載；切頁停止音訊與舊回呼。慢速連線仍可能等待首次下載，不宣稱完全零延遲。

Loading 等待當頁必要字型，圖片獨立透過小圖預覽漸進清晰。模糊只施於圖片，不施於文字、田字格或整頁容器。水彩 WebP 與原始素材保持不變。新增字／IVS 後按 `scripts/build-yo-fonts.py` 重建子集並做視覺檢查；完整 OFL 字型保留，支援任意自訂教材的 fallback。

## 完整裝置備份

「更多 → 裝置備份」匯出版本化 JSON，包含本網站的教材（含封存版本）、新舊紀錄、默寫草稿、設定、自由畫板與自訂錄音。原本教材管理的 JSON 仍只備份教材。

匯入先檢查檔案大小（最多 64 MB）、版本、限定 storage key、教材目錄、草稿、收藏與錄音身份／大小／長度；不接受任意 key。顯示內容數量供確認，執行前先下載目前資料，再取代網站資料。其它應用程式的 localStorage 不動。錄音清空／插入是一個 IndexedDB transaction；配額或資料庫錯誤時還原原 localStorage。跨 localStorage／IndexedDB 無法提供瀏覽器被強制關閉時的原子性，所以還原期間保持頁面開啟，並保留下載檔案。完成後自動重新整理以重新建立 external store／快取。

## 樣式及發布門檻

CSS 維持原匯入順序，只清除同條件、同 selector 的完全相同宣告，保留不同值及瀏覽器 fallback。`00-foundation.css` 集中 UI／旁注音／音節／基本符號／結合韻字型與點擊尺寸。功能樣式在對應檔案修改，避免另建一套字型或任意覆寫根樣式。

發布須通過 `npm run check`、build、Worker HTML 渲染測試及 Playwright 三專案。檢查 320／390／1280px、標題續寫、整輪往返／重聽／批次檢查、垂直語詞、辨音動畫、自訂資料備份及失敗重試。更新證據記在 `structure-improvements.md`；模擬 pointer 不能宣稱紅米真機／普通電容筆已驗證。發布後核對成功狀態與 source commit。

維持免登入、無 DB／雲端同步／PWA，不變更教師課文範圍。依賴維護見 `security-maintenance.md`。
