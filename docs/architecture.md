# 架構與維護界線

```text
app/                       路由、metadata、樣式匯入入口
components/                App shell、導覽、Loading、筆跡縮圖、注音呈現
features/
  courses/                 九課資料、圈詞、課程列表
  lesson/                  閱讀頁、IVS 字形表
  fill/                    默寫／檢查／重練 UI、Canvas、草稿驗證與保存
  listening/               抽題、題目 ID／音檔 URL、Canvas、聽寫／結果 UI
  practice/                收藏列表、驗證、舊版收藏遷移
  settings/                設定與說明 UI、設定驗證
  usePracticeApp.ts        頁面切換與跨關卡工作階段協調
  types.ts                 共用 domain 型別
lib/audio/                 可取消的音訊預載／播放與失敗處理
lib/storage/               useSyncExternalStore 本機儲存介面
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

Canvas 用 0–100 座標保存，尺寸改變時重畫；pending 草稿與已完成格分開。Canvas 不隨每次 pending 更新清空。觸控使用 pointer capture 與 `touch-action: none`。

外部 storage 先讀後寫，SSR 使用穩定預設值。讀取失敗不以空陣列覆蓋舊資料，寫入失敗保留記憶體結果並提示。v1／v2 收藏讀取時轉為 v3。網站不做雲端同步或個資收集。

## 樣式與素材

CSS 編號代表匯入順序，保留原 cascade，避免重整時改變手機版外觀。`*-base.css` 是仍使用的基礎樣式，後續畫面檔負責水彩主題。請在對應功能檔修改，不再向 globals.css 追加零散規則。

插圖無損轉為 WebP，不變更透明度、尺寸或配色。原始 PNG／TTF 保留供重建。原生 `<img>` 是刻意選擇：沒有 Cloudflare IMAGES binding，不依賴即時圖片優化；未配置端點回傳 501。

## 發布門檻

通過 `npm run check`、正式 build／HTML 渲染測試與三個 Playwright 專案，再同步 GitHub、發布 Sites。失敗 trace／截圖不進 public。發布前確認沒有無關修改，發布後核對成功狀態與 commit SHA。

不在本輪加入 DB、登入、雲端同步、PWA／service worker，不重畫背景或更動教師課文範圍。框架升級界線見 `security-maintenance.md`。
