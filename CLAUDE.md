# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A login-free Zhuyin (注音) practice site for Taiwanese first graders and their parents: lessons 1–9 plus three review sets, a symbol chart, handwriting dictation, listening dictation, and sound discrimination. UI copy and all docs are in Traditional Chinese (zh-Hant). `docs/architecture.md` is the detailed reference for feature boundaries and invariants. Read it before changing state, storage, audio, or ink behavior.

Hard product constraints: no login, no DB, no cloud sync, no PWA, no runtime AI or speech API calls, and no changes to the teacher-defined lesson scope.

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
- `python3 scripts/build-yo-fonts.py` rebuilds the lesson font subsets after you add characters or IVS glyphs. `scripts/build-fonts.py` rebuilds the full fonts. Both need fontTools and brotli.

## Build and deploy

There is one build: a static Vite SPA. `index.html` → `app/main.tsx` → `createRoot(...).render(<PracticeApp />)`. Dev, tests and production all use `vite.config.ts` with the GitHub Pages base path `/zhuyin-practice-station/` (`PAGES_BASE_PATH=/` builds for a root or custom domain).

- **Reference `public/` files with page-relative paths** (`"course-art/cat.webp"`, `` `listening-audio/${name}.m4a` ``), never root-absolute ones (`"/course-art/…"`), which would skip the base path and 404 on Pages. `scripts/check-build.mjs` fails the build on a root-absolute literal, a CSS `url()` outside the base, or any `public/` file missing from `dist-pages/`. CSS may keep `url(/fonts/…)`; Vite adds the base there.
- A push to `main` deploys through `.github/workflows/pages.yml` only after check, format check, the build and all Playwright projects pass. Pull requests run the same gate in `.github/workflows/ci.yml`.
- The old Next/vinext/Cloudflare Worker build was removed; its last version is the git tag `legacy-sites-build`.

## Architecture

**There are no routes; this is a single-page state machine.** The entry renders only `<PracticeApp />`. The screen is selected by the `View` union in `features/types.ts`.

- `features/usePracticeApp.ts` is a thin coordinator. It owns the view and lesson, the shared stores, audio, and the course-review queue. It spreads each flow's API into one flat controller object, which components read through `Pick<AppController, …>`.
- **Each flow owns its own state and actions:**
  - `features/listening/useListeningFlow.ts`: listening dictation (聽寫). It composes `useListeningCanvas`, `useListeningPlayback` and `useListeningRound`. A whole-lesson round is untimed and checked at once (`ready → active → batch_review → result`). Single-question practice of a saved question is timed and checked one at a time (`review`, then `remediation_offer → choice → retry_ready → retry`). The parent-decision and remediation actions only exist for single-question practice.
  - `features/fill/useFillFlow.ts`: handwriting dictation (默寫), whole lesson and single-cell practice. It composes `useFillSession`, `useFillCanvas`, `useFillDraft` and `useFillProgress`.
  - `fillLayout(lesson)` maps the title column (shown rightmost) to stored cell order.
- Flows receive `clearNotices`, `continueReview` and `stopReview` from the coordinator instead of reaching into each other.
- `PracticeList`, `SettingsScreen`, `SymbolChart`, and their heavy sub-panels are `React.lazy` chunks. Keep them out of the initial bundle.
- One `<audio>` element is mounted at the app root for every screen, so iOS keeps the playback a tap unlocked.
- Confirmation modals use `components/ConfirmDialog`. Panels put a back button in the header with `HeaderBack`, which renders into the `HeaderBackSlot` context.

Layout: `features/<feature>/` holds feature UI and logic, `components/` holds shared UI (`PageHeading`, `ShowMsg`, `ReviewActions`, `Zhuyin`, `InkTools`, `ConfirmDialog`), and `lib/` holds infrastructure (ink, audio, storage, loading).

### Content and identity

