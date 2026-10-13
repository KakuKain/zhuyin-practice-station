# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A login-free Zhuyin (注音) practice site for Taiwanese first graders and their parents: lessons 1–9 plus three review sets, a symbol chart, handwriting dictation, listening dictation, and sound discrimination. It also has 數學 (康軒 115, first grade), following the textbook's contents: 上學期 lessons 1 (10以內的數), 2 (比長短), 3 (排順序、比多少), 4 (分與合) and 7 (10以內的加法) are built; 上學期 5, 6, 8, 9 and all of 下學期 are listed as 製作中. An optional 集章卡 (stamp card) rewards finished practice; it stays on the device and needs no login. UI copy and all docs are in Traditional Chinese (zh-Hant). `docs/architecture.md` is the detailed reference for feature boundaries and invariants. Read it before changing state, storage, audio, or ink behavior.

Hard product constraints: no login, no DB, no cloud sync, no service worker or offline cache, no runtime AI or speech API calls, and no changes to the teacher-defined lesson scope. A web app manifest so the site can be added to the home screen (full screen, portrait-locked, no browser UI) is fine.

## Commands

Node 24 (CI version; minimum 22.13) with npm.

```sh
npm ci
npm run dev                    # Vite dev server at http://localhost:5173/zhuyin-practice-station/
npm run check                  # eslint --max-warnings 0, tsc --noEmit, unit tests
npm run format:check           # prettier (printWidth 100); CI runs it too
npm run build                  # production build -> dist-pages/, then scripts/check-build.mjs
npm run preview                # serves the build at /zhuyin-practice-station/
npm test                       # check + build
npm run test:e2e               # build, then Playwright against the preview server
```

Single tests:

```sh
npx tsx --test tests/unit/materials.test.ts
npx tsx --test --test-name-pattern "lesson pages" tests/unit/audit-regressions.test.ts
npx playwright test tests/e2e/symbols.spec.ts --project=android-tablet -g "<title regex>"
```

Playwright always starts a fresh `npm run preview` on port 4176 (`PLAYWRIGHT_PORT` overrides it) and never reuses a running server, so run `npm run build` first. Projects: `android-tablet` and `android-tablet-landscape` (the primary device), `ipad-webkit`, `android-phone`, `desktop-chromium`.

Asset pipelines:

- After adding or replacing any audio file, run `npm run assets:audio-registry`. It rewrites `public/listening-audio/registry.json` and `lib/audio/audio-index.json` with hashes, durations, and cache-busting URLs.
- `npm run assets:artwork` generates lossless WebP files in `public/course-art/` from the PNG originals in `assets/artwork/`; `npm run assets:progressive` regenerates the blur-up previews in `components/artwork-previews.json`.
- New words in `circled-vocabulary.ts` need clips: `node scripts/generate-listening-audio.mjs` (macOS, Meijia voice) creates missing ones, then run `npm run assets:audio-registry`. A word must have a single reading across all content, or no clip can serve it.
- To re-voice a word with Gemini (`gemini-3.8-flash-tts`, voice Fola), run `GEMINI_API_KEY=… npx tsx scripts/generate-gemini-words.ts <words…>` (or `--from <folder>` with `<word>.wav` files saved from AI Studio; `--prompts` prints the prompts). It writes `public/listening-audio/gemini/words/`, removes the old Meijia clip, and records the prompt in `gemini/manifest.json`; then run `npm run assets:audio-registry`. The Meijia script skips words that have a Gemini clip.
- `node scripts/build-app-icons.mjs` regenerates the home-screen icons in `public/icons/` from `public/favicon.svg`.
- `python3 scripts/slice-avatars.py assets/artwork/avatars/sheet.png` cuts the 12 watercolor child avatars from one 4 × 3 sheet into round, transparent `public/course-art/avatar-<name>.webp` files.
  - The sheet was painted with ChatGPT; Claude cannot generate raster images.
  - The output is 192 px, lossy WebP at quality 88.
  - The originals live in `assets/artwork/avatars/`, a subfolder that `optimize-artwork.mjs` skips.
