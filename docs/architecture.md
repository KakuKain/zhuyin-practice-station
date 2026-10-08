# 架構與維護界線

```text
app/                       入口 main.tsx、全域樣式匯入順序
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
  usePracticeApp.ts        跨功能協調（畫面、課次、共用 store、語音、複習佇列）
  types.ts                 共用 domain 型別
lib/ink/                   單點手勢、筆畫取樣／重繪排程、圈選切割、畫板遷移
lib/audio/                 靜態語音清單、可取消預載／播放、自訂錄音 metadata／LRU
lib/storage/               storage key 清單、本機 external store、完整備份與還原
lib/loading/               字型就緒、圖片漸進顯示（圖片不阻塞作答）
styles/                    保留 cascade 順序的分檔樣式、共用字型與尺寸 token
  lazy/                    隨功能區塊載入的樣式（辨音、自訂讀音）
scripts/                   素材／語音產生器、建置後檢查（check-build.mjs）
tests/unit/                資料、遷移、圈選、快取、備份／失敗保護
tests/e2e/                 Android 平板／iPad／手機／桌面操作與回歸
assets/                    可重建的原始素材（不公開部署）
public/                    靜態部署素材與完整語音 registry
```

## 狀態與功能界線

`app/main.tsx` 只掛載 `PracticeApp`，不持有練習狀態。聽寫流程集中在 `useListeningFlow`（組合 `useListeningCanvas`、`useListeningPlayback`、`useListeningRound`），默寫流程集中在 `useFillFlow`（組合 `useFillSession`、`useFillCanvas`、`useFillDraft`、`useFillProgress`）。整輪聽寫不計時、最後統一檢查（ready → active → batch_review → result）；家長逐題判定與補強只存在於單題重練（review → remediation_offer → choice → retry_ready → retry）。`usePracticeApp` 只負責畫面、課次、共用 store、語音與複習佇列，並把各流程的 API 攤平成元件使用的 controller；流程之間透過 `clearNotices`、`continueReview`、`stopReview` 協調，不互相讀取狀態。

整站是單一 Vite 靜態建置（GitHub Pages 子路徑 `/zhuyin-practice-station/`），沒有伺服器渲染；開發、測試與正式站使用同一份設定。`public/` 檔案以相對路徑引用（`course-art/…`），由瀏覽器依頁面網址解析，建置檢查會拒絕 `/course-art/…` 這類根目錄路徑。練習頁、注音表、設定頁分成下載區塊，教材管理、自訂讀音、自由畫板、辨音和裝置備份再按需載入。沒有為了重構更換路由框架或全域狀態套件。

`PageHeading` 統一四個主頁的標題與黃色底線；練習子分頁不替換主標題。瀏覽標頭保留品牌與返回／教材選擇，作答標頭保留目前位置與重聽；子面板用 `HeaderBack` 經 `HeaderBackSlot` context 放入標頭返回鍵。`ShowMsg` 統一可關閉提示，`ConfirmDialog` 統一確認對話框（主要按鈕保留孩子的作答），`ReviewActions` 與 `FavoriteButton` 分開操作。整個 app 只掛一個 `<audio>`，iOS 不會因換頁換元素而失去點擊解鎖的播放權限。

## 教材及保存

課文與圈詞先改 `course-data.ts`／`circled-vocabulary.ts`，再檢查注音、IVS、語音並執行 `npm run assets:audio-registry`。題目 ID 維持 `類別:朗讀文字`；舊收藏可取用舊範圍（凍結在 `legacy-content.ts`，只增不改），但新整輪只抽教師指定範圍。九課之外的複習一／二／三分別涵蓋 1–3、4–6、7–9，只有聽寫。

課次 index 是永久身份（`lesson-identity.ts`）：內建 0–8、複習為負數、自訂從 9 起只增不減；第十課以後的內建課次使用 `builtinLessonIndex()`（≥ 1,000,000），不會佔用家長第一個自訂課次。判斷自訂課次一律用 `isCustomLessonIndex`，不要和 9 比較。

教材改名、排序、封存保留 identity；修改內容建立新 index 並封存原版本，避免舊筆跡掛到新答案。目錄保留封存課次供紀錄查找。教材讀取失敗時不覆寫原值；寫入失敗保留記憶體操作並提示。自訂教材支援逐字注音的字詞，尚未提供整篇課文或照片匯入。