- Live lesson text and teacher-circled vocabulary live in `features/courses/course-data.ts` and `circled-vocabulary.ts`. When you edit them, re-verify the zhuyin, IVS glyphs, and audio, then run `npm run assets:audio-registry`.
- `features/courses/legacy-content.ts` is frozen. It holds the first question bank, removed word questions, v1 question indexes and old circled vocabulary, kept only so old saved records resolve. New rounds never draw from it. Add to it; never edit it.
- Question IDs have the form `類別:朗讀文字`.
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
- GitHub Pages gives all of the owner's sites one origin, so never read or clear keys you don't own. The localStorage quota is shared too.
- Read paths are lenient: they migrate old shapes, and a corrected built-in reading moves a fill favorite to the new zhuyin rather than dropping it.
- Device backup restores the saved text exactly; validators only describe the file in the preview, including a count of values this version cannot read. Restore rejects only unknown keys, non-string or oversized values, and invalid recordings. Its UI makes downloading the current data a separate step before restore reloads the page.
- Only stores created with `protectUnreadData` (currently materials) refuse to overwrite a value they failed to read; the others overwrite it on the next write. On write failure the store keeps the in-memory state and shows a notice.
- Custom recordings live in IndexedDB (`zhuyin-custom-audio-v1`), stored as raw ArrayBuffer bytes rather than Blobs to work around a WebKit Blob-storage bug.
  - Their identity is the full text plus zhuyin, including tones and `|` syllable separators.
  - Playback only reads the keys (`getAllKeys`); the full list loads when the recording manager opens.
  - Trimmed takes are re-encoded as 22.05 kHz mono WAV.
- An unfinished listening round lives in memory only. Fill drafts persist, with one write per change through `useFillDraft`'s effect.

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
- Long strokes are capped at about 1900 samples, and redraws are batched per animation frame.
- The free board draws only new segments while writing, repaints fully when a stroke ends, and writes localStorage 600 ms after the last stroke and on `pagehide`/hidden.
- An interruption (blur, hidden, rotation, lock) keeps the stroke in progress, but never completes an eraser lasso.

### Audio

- The 37 basic symbols use Ministry of Education recordings at normal speed. The 22 combined rhymes and lesson readings use static Gemini audio. Most other characters and words use older synthesized files.
- Reference audio with page-relative URLs (see Build and deploy).
- Never borrow audio recorded with a different tone for a known reading.
- A custom recording that is known to exist but fails to load is an error and must not fall back to another voice. If the recording database cannot be opened at all, lookups resolve to "none" (retried after 30 s), so official clips keep playing.
- Callers that pass `onError` to `speak` show their own message; no page-wide notice is added.
- Preloading is cancellable: at most 2 concurrent requests, each with an 8 s timeout. The symbol chart warms only the buttons it shows.

### Styles

- `app/globals.css` imports `styles/00-…css` through `styles/23-…css` in a fixed cascade order. Order matters.
- `00-reset.css` is the former Tailwind preflight, kept in cascade layers so every unlayered rule wins. There is no Tailwind and there are no utility classes.
- `styles/lazy/` holds feature CSS loaded by the feature's `lazy()` import, after every eager stylesheet. Keep only selectors scoped to that feature there.
- Put new rules in the matching feature file. Shared fonts, size tokens, and tap-target sizes live in `00-foundation.css`. Don't add a parallel font system or override root styles ad hoc.

## Verification conventions

- Release bar: `npm run check`, `npm run format:check`, `npm run build`, and all Playwright projects. The primary device is an Android tablet with a capacitive stylus (reported as `pointerType: "touch"`), so check tablet portrait (800px) and landscape (1280px) first, then 320px and 390px, for horizontal overflow and page errors.
- QA screenshots and measurements go in the git-ignored `outputs/`.
- Record structural-change evidence in `docs/structure-improvements.md`. Visual design QA write-ups follow the format of `design-qa.md`.
- Simulated pointers do not count as validation on real hardware (Redmi tablet with a capacitive stylus). Don't claim they do.
- Dependency advisories are tracked in `docs/security-maintenance.md`. Don't run `npm audit fix --force` or do framework major upgrades as a side task.
