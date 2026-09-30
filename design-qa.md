# Design QA — 一年級注音練習站

final result: passed

## 第二版課文默寫練習簿與統一右側 Logo（2026-09-29）

final result: passed

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-bc3f838f-c53c-47b1-b5d2-29c7fbf230bf.png`。使用者選定第二版，並明確改為返回鍵與 Logo 同列、Logo 置右。
- Implementation evidence: Codex in-app browser at `http://localhost:3001/`; inspected the full first-lesson dictation screenshot at the default viewport, then measured a 390 × 844 phone viewport. The first lesson's notebook held all 14 interactive cells in five right-to-left columns, without page-wide horizontal overflow.
- Visual comparison: restored the soft watercolor heading, lesson-specific character art (cat for lesson one), colored vertical line tabs, textured paper, dashed writing cells, blue primary action and matching decorative watercolor pencil. The header is deliberately shorter and the Logo smaller than the conceptual image so both back action and brand fit on one row. Authentic lesson content and functioning UI remain live HTML, not baked into the image.
- Long-content comparison: lesson eight displayed 11 columns and 54 cells. Its writing grid measured 744px scroll width inside a 338px viewport, while the document stayed 390px wide; the explicit swipe cue remains visible. The cells are not shrunk to fit all lines at once.
- Header alignment: checked lesson back+brand on the same row at 390px; checked brand-right alignment on course, practice and more pages. Dictation back navigation returns to the selected lesson.
- Interaction: tapping the first empty cell opened the existing handwriting canvas, and returning restored the notebook. Parent review, draft/resume, filled/needs-retry states, and listening entry remain on their existing paths.
- Console/build: no browser warning/error entries; `npm test` passed 11/11, including the production build. No P0/P1/P2 visual findings remain.

## Source visual truth

- Source image: `/var/folders/l7/tdmqctxx3_d7fmvk0h6n4r180000gn/T/codex-clipboard-9b4cb745-acb1-42cd-8340-9920db6c4064.png`
- Source pixels: 1536 × 1024.
- Comparison crop: reference board panel 1, cropped to the home screen content and normalized beside the implementation.
- Combined comparison: `design-qa-comparison.png`.

## Implementation evidence

- Browser: Codex in-app browser.
- Viewport: 390 × 844 CSS px, device scale 1.
- Screenshots: `design-qa-home.png`, `design-qa-courses.png`, `design-qa-lesson.png`, `design-qa-fill.png`, `design-qa-listening-ready.png`, `design-qa-listening-active.png`.
- State coverage: home, course list, lesson selection, vertical Zhuyin fill-in, listening ready, listening active, second-playback state.
- Primary interactions tested: bottom navigation, lesson selection, correct fill placement, wrong fill feedback, entering Focus Mode, starting playback, and second playback countdown.
- Console check: no warning or error entries reported by the browser console.

## Comparison

The home implementation follows the reference's mobile-first composition: pale blue screen, navy educational heading, rounded illustrated hero, recent-practice card, three course cards, and a fixed four-item bottom navigation. The generated illustration is a new project asset in the same bright children’s-learning direction rather than a copy of the supplied board.

The lesson and practice states preserve the reference's strongest interaction cues: blue primary actions, green success state, orange remediation state, thick dark canvas border, touch-safe drawing surface, and vertical Bopomofo stacks where one card represents one complete syllable.

## Comparison history

1. Initial mobile pass: home and course list were captured at 390 × 844. The first course's current-state badge overlapped its number in the course list.
2. Fix: moved the current-state badge to an absolute top-right position within the course card.
3. Re-captured and rechecked home, course, lesson, fill, listening-ready, and listening-active states. No P0/P1/P2 visual findings remain.

## Required fidelity surfaces