- `npx tsx scripts/generate-math-audio.ts [--refresh]` voices every math instruction in `features/math/math-audio.ts` into `public/math-audio/` (macOS Meijia). First graders cannot read yet, so every math question is spoken; a unit test checks each prompt has a clip. Meijia misreads some words, found by comparing her recordings: she says 和 as ㄏㄜˊ where the lessons read ㄏㄢˋ, and 「從左邊數」 with ㄕㄨˋ. (She reads 數一數 and 薄 ㄅㄛˊ right.) `mathPromptSpeech` voices them as the homophones 漢 and 鼠; the screen still shows the prompt as written.
- `python3 scripts/build-yo-fonts.py` rebuilds the lesson font subsets after you add characters or IVS glyphs. Readings the upstream fonts lack are composed from their zhuyin parts (`EXTRA_READINGS`, so far 來 ˙ㄌㄞ), and writes `assets/font-sources/KidLessonYoOnly-readings.json` and `KidLessonYoSans-readings.json` (what each character and variation sequence shows). `scripts/build-fonts.py` rebuilds the full fonts. Both need fontTools and brotli. Bump the `?v=` on the fonts in `styles/02-typography.css` when they change.

## Build and deploy

There is one build: a static Vite SPA. `index.html` → `app/main.tsx` → `createRoot(...).render(<PracticeApp />)`. Dev, tests and production all use `vite.config.ts` with the GitHub Pages base path `/zhuyin-practice-station/` (`PAGES_BASE_PATH=/` builds for a root or custom domain).

- **Reference `public/` files with page-relative paths** (`"course-art/cat.webp"`, `` `listening-audio/${name}.m4a` ``), never root-absolute ones (`"/course-art/…"`), which would skip the base path and 404 on Pages. `scripts/check-build.mjs` fails the build on a root-absolute literal, a CSS `url()` outside the base, or any `public/` file missing from `dist-pages/`. CSS may keep `url(/fonts/…)`; Vite adds the base there.
- A push to `main` deploys through `.github/workflows/pages.yml` only after check, format check, the build and all Playwright projects pass. Pull requests run the same gate in `.github/workflows/ci.yml`.
- The old Next/vinext/Cloudflare Worker build was removed; its last version is the git tag `legacy-sites-build`.

## Architecture

**There are no routes; this is a single-page state machine.** The entry renders only `<PracticeApp />`. The screen is selected by the `View` union in `features/types.ts`. `PracticeApp` first asks 現在是誰在練習？ when two or more children share the device and this app session has not chosen yet (`components/ChildPicker.tsx`). It then renders the app keyed by the active child, so switching children remounts every screen and store with that child's records.

- Children are shown by watercolor animal avatars (`ChildAvatar`, `avatarImage`).
- 更多 → 孩子 is a card per child (picture, name, 正在練習, material, remove) plus a 新增孩子 card, with no explanatory text: the user found it self-evident.