默寫標題在畫面最右欄，但 storage 的舊正文索引不改，標題資料附加於正文之後。pending 與完成格分開；明確的空 pending 不回退到舊完成筆跡。默寫草稿可重新整理續寫，未完成整輪聽寫仍只存在記憶體。

收藏與待補強是獨立旗標：取消收藏不清除補強；家長確認掌握才移出補強。舊版 v1／v2／v3 紀錄轉成 v4 時保留原 key。默寫收藏保持 v1；內建課文讀音更正時（例如「教」ㄐㄧㄠˋ→ㄐㄧㄠ），收藏跟著同位置的新讀音，不會被丟棄。打開已完成的格子再返回不會變成未完成。歷史保留最近 20 次真正完成的練習；開啟課文不算完成。

所有 storage key 列在 `lib/storage/storage-keys.ts`，完整備份由這份清單決定範圍；新增 key 必須加進清單。GitHub Pages 同一帳號的所有網站共用一個 origin 與 localStorage 配額，不讀取或清除不屬於本站的 key。

## 書寫與檢查

主要裝置是 Android 平板＋電容筆；電容筆對瀏覽器來說就是 touch，無法用 pointerType 區分。默寫／聽寫共用 `useInkCanvas`，保存 0–100 座標路徑（取到 0.01）及每格最近 30 步復原。自由畫板保存彩色／擦除路徑（CSS 像素取到 0.1），共用 `PointerLease`、`appendSample`、`createPaintScheduler`、`pointerSamples`（合併瀏覽器 coalesced 事件，讓快速筆畫保持圓滑）。同時只有一個 pointer 畫線，第二個觸控不接續第一筆。`isPalmContact` 只依接觸面積判斷手掌（規則與門檻見 `lib/ink/gesture.ts`）：手掌大小的觸控不開始畫線，筆畫中途擴大成手掌大小就整筆捨棄。回報 1×1 的裝置不受影響。門檻尚未在紅米平板實機調整，手掌若以小面積先觸控仍可能成為書寫點。

長筆畫抽樣限制在 1900 點以內，重繪合併到 animation frame。切換 App、失焦、旋轉或鎖定時保留寫到一半的筆畫，但不完成圈選擦除；旋轉螢幕時重畫向量筆跡。圈選在放開時依多邊形邊界切割路徑，保留圈外片段。

自由畫板 v2 使用格線相同的 CSS 像素座標，格子 138px、間距 14px。首次開啟依可用寬度選完整欄數；保存後固定畫板尺寸，旋轉或換螢幕寬度不把筆跡伸縮到另一格，必要時在「捲動」模式內平移。書寫中只畫新增線段，放開後整張重畫一次；停筆 600 ms 後才寫入 localStorage，換頁或隱藏時立即補存。匯出的 PNG 使用相同格線／座標且 2 倍解析度。v1 於首次讀取按目前顯示寬度轉換；舊資料沒有保存原始寬度，無法推回其他裝置的歷史顯示尺寸。損壞資料保留原值並禁止覆寫。

整輪聽寫讓孩子先寫全部題目，可往返、重聽；完成後統一檢查。較長語詞維持足夠大的田字格並向下捲動，不換頁、不隨字數縮小。左邊作答、右邊答案直排；單題補強保留原有家長判定／重寫流程。

位置圖按住顯示標題與正文位置，只接受孩子筆跡與行長度，不接收答案；放開／取消／失焦即關閉，不卸載畫布。鍵盤 Space／Enter 按住查看，Escape 關閉。

辨音獨立於練習紀錄分頁。先聽完兩個音再開始六題，答對跳綠色打勾動畫並自動換題，答錯顯示 X 再選。沒有第一下正確率文字，不將二選一視為手寫掌握，也不寫入正式紀錄。所有對照組都可使用；二、三聲用相同音節的既有音檔。

## 語音與載入

37 基本符號使用教育部錄音；22 結合韻與九課朗讀使用既有 Gemini Fola 靜態音檔。生字／語詞多數仍是舊 macOS Meijia 合成檔，未宣稱全部通過人耳校對。正式站不呼叫 AI API、不需要語音服務金鑰。