- Fonts and typography: used rounded system fallbacks, navy display hierarchy, compact labels, and mobile-sized Chinese copy to match the reference density.
- Spacing and layout rhythm: normalized to a centered 480px mobile shell with 390px verification, fixed bottom navigation, compact card gaps, and safe bottom padding.
- Colors and visual tokens: mapped the reference's pale blue background, deep navy text, vivid blue primary action, green success, and orange remediation into shared CSS tokens.
- Image quality and asset fidelity: the hero uses `public/zhuyin-children-hero.png`, generated from the supplied reference's visual language; UI icons use Phosphor icon components instead of hand-drawn CSS or placeholder glyphs.
- Copy and content: the interface uses the handoff's first lesson, vertical Zhuyin requirement, listening playback rules, parent review wording, and three-choice remediation wording.

## Selected design 3 — course journey (2026-09-29)

final result: passed

- Source visual: `/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-416a72d0-cfe5-4d6c-9cc3-6f1270563e52.png` (853 × 1844). This is the third design the user selected.
- Implementation screenshot: `design-evidence/course-journey-mobile.png` (390 × 844 CSS-pixel viewport). Source and implementation were inspected together in the same visual comparison.
- State: course list at the top of the route, with the first six lessons visible and the bottom navigation fixed. The remaining three lessons were checked after scrolling.
- Fonts and typography: navy lesson titles are the strongest card text; the lesson ordinal stays secondary. The title size was increased after the first comparison pass.
- Spacing and layout: numbered blue stations, dotted left route, rounded right cards, and card cadence closely follow the selected image. The header and nine functional lessons retain the existing app shell.
- Colors: alternating pale blue, mint, and cream cards echo the selected route palette while retaining the app's blue navigation color.
- Image quality: ten optimized transparent watercolor PNGs were used: nine lesson-specific illustrations and a heading sign. All nine card assets loaded successfully.
- Copy: authentic lesson titles and ordinal labels remain live text, not baked into generated images. The “上次練習” badge comes from the saved recent-lesson state; no courses are falsely locked.
- Primary interaction: opened the first and ninth lessons from their cards and returned to the route; the recent-lesson badge moved accordingly. The 390px layout had no horizontal overflow or title/artwork collisions.
- Browser console: no warnings or errors observed in the course-list pass.
- Verification: `npm test` passed all 9 tests. `npm run lint` still reports pre-existing React hooks/ref errors elsewhere in `app/page.tsx`; none point to the course-journey code.

## 課文預覽響應式排版（2026-09-29）

final result: passed

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-744bc710-2838-48e7-acbb-fda81a030fe8.png`（853 × 1843）；正式課文與手機六欄／平板更多欄的使用者修正優先於圖中錯誤文字。
- Implementation evidence: Codex in-app browser, `http://localhost:3001/`, tab 41. Browser screenshots were captured and inspected inline at 320 × 700, 390 × 844, and 834 × 1194 CSS px, device scale 1. This browser tool did not export the captures to filesystem paths.
- Full-view comparison: reference's unboxed poem and circular paging buttons are present. The implementation uses existing lesson-specific watercolor art in a shorter hero to leave room for complete authentic lines; this is an intentional density change, not a cropped poem.
- Focused region comparison: at 320px and 390px, the first page of 《拔蘿蔔》 contains the original first six complete lines in right-to-left order, with no horizontal document overflow. At 834px, the first page shows eight complete lines; a seven-symbol lesson fits all seven sound tiles in one row. The phone sound tiles remain four columns.
- Fonts and typography: the existing BpmfZihiSans and BpmfZihiOnly fonts remain in the poem; responsive font sizes preserve six complete phone columns and eight tablet columns without splitting lines.
- Spacing and layout: poem and symbol sections have no outer borders; the poem's faint column dividers and tinted symbol tap surfaces aid reading and tapping. The 56px circular page controls remain reachable on phone.
- Colors and imagery: the existing navy/blue/green tokens and supplied transparent watercolor course assets preserve the app's established design language. The hero is less illustrated than the conceptual mock, a possible future P3 refinement.
- Copy and content: all poem columns are drawn from `lessons`, with the original order and alternate pronunciations preserved; no mockup text is shipped.
- Interactions tested: circular next/previous buttons, horizontal wheel paging, both poem display modes, and sound-tile playback. The tapped symbol loaded its matching local `.m4a` file; all 59 lesson symbols have matching clips. No browser console warnings or errors were observed.
- Responsive state: 390px CSS width used six poem columns and four sound columns; 834px used eight poem columns and up to seven sound columns; 320px had no document overflow.
- Verification: `npm test` passed 9/9. `npx tsc --noEmit` remains blocked by existing Cloudflare worker ambient types in `db/index.ts` and `worker/index.ts`; lint still reports existing React hooks/ref errors.

