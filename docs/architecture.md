# 架構與維護界線

```text
app/                       路由、metadata、樣式匯入入口
components/                App shell、課名／專注標頭、檢查／收藏共用元件、Loading、筆跡縮圖
features/
  courses/                 九課資料、圈詞、課程列表
  lesson/                  閱讀頁、平衡分頁／預覽 hook、IVS 與標題讀音校正
  navigation/              切頁焦點／捲動、對話框鍵盤控制、家長檢查返回位置
  symbols/                 37 符號分組、點選發音表
  fill/                    默寫／檢查／重練 UI、Canvas、草稿驗證與保存
  listening/               抽題、題目 ID／音檔 URL、Canvas、聽寫／結果 UI
  practice/                收藏／待補強獨立狀態、紀錄 hook、驗證與遷移
  settings/                設定與說明 UI、設定驗證
  usePracticeApp.ts        頁面切換與跨關卡工作階段協調
  types.ts                 共用 domain 型別
lib/audio/                 可取消的音訊預載／播放與失敗處理
lib/storage/               useSyncExternalStore 本機儲存介面
lib/loading/               實際圖片／字型就緒與逾時提示
lib/ink/                   共用筆跡路徑、圈選切割、畫布重繪與每格復原
styles/                    分檔樣式，入口維持 cascade 順序
worker/                    Cloudflare adapter；沒有 DB／登入
tooling/build/             Sites metadata 建置插件
tests/unit/                資料、遷移、草稿、儲存、音訊快取行為
tests/e2e/                 Playwright 瀏覽器操作
assets/                    原始素材、已停用素材（不公開部署）
docs/visual-qa/            視覺參考與人工 QA
examples/                  未啟用的後端／登入範例
```

`app/page.tsx` 不持有課程資料或互動狀態。畫面使用 `Pick<AppController, ...>` 表達所需資料／事件；包含子畫面的聽寫容器接受完整 controller。controller 協調工作階段，Canvas、音訊與保存副作用由各自 hook 負責。沒有引入全域狀態套件或路由框架。

## 資料與狀態

課文先改 `course-data.ts`、`circled-vocabulary.ts`，再檢查注音／IVS 與音檔。題目 ID 維持 `類別:朗讀文字`，避免破壞收藏。舊收藏仍可取用舊題庫，但不抽入新的教師圈詞範圍。

課名與課文頁標題使用共用 `AnnotatedText`，由既有國字注音字體繪製；標題輕聲由 `lesson/annotated-text.ts` 校正，無障礙名稱保持原始國字。課文的逐字 IVS 與純注音切換維持既有規則。

`LessonTitle`／`LessonLabel` 共用課名讀音；`FocusHeader` 統一課次課名、階段、題號與返回目的地。瀏覽 header 保留品牌，專注 header 以作答資訊為主，兩者不強求相同高度。`ReviewActions` 的答對／需要補強與 `FavoriteButton` 的黃星是獨立操作。

注音表資料只含 37 個基本符號（聲符 21、韻符 16，韻符包含 ㄧ／ㄨ／ㄩ）。格子由右至左排列，同欄由上往下；只改排版方向，不鏡像字形。沿用同一音訊播放器、正常速度與教育部錄音，不另建播放元件或合成音；音檔按需載入，切頁或再點另一格會取消舊播放與回呼。

默寫與聽寫共用 `lib/ink/useInkCanvas`，以 `InkStroke[]` 保存每筆 0–100 座標路徑，尺寸改變時重畫，不複製畫布影像。默寫 pending 草稿與已完成格分開，保持 v1 形狀並相容舊資料；明確的空 pending 格不回退到舊的已完成筆跡。聽寫路徑只存在當輪記憶體，未完成本輪仍不持久保存。觸控使用 pointer capture 與 `touch-action: none`，移動重繪按 animation frame 合併；長筆画抽樣限制為 2000 個點以內。

圈選橡皮擦由 `ink-path.ts` 在放開時切割筆畫與閉合多邊形的交點，保留圈外片段，單點筆跡也可擦除。虛線圈只是預覽，不會進入草稿；點一下、直線／過小範圍、沒有圈到筆跡不消耗復原步數。pointercancel／旋轉中斷圈選不擦除。每格各有最近 30 步記憶體歷史，支援書寫、局部擦除與整格清空的復原；切題或離開該默寫格不保存復原歷史。重播不清空歷史，重新作答才重設。草稿驗證允許最多 2000 個片段，避免擦除切割後超出舊 200 筆上限。

外部 storage 先讀後寫，SSR 使用穩定預設值。寫入失敗保留記憶體結果並提示。v1／v2／v3 收藏讀取時轉為 v4，保留原始舊 key。v4 的 `isFavorite` 與 `needsPractice` 分開；取消收藏只更改前者，家長確認掌握才清除後者。舊版無法分辨自動補強與手動收藏，因此保守保留舊星星與補強狀態。重複紀錄合併兩個旗標，不丟失待補強。