`public/listening-audio/registry.json` 記錄檔案來源、指定讀音、長度、SHA-256 與校對狀態；`lib/audio/audio-index.json` 是精簡的播放索引。更新任何音檔後執行 `npm run assets:audio-registry`，播放 URL 以檔案 hash 更新快取版本。已知文字與指定讀音不符時不借用另一聲調的音檔；可使用指定讀音的自訂錄音。未知自訂字詞仍保留瀏覽器合成備援。registry 的時間／hash 驗證不代表聽感與發音正確。

自訂錄音身份是完整文字＋注音（含聲調與 `|` 音節分隔），每段最多 20 秒／2 MB，以原始音訊位元組保存在 IndexedDB，播放時重建 Blob，並相容既有 Blob 紀錄。這避開 WebKit 的 Blob/File 儲存錯誤。裁切靜音後的錄音重新編碼為 22.05 kHz 單聲道 WAV（約每秒 44 KB）；未裁切的錄音保留原檔。播放只讀一次錄音 key（`getAllKeys`），不讀全部音訊；完整清單在開啟自訂讀音時才載入。近期錄音以最多 12 段的記憶體 LRU 共用讀取。新增、移除或重新載入會失效快取。已知存在的自訂錄音讀取或播放失敗時不替換成其他聲音；錄音資料庫整個無法開啟（封鎖網站資料、資料庫損壞）時視為沒有自訂錄音，官方音檔照常播放，30 秒後再試。

背景預載最多同時兩筆、每筆 8 秒逾時、近期保留 64 段；注音表只預載畫面上的格子。顯式播放優先取消同音檔未完成預載；切頁停止音訊與舊回呼。慢速連線仍可能等待首次下載，不宣稱完全零延遲。

Loading 等待當頁必要字型，圖片獨立透過小圖預覽漸進清晰。模糊只施於圖片，不施於文字、田字格或整頁容器。水彩 WebP 與原始素材保持不變。新增字／IVS 後按 `scripts/build-yo-fonts.py` 重建子集並做視覺檢查；完整 OFL 字型保留，支援任意自訂教材的 fallback。

## 完整裝置備份

「更多 → 裝置備份」匯出版本化 JSON，包含本網站的教材（含封存版本）、新舊紀錄、默寫草稿、設定、自由畫板與自訂錄音。原本教材管理的 JSON 仍只備份教材。

匯入先檢查檔案大小（最多 64 MB）、版本、限定 storage key、每項大小與錄音身份／大小／長度；不接受任意 key。各 key 的內容按原樣還原（app 讀取時才寬鬆轉換舊格式），舊設定格式、讀音更正後的收藏或這個版本讀不懂的內容都不會讓整份備份被拒；預覽會顯示「無法讀取、原樣保留」的項目數。還原分兩步：先下載目前資料，再開始還原，避免自動重新整理打斷下載。其它應用程式的 localStorage 不動。錄音清空／插入是一個 IndexedDB transaction；配額或資料庫錯誤時還原原 localStorage。跨 localStorage／IndexedDB 無法提供瀏覽器被強制關閉時的原子性，所以還原期間保持頁面開啟，並保留下載檔案。完成後自動重新整理以重新建立 external store／快取。

## 樣式及發布門檻

CSS 維持原匯入順序。已刪除程式碼中完全沒有使用的 class 規則，以及被後面同 selector、同條件規則覆寫的宣告（保留 `!important`、同規則內 fallback 與新語法值前的舊值）。`00-reset.css` 是原 Tailwind preflight，放在 cascade layer，所有一般規則都優先；沒有 utility class。`styles/lazy/` 由功能的 `lazy()` 匯入一起載入，只放該功能專屬 selector。`00-foundation.css` 集中 UI／旁注音／音節／基本符號／結合韻字型與點擊尺寸。功能樣式在對應檔案修改，避免另建一套字型或任意覆寫根樣式。

發布須通過 `npm run check`、`npm run format:check`、`npm run build`（含素材與子路徑檢查）及 Playwright 五個專案（Android 平板直／橫、iPad、Android 手機、桌面）。主要裝置是 Android 平板＋電容筆，先檢查 800／1280px 平板，再看 320／390px。檢查標題續寫、整輪往返／重聽／批次檢查、垂直語詞、辨音動畫、自訂資料備份及失敗重試。更新證據記在 `structure-improvements.md`；模擬 pointer 不能宣稱紅米真機／普通電容筆已驗證。發布後核對成功狀態與 source commit。

維持免登入、無 DB／雲端同步／PWA，不變更教師課文範圍。依賴維護見 `security-maintenance.md`。