## 九課角色水彩統一（2026-09-29）

final result: passed

- Visual direction: the user's selected watercolor mock, `/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-744bc710-2838-48e7-acbb-fda81a030fe8.png`, guided the storybook palette and texture; lesson content still comes from the app's own data.
- Assets: all nine existing lesson roles were redrawn as cohesive transparent watercolor PNGs in `public/course-art/*-watercolor.png`. Originals remain untouched. The new lesson header landscape is `public/course-art/lesson-watercolor-landscape.png`.
- Browser comparison: in-app browser tab 41 at 353px phone width and 820px tablet width. The phone list showed individually identifiable cat, goose, hippo/beaver, smiling child and seesaw artwork; all nine image elements reported successful loads. The ninth lesson header showed the watercolor bear against the landscape without covering its title.
- Layout: course-card artwork retains the existing tappable text/arrow space. The watercolor lesson header remains separate from the six/eight-column poem; the 353px and 820px documents had no horizontal overflow. All live Chinese and Zhuyin text remains selectable, not baked into images.
- Accessibility: decorative role images keep empty alternative text; lesson title remains a real heading and course buttons keep their spoken names.
- Console: no browser warnings or errors observed. `npm test` passed all 9 tests.

## 課次頁水彩故事書版型（2026-09-29）

final result: passed

- Source visual truth: `/var/folders/l7/tdmqctxx3_d7fmvk0h6n4r180000gn/T/codex-clipboard-dd2b83ad-9243-4868-86cf-8501db2cb9b5.png`, 853 × 1844 px. Selected state: lesson 8, page 1, annotated Chinese + Zhuyin.
- Implementation screenshot: `design-evidence/lesson-watercolor-tablet.jpg`, 853 × 1844 px at an 853 × 1844 CSS-pixel Chrome viewport, scale 1. Responsive evidence: `design-evidence/lesson-watercolor-mobile-page-1.jpg`, 332 × 774 capture of the 353 × 774 CSS-pixel in-app browser viewport; the in-app capture crops 21px from the right edge, so use the Chrome tablet capture for 1:1 reference comparison.
- Full-view comparison: opened the reference and the final implementation together. Both show a continuous watercolor lesson hero, two pale blue/green stage cards, a warm illustrated poem sheet, circular pagination, pastel sound tiles, meadow footer, and fixed navigation. The hero and card proportions now align within the reference's major regions.
- Focused hero/cards comparison: the initial tablet capture had a 438px hero and 194px stage cards against the reference's roughly 465px hero and 230px cards. Increased the hero to 468px, cards to 230px, artwork/title scale, and icon scale. The post-fix Chrome capture measures hero bottom at 465px, stage cards top/bottom at 462/692px, and first poem heading top at 716px; no P0/P1/P2 mismatch remains.
- Focused text/symbol comparison: authentic eight-column tablet poem from `lessons` replaces the mock's abbreviated six columns because the earlier user decision allows more columns on tablet and complete poem lines must not be truncated. The sound grid uses six tablet columns instead of the mock's four, following the earlier tablet request. Phone keeps six poem columns and four sound columns. These are intentional content/responsive deviations.
- Typography: live lesson title, stage labels, poem and sound glyphs retain the existing site typography and local Zhuyin font; none are baked into the generated images. The larger tablet title and stage hierarchy now follow the reference. Single-character sound tiles use horizontal Bopomofo orientation to avoid vertical glyph substitution.
- Spacing/layout: header visually overlays the landscape without occluding the title; cards sit immediately below the scene. The 320px and 353px phone checks and 853px tablet check had no document-wide horizontal overflow.
- Colors/assets: three new project-bound watercolor assets provide lesson-eight rabbit/radish foreground, poem paper, and meadow footer; the nine existing transparent watercolor roles remain for other lessons. Blue/green action colors remain accessible and consistent with existing navigation.
- Interaction/copy: both stage entrances retain their working actions; the second stage was opened successfully from the new button. Round paging retained the right-to-left lesson order; page 1 was verified. The reference's incorrect sample text was not copied. Decorative images retain empty alt text.
- Browser console: no warnings or errors in the tablet Chrome pass. `npm test` passed 9/9. Remaining P3: the screenshot's tiny card leaf accents and full botanical background density are not replicated exactly; they do not affect legibility or interaction.