- `features/usePracticeApp.ts` is a thin coordinator. It owns the view and lesson, the shared stores, audio, and the course-review queue. It spreads each flow's API into one flat controller object, which components read through `Pick<AppController, …>`.
- **Each flow owns its own state and actions:**
  - `features/listening/useListeningFlow.ts`: listening dictation (聽寫). It composes `useListeningCanvas`, `useListeningPlayback` and `useListeningRound`. A whole-lesson round is untimed and checked at once (`ready → active → batch_review → result`). It has 10 questions in three sections (`listeningRoundSize` in `listening-data.ts`): 4 symbols or combined rhymes, 4 生字 from `features/courses/lesson-characters.ts` (preferring ones not in this round's words), then 2 whole words. Reviews draw symbols from the three lessons they cover (`listeningSymbols`); a parent's own material still tests every word. Single-question practice of a saved question is timed and checked one at a time (`review`, then `remediation_offer → choice → retry_ready → retry`). The parent-decision and remediation actions only exist for single-question practice.
  - `features/fill/useFillFlow.ts`: handwriting dictation (默寫), whole lesson and single-cell practice. It composes `useFillSession`, `useFillCanvas`, `useFillDraft` and `useFillProgress`.
  - `fillLayout(lesson)` maps the title column (shown rightmost) to stored cell order.
- Flows receive `clearNotices`, `continueReview` and `stopReview` from the coordinator instead of reaching into each other.
- 集章卡 (`features/rewards/`) is off until a parent finishes the three-step guide in 更多 → 集章卡.
  - `stamp-book.ts` holds the rules:
    - 1 stamp per finished practice: 聽寫 and 默寫 after the parent's check; 辨音 and math when done. Re-confirming the same 默寫 check that day stamps nothing (`oncePerDay`).
    - A 訂正之星 when a 需要補強 question is corrected: in single-question practice, or one per whole-lesson round.
    - A 鼓勵章 the parent sends with a note.
    - Stamps never depend on accuracy, are never taken away, and are never compared between children.
    - A daily cap (default 5) logs extra practice unstamped; the child only hears 今天好認真.
    - A full card lets the child pick one of the parent's rewards; extra stamps carry over.
    - 今天的任務: a parent sets up to 3 tasks for a child, either suggested from recent practice with questions marked 需要補強, or chosen from a list.
      - Choices are each lesson's 聽寫 or 默寫 (reviews only 聽寫), 辨音, 改對一題待補強, or a math lesson.
      - The practice whose `taskKey` (`taskKeys`) matches a task finishes it and earns a 任務章, which the daily cap never stops. A finished task stays visible until the end of the day.
      - The child sees the tasks in 國字注音 in a sheet (`TasksDialog`), with 去做 leading to the lesson. `daily-tasks.ts` builds the options; a unit test checks the zhuyin of every task word.
  - `useStampBook` lives in the coordinator.
    - `awardLessonStamp` names the lesson for the log; flows receive it like `recordSession`.
    - 辨音 and math call `awardStamp` directly.
    - Everything the child reads on the card, chip and toast is 國字注音 from `stamp-words.ts`, one reading per character. The suggested rewards are annotated too; a parent's own reward or child's name is shown as typed. A unit test checks each character against the font.
    - `StampNewsToast` shows at the app root. It says what was earned but not how full the card is; the card is the only place that shows that.
    - On the course list, one floating watercolor button (`RewardDock`) takes no room from the lessons.
      - It opens a menu with 今天的任務 and 集章卡, each opening its own sheet. A coral dot marks a waiting task or a full card.
      - It can be dragged. On release it settles against the nearer side, and the place is remembered per device in `kid-reward-dock-v1`.
      - Its picture is `draggable={false}`, since a native image drag would cancel the pointer.
    - `RewardsPanel` holds the guide, 今天的任務, 鼓勵章, log and settings.
  - Google sign-in and cloud sync were discussed but are not built. They would change the hard constraints above.
- `features/math/` is self-contained.
  - The course list's 國語｜數學 switch (not 注音, which would clash with the 注音 symbol-chart tab) is remembered per child (`ChildProfile.subject`).
  - `mathCourse` in `math-lessons.ts` is the textbook's contents (康軒 一上 and 一下), in its order. A lesson not built yet is a `ComingLesson`: listed as 製作中 under 上學期 or 下學期, never opened. `mathLessons` is the built ones.
    - A lesson's `id` is permanent: saved rounds, records and tasks name it. The child sees the list position and `number`; the course card's station shows the position, not the id.
    - Id 3 has always been 加法, now 第七課 10以內的加法, so 第三課 排順序、比多少 is id 7. Other lessons use the id of their place (第四課 分與合 is 4, and so on); 下學期 is 10–18.
    - `practice: "tap"` lessons (第二、三課) run in `CompareLesson`; `"write"` lessons (第一、四、七課) in `WritingLesson`.
    - Each built lesson's `parts` are the textbook's sections, which its round practises in order and the header names (`sectionOf`).
    - 第六課 30以內的數 will need 比大小 with numbers up to 30; the user moved 比大小 there from 第三課.
  - Math is drawn like 國語 so the two subjects feel like one site:
    - `MathCourseList` uses the 注音 journey cards, with each lesson's watercolor picture (`MathLesson.art`).
    - `openMathLesson` sets `mathLessonId` and opens the `math-lesson` view. `MathLessonPage` is a 國語 lesson page inside the app shell: the heading over the picture, a 開始練習 mode card (plus 繼續上次的練習 when a round is saved, which turns the other card into 從頭開始), and 這一課's parts.
    - `startMathPractice` records `mathStart` and opens the full-screen `math` view; the round starts at once and reads its first question. 返回 and the back gesture go to the lesson page.
    - The practice screens use 聽寫's watercolor paper and header (`MathHeader`), the prompt sits on a washed card, and a round ends on `MathResult`, drawn like 辨音's finished card.
    - Every word on the cards and the lesson page is 國字注音 from `mathWordReadings` in `math-lessons.ts`; a unit test checks it against the font.
  - 第一課 10以內的數 asks 9, all spoken aloud: 數一數 twice for 認識 1～5 and twice for 6～10 (tap pictures to mark them, write the number), 認識 0 with an empty basket, then 4 畫圈圈 for 表示數量.
  - Circles are always drawn in a 十格框 (5 × 2 cells, one circle each, `DrawFrame`/`TenFrame` in `MathInk.tsx`):
    - Every cell is its own square canvas, because a non-square canvas would stretch the strokes. One `useInkCanvas` serves them all, so only one pen draws at a time.
    - Filled cells are numbered in reading order. Each frame has its own tools:
      - The eraser takes away the one circle tapped next, then the pen is back; tapping an empty cell just draws. 復原 brings an erased circle back first.
      - 復原 takes back the latest circle in that frame, and 清空 clears it.
    - Circles are compared with the number asked in reading order (`frameMarks`).
      - While drawing, each extra circle gets a red box, the tool bar says 多畫了 N 個 in 國字注音 on its left (so the frame never moves), and 復原 glows.
      - Too few is not shown to the child; the parent chose that. The parent's check shows extra circles in red boxes and missing ones as red dashed circles in the next empty cells, and says 多畫/少畫 N 格.
    - The cells are saved in `MathRound.work`. Free drawings saved before the frame are dropped, and old ink still shows on the parent's check.
  - 第四課 分與合 (id 4) reads a 分合圖 (`MathBond.tsx`), the total on top joined by two lines to its parts.
    - A round has 8 questions: 3 分一分 (the total, 3–9, and one part given; write the other), 2 合一合 (both parts, up to 5, given; write the total on top), then 10的分與合: 分一分, 合一合 and 分分看 (write any two numbers that make 10).
    - Given numbers sit on washed cards. Each number to write is a square with its own ink tools, placed away from the lines: above the total, below a part.
    - One answer is kept in the question's ink. 分分看's two numbers are its two `work` cells, and it counts as answered only with both.
    - Markable pictures beside the 分合圖 help the child split or join.
    - The parent's check shows a small 分合圖 with what the child wrote. For 分分看, any two numbers that make the total are right.
  - 第七課 10以內的加法 (id 3) asks 8: 3 合起來是多少 (two groups of up to 5 markable pictures; write the total), 2 0的加法 (a number and 0, then 0 and a number), then 3 加加看.
    - 0的加法 and 加加看 draw in a 十格框 for each number (cells 0–9 and 10–19), then write in an answer square (canvas 20). The 0's frame stays empty, and a circle there is extra. Each frame numbers its own circles; counting them together is the child's part. Tablets put the two frames side by side with ＝ and the answer below, landscape tablets in one row, and phones stack them.
    - Only 0的加法 may have a 0 part (`validParts`).
  - Each question has its own clip (`split-…`, `combine-…`, `ways-10`, `join-a-b`, `add-a-b`, `add-3-0`). Counting says 兩個, but a sum says 二加三 and 三加零.
  - Questions say 和 (ㄏㄢˋ) and 合在一起. The fonts now also show 來 as ˙ㄌㄞ (for the section 合起來是多少), so a prompt could say 合起來, though no clip does yet.
  - 第一、四、七課 share `WritingLesson` in `MathScreen.tsx`. The ink pieces live in `MathInk.tsx` and the pictures in `MathPictures.tsx`.
  - The parent checks the round at the end.
    - Each lesson's unfinished round persists per child: lesson 1 in `kid-math-round-v1`, others in `kid-math-round-v1-<lesson>` (`mathRoundStorageKey`). Starting one lesson never replaces another's.
    - The circles live in `MathRound.work`. Finished rounds go to `kid-math-records-v1`.
  - Every instruction is spoken and shown in 國字注音 (`MathPrompt` in `MathChrome.tsx`: an icon-only replay button and `AnnotatedText`).
    - `mathPromptReadings` in `math-audio.ts` gives one syllable per character. The polyphones the font would misread (數一數, 箱子／兔子, 曲線, 蘿蔔, 和 as ㄏㄢˋ, 合起來's ˙ㄌㄞ) get `\u{E01E1}` from `alternateReadings` in `features/lesson/reading-variants.ts`, the one table every 國字注音 sentence written for children uses.
    - A unit test checks every character against `KidLessonYoSans-readings.json`.
    - A sentence the font could not annotate was reworded: 寫下來 needed ˙ㄌㄞ, so the prompt says 用筆寫出數字. `scripts/build-yo-fonts.py` can now add such a reading (`EXTRA_READINGS`).
  - 第二、三課 are tapped, in one lazy chunk: `CompareLesson.tsx` with `styles/lazy/math-compare.css`.
    - Answers are taps, checked at once and retried until right, like 辨音. 「點三個」 takes its taps in any order (`inAnyOrder`); 從小到大 takes them in order.
    - A round is not saved mid-round. What took more than one try goes to `kid-math-records-v1` and the result screen.
  - 第二課 比長短: `compare-round.ts` builds the round and holds the rules.
    - A round has 7 questions in textbook order: 比長短 lined up, then out of line; 比高矮 on the ground, then one child on a box; 比厚薄 (two books on a shelf, the same height); 直線和曲線, then 哪條路最近, which the textbook teaches with 直線和曲線.
    - Things out of line must be dragged to the start line or the ground first (a tap slides them there). Only then is the question asked.
    - Out of line, the shorter one always looks longer or taller, so skipping the lining-up step gives the wrong answer.
  - 第三課 排順序、比多少 (id 7): `sequence-round.ts` builds the round, and `SequenceViews.tsx` draws it. A round has 8 questions in the textbook's sections:
    - 排數字: tap the number missing from the middle of five in order (up or down); the other cards are numbers not on show. Then tap five numbers from the smallest up; each tap takes its place in a row below.
    - 排在第幾個, from the left and then the right: tap the picture at that place in a row of 6 or 7 different ones. The end to count from is marked, and the first and last places are never asked.
    - 第幾個和幾個: in a row of seven of the same picture, 「點三個」 (the first three, in any order), then 「點第三個」 with the same number.
    - 比多少, more then fewer: two rows matched one to one, plus 一樣多, which comes up about every other round.
- `PracticeList`, `SettingsScreen`, `SymbolChart`, and their heavy sub-panels are `React.lazy` chunks. Keep them out of the initial bundle.
- One `<audio>` element is mounted at the app root for every screen, so iOS keeps the playback a tap unlocked.
- Answer zhuyin (`ZhuyinStack`) is drawn by the `KidLessonYoOnly` font, which puts each syllable on a Han character (`syllableGlyphs` in `features/lesson/zhuyin-glyphs.ts`; ㄏㄨˊ is 蝴). Until that font has loaded (`lib/loading/font-ready.ts`), the syllable is spelled out in the UI font so a stand-in character never shows. A polyphone needs its variation selector there (`"奶\u{E01E1}"` for ˙ㄋㄞ); `tests/unit/zhuyin-glyphs.test.ts` fails if a glyph is missing from the subset or shows another reading.
- The system back gesture stays inside the app (`features/navigation/useBackGesture.ts`): one history guard entry absorbs each back and runs `goBack` in `usePracticeApp`, the same step as each screen's back button. On the home screen an installed app stays open; a browser tab leaves as usual.
- Pull-to-refresh is off (`overscroll-behavior-y: none` on the root).
- Auto-update without a service worker (`lib/loading/app-update.ts` holds the shared status; `useAppUpdate.ts` schedules the checks).
  - Each build compiles `__APP_BUILD__` (the commit SHA in CI) and `__APP_BUILD_DATE__` (Taipei date), and publishes the same build as `version.json`; `check-build.mjs` verifies they match.
  - The app fetches `version.json` uncached on open, when it returns from the background, and every 30 minutes.
  - A newer build loads via `location.replace("?v=<build>")`, only on the course list. The query skips cached pages and prevents a reload loop.
  - On other screens (not the 默寫 sheet or a listening round) `UpdateReminder` offers 現在更新. 更多 → 版本 shows the version, 版次 (build id and date), whether the app was opened from the home screen, and buttons to check and update.
- The shown version is `package.json` `version`. When releasing user-visible changes, bump it and add a matching first entry to `siteReleaseNotes` in `features/courses/course-data.ts`; a unit test fails if they differ.
- Confirmation modals use `components/ConfirmDialog`. Panels put a back button in the header with `HeaderBack`, which renders into the `HeaderBackSlot` context.

Layout: `features/<feature>/` holds feature UI and logic, `components/` holds shared UI (`PageHeading`, `ShowMsg`, `ReviewActions`, `Zhuyin`, `InkTools`, `ConfirmDialog`), and `lib/` holds infrastructure (ink, audio, storage, loading).

### Content and identity

- Live lesson text and teacher-circled vocabulary live in `features/courses/course-data.ts` and `circled-vocabulary.ts`. Each circled item is one word, never a sentence: sentences the parent typed were only the source for those words (readings sliced from the sentence), and the sentences themselves moved to `legacy-content.ts` (`legacyCircledVocabulary`, `legacyReviewVocabulary`) so old saved questions resolve. When you edit them, re-verify the zhuyin, IVS glyphs, and audio, then run `npm run assets:audio-registry`.
- `features/courses/legacy-content.ts` is frozen. It holds the first question bank, removed word questions, v1 question indexes and old circled vocabulary, kept only so old saved records resolve. New rounds never draw from it. Add to it; never edit it.
- Question IDs have the form `類別:朗讀文字`.
- `lesson-characters.ts` lists each lesson's and review's 生字. Each one practises one of that lesson's own symbols or combined rhymes and uses only symbols and combined rhymes taught by then, with its reading from a circled word. Where fewer than 4 circled characters use the lesson's symbols (第四課, 第八課), the other circled characters a child can already write are added. It leaves out neutral tones, 一 and 不, characters read two ways in the course, and characters whose usual standalone reading differs, since a single-character clip says the usual reading. A unit test checks each rule and the clip.
- Review 1, 2, and 3 cover lessons 1–3, 4–6, and 7–9, and are listening-only.
- **Lesson indexes are permanent identities** (`features/courses/lesson-identity.ts`):
  - built-in lessons 0–8;
  - reviews use negative indexes;
  - custom lessons start at 9 and only grow;
  - a 10th or later built-in lesson uses `builtinLessonIndex(position)`, which is ≥ 1,000,000.
  - Use `isCustomLessonIndex`; never compare against 9.
  - A unit test fails if a built-in lesson is missing its readings, vocabulary, artwork or numeral.
- Renaming, reordering, or archiving a material keeps its identity. Editing its content creates a new index and archives the old version, so old ink never attaches to new answers.

### Persistence

- All user data lives in browser `localStorage` behind `lib/storage/persistent-store.ts` (an external store read with `useSyncExternalStore`, not mirrored into React state). Older versions (for example `practice-state` v1–v3) are migrated forward on read, and their original keys are preserved.
- **Every key is listed in `lib/storage/storage-keys.ts`**, the single registry that device backup (`ownsStorageKey`) is derived from. A new key must be added there, or backup will silently skip it; a unit test checks the known keys.
- **Children** (`lib/storage/child-profiles.ts`, key `zhuyin-children-v1`; managed in 更多 → 孩子) have separate records:
  - Child-scoped keys (`childScopedKeys`) are practice state, fill favorites, the listening round, the free board, the math rounds and records, the stamp book (`kid-stamps-v1`) and fill drafts. Everything else (materials, listening settings, recordings, 集章卡 settings `kid-reward-settings-v1`, the floating button's place `kid-reward-dock-v1`) is shared.
  - Per-lesson keys (fill drafts, math rounds after lesson 1) are recognized by `isLessonRecordKey`. Both backup and removing a child use it.
  - Which material is open belongs to each child: `ChildProfile.materialId`, applied by `withChildMaterial` in `useMaterials`. Choosing a material records it on the child; only the first child's choice also moves the family default that children without a choice follow.
  - The first child, id `main`, uses the original keys, so existing records need no migration and only `main` reads the pre-v4 practice keys. Every other child uses `<key>@<id>`.
  - Read and write them through `childKey()` or `activeChildId()`, never the bare constant.
  - Removing a child deletes only `childRecordKeys(id)`. Device backup includes every child.
  - A session-storage flag (`childChosenSessionKey`) stops a reload in the same session from asking again.
- GitHub Pages gives all of the owner's sites one origin, so never read or clear keys you don't own. The localStorage quota is shared too.
- Read paths are lenient: they migrate old shapes, and a corrected built-in reading moves a fill favorite to the new zhuyin rather than dropping it.
- Device backup restores the saved text exactly; validators only describe the file in the preview, including a count of values this version cannot read. Restore rejects only unknown keys, non-string or oversized values, and invalid recordings. Its UI makes downloading the current data a separate step before restore reloads the page.
- Only stores created with `protectUnreadData` (currently materials) refuse to overwrite a value they failed to read; the others overwrite it on the next write. On write failure the store keeps the in-memory state and shows a notice.
- Custom recordings live in IndexedDB (`zhuyin-custom-audio-v1`), stored as raw ArrayBuffer bytes rather than Blobs to work around a WebKit Blob-storage bug.
  - Their identity is the full text plus zhuyin, including tones and `|` syllable separators.
  - Playback only reads the keys (`getAllKeys`); the full list loads when the recording manager opens.
  - Trimmed takes are re-encoded as 22.05 kHz mono WAV.
- A whole-lesson listening round is saved as it goes in `zhuyin-listening-round-v1` (`features/listening/listening-round-storage.ts`): question order, position, every answer and batch-review marks, one round at a time.
  - Within 12 h of saving, start-up reopens it directly with a 繼續聽寫 / 重新開始 prompt; older rounds prompt when that lesson's listening opens.
  - Finishing the check, 結束本輪 or 重新開始 clears it. Single-question practice is not saved.
- Fill drafts persist, with one write per change through `useFillDraft`'s effect.

### Ink (tuned for a capacitive stylus on a tablet)

- Fill and listening canvases share `lib/ink/useInkCanvas` and store paths in 0–100 coordinates rounded to 0.01.
- The free board stores CSS-pixel coordinates rounded to 0.1 on a fixed 138px/14px grid.
- Only one pointer draws at a time (`PointerLease`). A second touch must not continue the first stroke.
- A capacitive stylus reports `pointerType: "touch"`, so `isPalmContact` (in `lib/ink/gesture.ts`) judges a resting hand by contact size alone. The exact rule and threshold are documented there; they are untuned on the real tablet. Devices that report 1 × 1 are never rejected.
  - A palm-sized touch never starts a stroke.
  - Writing cells keep ink already accepted and ignore later palm-sized samples of that touch.
  - The free board drops a stroke whose contact spreads to palm size.
- `pointerSamples` feeds every coalesced pointer event into the stroke.
- New writing-cell strokes store a per-point `width` (same 0–100 units) from `lib/ink/ink-brush.ts`. Width comes from writing speed for touch and passive capacitive pens, and from real pressure for active pens. Old x/y-only ink stays valid.
- The canvas and review thumbnails (`InkPreview`) draw the same `inkOutline`, and lasso erase interpolates widths.
- If pointer capture fails, a window-level `pointerup` or `pointercancel` ends the stroke.
- A passive pen that loses the screen for a moment arrives as a lift and a new touch. A touch within 120 ms, near where the pen was heading (`resumesContact` in `lib/ink/gesture.ts`), continues the same stroke in writing cells and on the free board; one undo removes the whole stroke (`InkHistory.amend`). A system `pointercancel`, an eraser lasso, a palm-cut stroke or a mouse never rejoins.
- `lib/ink/ink-diagnostics.ts` counts rejoins, system cancels, palm cuts and ignored second touches since the app opened; 更多 → 版本 shows them so a parent can report what the real tablet does.
- Long strokes are capped at about 1900 samples, and redraws are batched per animation frame.
- The free board draws only new segments while writing, repaints fully when a stroke ends, and writes localStorage 600 ms after the last stroke and on `pagehide`/hidden.
- An interruption (blur, hidden, rotation, lock) keeps the stroke in progress, but never completes an eraser lasso.

### Audio

- The 37 basic symbols use Ministry of Education recordings at normal speed. The 22 combined rhymes, lesson readings and words in `gemini/words/` use static Gemini audio. Most other characters and words use older synthesized files.
- `lib/audio/audio-index.json` maps text to `[readings, version, folder]`; the folder is `""`, `"gemini/rhymes/"` or `"gemini/words/"`.
- The listening "聲音準備中" overlay is delayed (`LoadingOverlay delayed`): hidden and click-through for 0.7 s, so a replay or cached clip never flashes over the page or blocks writing.
- Reference audio with page-relative URLs (see Build and deploy).
- Never borrow audio recorded with a different tone for a known reading.
- A custom recording that is known to exist but fails to load is an error and must not fall back to another voice. If the recording database cannot be opened at all, lookups resolve to "none" (retried after 30 s), so official clips keep playing.
- Callers that pass `onError` to `speak` show their own message; no page-wide notice is added.
- Preloading is cancellable: at most 2 concurrent requests, each with an 8 s timeout. The symbol chart warms only the buttons it shows.

### Styles

- `app/globals.css` imports `styles/00-…css` through `styles/28-…css` in a fixed cascade order. Order matters. `26-children.css` styles the child picker, the course-list greeting and 更多 → 孩子; `27-math.css` the subject switch, the math lesson page and the math screen (landscape tablets put the square on the right; 畫圈圈算加法 keeps its three squares in one row, and phones wrap the answer below); `28-rewards.css` the 集章卡 chip, card, toast and settings.
- `00-reset.css` is the former Tailwind preflight, kept in cascade layers so every unlayered rule wins. There is no Tailwind and there are no utility classes.
- `24-fill-tablet.css` makes dictation (sheet, writing cell, review) full width at ≥ 600px: the square grows to the space left by the header and controls, and landscape tablets put the heading and finish button beside it. Phones keep the 480px column.
- `25-listen-tablet.css` does the same for listening at ≥ 600px: the single square fills the width, a word's squares stack top to bottom with their tools beside them (side by side, first character on the right, in landscape), and the batch check shows two cards per row.
- `styles/lazy/` holds feature CSS loaded by the feature's `lazy()` import, after every eager stylesheet. Keep only selectors scoped to that feature there.
- Put new rules in the matching feature file. Shared fonts, size tokens, and tap-target sizes live in `00-foundation.css`. Don't add a parallel font system or override root styles ad hoc.

## Verification conventions

- Release bar: `npm run check`, `npm run format:check`, `npm run build`, and all Playwright projects. The primary device is an Android tablet with a capacitive stylus (reported as `pointerType: "touch"`), so check tablet portrait (800px) and landscape (1280px) first, then 320px and 390px, for horizontal overflow and page errors.
- QA screenshots and measurements go in the git-ignored `outputs/`.
- Record structural-change evidence in `docs/structure-improvements.md`. Visual design QA write-ups follow the format of `design-qa.md`.
- Simulated pointers do not count as validation on real hardware (Redmi tablet with a capacitive stylus). Don't claim they do.
- Dependency advisories are tracked in `docs/security-maintenance.md`. Don't run `npm audit fix --force` or do framework major upgrades as a side task.
