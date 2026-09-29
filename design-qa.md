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