## 課程頁依使用者截圖重排（v41，2026-09-29）

final result: passed

- Source visual truth: `/var/folders/l7/tdmqctxx3_d7fmvk0h6n4r180000gn/T/codex-clipboard-44897f30-44c6-413b-a237-584ffa5f9d22.png`，853 × 1844 px。以 2× 密度縮至 426 × 922 px 比對。
- Implementation evidence: `design-evidence/course-reference-match-v41-final.png`，Codex in-app browser、426 × 922 CSS px；完整並排證據：`design-evidence/course-v41-compare-final.png`，852 × 922 px。兩張圖皆為課程頁開場、第一課帶「上次練習」標記、六張卡片及固定導覽的相同狀態。
- Full-view comparison: 頁首品牌位置、右上木牌與淺綠山丘、左側六站時間軸、藍／綠／米色卡片、頁尾草地和固定導覽的區塊位置相符。參考圖有四個導覽項目，實作維持使用者稍早指定的「課程／練習／更多」三項，不恢復首頁。
- Focused regions: 頁首木牌與標題、第一與第三張卡片的字圖比例、六站後的草地與木牌、固定導覽分別檢查。木牌文字「一起出發吧！」與頁尾「繼續探索！」皆在實際 PNG 中核對；卡片標題仍是可選取的網站文字。
- Typography: 加大課程標題並保留深藍粗體、黃色底線；課次序號小於課名，最近練習標籤維持次要。系統中文字體與參考圖的手繪字感略有差異，但閱讀層級一致，列為 P3。
- Spacing/layout: 同尺寸下第一張卡片約 y=225px、六張卡片結束約 y=787px，與參考接近。縮窄招牌插畫至可讓左側標題清晰的比例；卡片維持完整可點範圍。360 × 780 手機與 820 × 1024 平板均無橫向溢出。
- Colors/assets: 九張既有角色水彩圖沿用；新增三張專用透明水彩 PNG，分別是右上木牌山丘、頁尾木牌和連續草地。藍色站點、淡色卡片與深藍文字延續網站配色。插畫細節、裝飾短線及時間軸曲線與參考略異，列為 P3。
- Copy/content: 第一至九課名稱仍取自課程資料；首屏顯示六課，點擊「繼續探索」顯示第七至九課，不會刪除課程。第七課可進入，返回後仍可看到後三課。
- Interactions/console: 驗證課程卡片、第七課展開、課次返回；瀏覽器沒有 error 或 warning。`npm test` 通過 9/9。
- Comparison history: 第一版截圖顯示頁首濾鏡模糊木牌、主內容多餘底部留白遮住草地；移除濾鏡與留白後，招牌和角色比例仍偏大、頁尾中央不連續；縮小招牌、調整角色尺寸、換上專用頁尾圖與放大標題後重拍同尺寸截圖，最終並排圖無待修的 P0/P1/P2 問題。

## 九課連續與單一頁尾（v42，2026-09-29）

final result: passed