默寫收藏由 `useFillCollection` 與純函式 `updateFillCollection` 管理，維持 v1 key 並相容舊資料。缺少 `isFavorite` 的舊資料視為已收藏；`needs_rewrite`／`review_later`／`mastered` 表達待補強／待複習／已掌握，答對不取消收藏。取消收藏但仍待補強的題目保留。復原提示固定於底部導覽上方，可關閉且不需捲回頁首。

`history` 最多保留 20 次真正完成的本機練習，包含時間、課次、模式、已作答格數、答對格數與當次待補強題數。只開啟課文不新增 history，也不從舊累計數量補造歷史。課程的最近標籤明確命名為「最近開啟」。網站不做雲端同步或個資收集。

切換頁面會回到頂部並聚焦標題；返回課程保留瀏覽位置，重寫後返回家長檢查保留比較清單的捲動位置。課文按完整行平衡分頁，課文直排與語詞答案維持右到左。長篇默寫提供各行進度入口，不加閱讀方向提示。

課文翻頁對焦首行；切換國字／純注音保留同一頁的首行閱讀錨點。聽寫題號或階段改變會重設 `.focus-content` 內部捲動，每個階段有一個 h1。對話框有 Escape／Tab 控制，關閉後不讓焦點留在已移除的按鈕。整輪聽寫在非初始 ready 或已有檢查進度時都要求退出確認，並明說未完成本輪不保存。

語詞的手寫格依使用者更正，固定由上到下排成單欄，整欄水平置中；不再橫向並排或左右捲動。依字數與可用高度調整格子尺寸，較長語詞仍可沿頁面上下捲動；答案與補強選項保留既有右到左順序。

「第幾字」與 44px 圈選橡皮擦／復原／清空位於田字格左側的外部工具列，不覆蓋書寫空間；操作只影響目前那格。單格默寫／聽寫的共用 `InkTools` 在格子上方，提交在下方。圈選用黃色狀態與虛線提示，完成有效圈選後回到書寫；檢查／選答案階段不可修改筆跡。

聽寫預設一般作答，寬鬆模式提供兩倍時間；長詞仍按字數調整。符號音檔維持正常速度。倒數從播放開始且包含重播間隔，但音訊載入／離開確認期間暫停。完成與答對分開統計；選項答對不算手寫掌握。

## 樣式與素材

CSS 編號代表匯入順序，保留原 cascade，避免重整時改變手機版外觀。`*-base.css` 是仍使用的基礎樣式，後續畫面檔負責水彩主題。準備聽寫頁已移除舊覆寫段；寬度分成 reading／manage／writing 三個 token。請在對應功能檔修改，不再向 globals.css 追加零散規則。

`17-consistency.css` 是共用角色與窄螢幕規則的最後一層；準備頁以容器字級 `cqi` 取代桌面 `vw` 放大。尚未全面重寫歷史樣式或把 controller 全部拆成 session hooks，後續重構應以回歸驗證逐批進行。

全站文字預設採 `text-wrap-style: pretty`；可換行的文字使用 pretty，保留直排課文、單行標籤與書寫格原有的 `white-space` 規則。標題不另覆寫為 balance。

插圖無損轉為 WebP，不變更透明度、尺寸或配色。原始 PNG／TTF 保留供重建。原生 `<img>` 是刻意選擇：沒有 Cloudflare IMAGES binding，不依賴即時圖片優化；未配置端點回傳 501。

`KidLessonYoSans` 與 `KidLessonYoOnly` 由 `scripts/build-yo-fonts.py` 依 UI／課文源碼產生子集。保留所有使用的 IVS（包含 E01E1 與 E01E2）、輕聲與「喲」讀音校正。新增課文或國字注音 UI 後執行 `python3 scripts/build-yo-fonts.py`，更新字型版本 query，再做視覺驗證。完整授權原始字型不可刪除。

Loading 不再固定等待 420ms：等待當頁圖片／字型實際完成，快取命中即可繼續；失敗或 15 秒逾時顯示可繼續練習的提示。音訊由播放器獨立管理就緒、取消與失敗，避免永久卡住。

音訊背景預載最多同時兩筆，每筆 8 秒逾時；顯式播放會取消同音檔的未完成預載，改走即時播放。避免慢速連線時讓整課預載占滿連線，排擠當頁圖片／字體。離開或卸載會取消佇列與未完成下載。

## 發布門檻

通過 `npm run check`、正式 build／HTML 渲染測試，並以可用瀏覽器工具驗證主要流程及 320／390／1280px。Playwright 三個專案保留為自動回歸入口；若本輪未執行，必須明確紀錄，不宣稱引擎或真機覆蓋。失敗 trace／截圖不進 public。發布前確認沒有無關修改，發布後核對成功狀態與 commit SHA。

不在本輪加入 DB、登入、雲端同步、PWA／service worker，不重畫背景或更動教師課文範圍。框架升級界線見 `security-maintenance.md`。