- 使用者修正優先於 v41 參考圖：第七至九課應和前六課連續排列，無需點擊或展開；草地與木牌只在第九課後出現一次。
- Browser evidence: Codex in-app browser at 426 × 922 CSS px；`design-evidence/course-all-nine-top-v42.png` shows the continuous timeline below lesson six, and `design-evidence/course-all-nine-bottom-v42.png` shows lessons seven to nine with the one footer. The visual reference remains the 853 × 1844 px source screenshot recorded in the v41 section; its after-six footer is intentionally superseded.
- Functionality: all nine `.journey-step` elements are present and unhidden; no middle `journey-break` remains. The ninth card's bottom measured 731.8px while the fixed navigation begins at 855px, so it is fully reachable. The ninth lesson opened and returned successfully.
- Fidelity surfaces: title hierarchy, card colors and role illustrations stay unchanged from v41; card cadence and left numbered route remain continuous through nine. Footer art is a single background on `.app-shell.is-courses`, with one decorative sign after the ninth card. The three-item navigation remains intentional per the earlier user decision to remove Home.
- No P0/P1/P2 visual or interaction findings remain. Previous v41 notes describe the earlier six-plus-reveal implementation and are retained as version history, not the current behavior.

## 默寫、聽寫聚焦頁與警示卡（2026-09-30）

final result: passed

- Source: 使用者提供的四張現況截圖，涵蓋默寫手寫頁、聽寫準備頁、聽寫作答頁，以及原生離開警示；既有課次頁的水彩紙張與角色畫風作為視覺基準。
- Browser evidence: Codex in-app browser `http://localhost:3001/`，依序檢查第一課的課次頁、默寫紙張與手寫格、聽寫準備卡、聽寫作答格及站內離開警示。畫面擷取於瀏覽器工具輸出，沒有另存本機檔案。
- Logo: 課次頁品牌圖示為 29 × 29px，與課程、練習、更多頁相同；品牌名稱仍在右上角。
- 視覺：聚焦頁沿用淡色水彩草地、米白紙張、課次角色與既有藍綠操作色；田字格保持近白底與清楚格線，裝飾不進入書寫區。
- 默寫鉛筆：解除紙張容器裁切，鉛筆從右下角跨出紙框，下面保留足夠的按鈕間距。捲動後檢查，鉛筆完整可見且未遮住格子或開始按鈕。
- 警示：聽寫離開改為可鍵盤操作的站內對話框；開啟時倒數由 `00:02` 保持在 `00:02`，選「離開本題」回到課次。錯字重練的離開警示也不再使用瀏覽器原生確認框；草稿恢復與離開卡同步換成水彩紙張風格。
- 視窗與錯誤：在瀏覽器目前的桌面視窗中，480px 寬的 App 畫面沒有橫向溢出；console 未見 warning 或 error。`npm test` 通過 12 項測試。

## 家長檢查：第三版無進度條、星星收藏與逐格重寫（2026-09-30）

final result: passed

- Source visual truth: 使用者選定的第三版批改簿概念，並依最新回饋移除進度條、每行只顯示一次行名、改以空心／金色星星表示每格的收藏狀態。定稿示意圖：`/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-0a7f3b95-887c-42e7-a8e3-9a3f5ada92e1.png`。
- Implementation evidence: `design-evidence/parent-review-selected-mobile.png`（390 × 844）與 `design-evidence/parent-review-selected-narrow.png`（320 × 700），皆擷取自本機第一課、14 格寫滿後的家長檢查頁；第一行第一格為金色實心收藏星星。
- Layout: 兩個實測寬度均無頁面橫向溢出。320px 時孩子筆跡及正確注音格皆為 57.59 × 57.59px 正方形，對照內容置中；重寫按鈕仍有 44px 高。每段有單一「第 N 行」標題，列內只顯示 1、2、3 等序號；列表可捲動，底部兩個完成／稍後按鈕固定可見。
- Interaction: 逐格切換收藏星星，計數由 1 → 2 → 1，且同一注音的不同位置可獨立收藏；點第二格「重寫這格」進入該格手寫頁、保存後返回家長檢查，另一格的收藏保留。完成檢查後練習頁只顯示仍收藏的那格。
- Fidelity: 保留紙張、柔和水彩草地及既有貓咪插畫；對照格與操作順序和定稿一致。實際首屏只顯示約兩段內容而非示意圖的三段，原因是以 390px 手機尺寸顯示完整可點按的方格和固定底部操作，後續行可自然捲動。插畫與裝飾較示意圖精簡，列為 P3，不影響閱讀或操作。
- Console: 瀏覽器無 error/warn。`npm test` 包含正式建置及 12 項測試，全部通過；`git diff --check` 通過。

## 家長檢查視覺回修：忠實對齊第三版定稿（2026-09-30）

final result: passed

- 使用者回饋使上一節的視覺結論失效：先前雖通過功能驗證，卻有 P1 的大區塊風格差異。來源為 `/Users/kaoru/.codex/generated_images/01a0e36a-2a5d-7a41-a4db-32106955bcf6/exec-0a7f3b95-887c-42e7-a8e3-9a3f5ada92e1.png`（853 × 1844 px）；正規化至 `design-evidence/parent-review-reference-390.png`（390 × 844 px）。實作瀏覽器截圖是 `design-evidence/parent-review-watercolor-final-390.png`（390 × 844 px，390 × 844 CSS viewport、1×）；兩張圖已在相同輸入中並排檢視。
- 第一輪 P1：舊實作 `design-evidence/parent-review-selected-mobile.png` 把標題推到右邊，額外說明擠壓首屏，缺少示意圖的睡貓、植物、粉色行標籤；格子與星星／重寫按鈕也偏左。修正頁首置中、縮短導語，製作專用透明水彩插畫、調整欄寬；`design-evidence/parent-review-match-pass1-390.png` 顯示主要區塊回到正確位置。
- 第二輪 P2：`design-evidence/parent-review-match-pass2-390.png` 的行距和格子位置更接近，但背景植物在第二行過早出現；`design-evidence/parent-review-match-pass3-390.png` 的紙紋又過度粗糙。最終換為淺米白底，另生成獨立的底部花草，裁在頁尾操作區上方並降至 65% 不透明度。最終截圖底部的文字與按鈕仍清楚。
- 全圖位置：最終第一行標籤 y=159px（來源約 y=159px）、第一列 y=194px（來源約 y=193px）、第二行標籤 y≈472px（來源約 y=470px）；第一個正方形 x≈60px（來源約 x=59px），星星和重寫按鈕的欄序、間距相近。
- 字體與文案：恢復深藍粗體課名、較粗的行標籤；沒有進度條或逐列重複「第幾行」。來源圖的「已檢查 5/14 · 1 格待重寫」是示意狀態，實作顯示真實的「已寫 14/14 · 已收藏 1 格」，避免捏造待重寫狀態。孩子筆跡與正確注音標籤仍是可選取文字。
- 色彩與素材：新睡貓、角落葉片、粉色行標籤、底部白花草地均為專用透明 PNG；表單文字和互動圖示維持網站的真實字體與 Phosphor 圖示。注音仍用既有專用字體，不將答案烘進圖片。方格用先前使用者明確要求的正方形，即使示意圖看起來稍微扁寬。
- 內容差異：示意圖在第二行只呈現兩格就進入第三行；實際第一課第二行共有三格，不能為了截圖省略，因此 390 × 844 首屏會顯示第二行第三格，第三行需向下捲動。這是為了保留真實課文，不是排版裁切。測試用筆跡較示意圖細短，不代表實際學生筆跡的固定樣式。
- 響應與互動：390px 下對照格 74.875 × 74.875px，注音中心誤差小於 1px；320px 下 61.4375 × 61.4375px，星星與逐格重寫按鈕都有 44px 高的點按區；兩個寬度均無水平溢出。逐格星星 1→2→1 格的狀態與文字同步。瀏覽器無 error/warn，`npm test` 建置與 12 項測試全部通過。
- 剩餘 P3：水彩線條和手寫測試筆跡無法與生成的概念圖逐像素一致；其餘主要視覺與功能落差已修正。

## 家長檢查：行標籤雙圖層與方格中心線（2026-09-30）

final result: passed

- Source visual truth: `design-evidence/parent-review-reference-390.png`（由第三版選定圖正規化而成，390 × 844px）；本次使用者回饋進一步要求粉色水彩與草葉分層、重疊但不得貼近文字，且數字、星星、重寫按鈕與方格置中。
- Implementation screenshot: `design-evidence/parent-review-separated-label-alignment-390.png`，390 × 844px；Codex in-app browser `http://localhost:3001/`，390 × 844 CSS viewport、1× 密度。兩圖為第一課家長檢查同一首屏狀態，已在同一比較輸入中檢視；測試筆跡和收藏數與示意圖不同屬真實內容差異。
- Comparison history: 上次截圖 `design-evidence/parent-review-watercolor-final-390.png` 的行標籤使用單張合成圖，葉子與粉色筆刷無法獨立挪開，屬 P2 文字安全距離問題；列內小字又令數字及操作項的視覺中心比方格略低。修正後，兩張透明水彩 PNG 分別置於 `h2::before` 和 `h2::after`，草葉在粉色筆刷左緣上層重疊，文字左留 42px。對照最終截圖，葉尖沒有碰到「第 1 行」；整體仍保留參考圖的粉色行標籤與左側草葉。
- Focused region: 第一列的五個中心點以瀏覽器量測均為 y=233px：數字、孩子筆跡格、正確注音格、星星、重寫按鈕；視覺截圖亦顯示標籤移到格子下方而未拉偏中心。320 × 700 CSS viewport 再檢查，五欄中心均為 y=226px，列寬與內容寬同為 288px，沒有水平溢出。
- Fidelity surfaces: 既有中文字體、注音字體、深藍文字、格子尺寸、按鈕顏色與文案不變；只新增淡粉筆刷與綠色葉片兩張透明圖。兩圖邊緣清晰、沒有不透明白底，與原水彩角色畫風相容；互動的星星與重寫按鈕保留可點擊狀態。
- Interaction and console: 測試分頁實際寫滿 14 格後自動進入家長檢查；截圖時沒有瀏覽器 error。`npm test` 建置成功，12/12 測試通過。沒有待修的 P0/P1/P2 項目。

## 家長檢查：草葉緊鄰行標題（2026-09-30）

final result: passed

- Source visual truth: `design-evidence/parent-review-reference-390.png`（390 × 844px），以及使用者針對前次畫面的修正：小草必須在「第幾行」旁邊，不能像獨立的頁邊裝飾。
- Implementation screenshot: `design-evidence/parent-review-grass-beside-label-390.png`（390 × 844px，Codex in-app browser、390 × 844 CSS viewport、1× 密度），第一課 14 格完成後的家長檢查頁。來源、前次截圖 `design-evidence/parent-review-separated-label-alignment-390.png` 和修正後截圖在同一比較輸入中檢視；局部行標籤足夠清晰，無需另裁切。
- Comparison history / P2 fix: 前次草葉在文字左側卻留有過寬的空白，讀起來是兩個不相干的裝飾。把草葉圖層相對標籤向右移 10px，現在緊貼粉色筆刷左緣，位於「第 1 行／第 2 行」旁邊，葉片與筆畫仍分離，未遮住文字。
- Fidelity: 只改草葉水平位置；標題字型、文案、色彩、透明水彩圖、方格尺寸與互動均沿用前版。數字、星星、逐格重寫按鈕保持與方格中心線對齊。真實測試筆跡與示意圖不同，不構成視覺錯誤。
- Browser: 實際透過「繼續默寫」進入 14 格完成的家長檢查頁；沒有 console error。沒有待修的 P0/P1/P2 問題。
