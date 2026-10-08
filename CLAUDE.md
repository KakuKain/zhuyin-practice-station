# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A login-free Zhuyin (注音) practice site for Taiwanese first graders and their parents: lessons 1–9 plus three review sets, a symbol chart, handwriting dictation, listening dictation, and sound discrimination. UI copy and all docs are in Traditional Chinese (zh-Hant). `docs/architecture.md` is the detailed reference for feature boundaries and invariants. Read it before changing state, storage, audio, or ink behavior.

Hard product constraints: no login, no DB, no cloud sync, no PWA, no runtime AI or speech API calls, and no changes to the teacher-defined lesson scope.

## Commands

Node 24 (CI version; minimum 22.13) with npm.

```sh
npm ci
npm run dev                    # vinext dev server (Next App Router on Vite + Cloudflare plugin)
npm run check                  # eslint --max-warnings 0, tsc --noEmit, unit tests (the CI gate)
npm test                       # unit tests + vinext build + Worker SSR render test
npm run test:e2e               # vinext build, then Playwright (android-chromium, iphone-webkit, desktop-chromium)
npm run build:pages            # production GitHub Pages build -> dist-pages/, then scripts/check-pages-build.mjs
npm run preview:pages          # serves /zhuyin-practice-station/
npm run format                 # prettier (printWidth 100)
```

Single tests:

```sh
npx tsx --test tests/unit/materials.test.ts
npx tsx --test --test-name-pattern "lesson pages" tests/unit/audit-regressions.test.ts
npx playwright test tests/e2e/symbols.spec.ts --project=desktop-chromium -g "<title regex>"
```

Playwright's default web server is `npm run start` on port 4173, which serves `dist/`, so run `npm run build` first. Locally it reuses any server already running on that port. `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_WEB_SERVER_COMMAND` override this; the Pages workflow uses them to test the `preview:pages` build on port 4185.

Asset pipelines:

- After adding or replacing any audio file, run `npm run assets:audio-registry`. It rewrites `public/listening-audio/registry.json` and `lib/audio/audio-index.json` with hashes, durations, and cache-busting URLs.
- `npm run assets:artwork` generates lossless WebP files in `public/course-art/` from the PNG originals in `assets/artwork/`.
- `python3 scripts/build-yo-fonts.py` rebuilds the lesson font subsets after you add characters or IVS glyphs. `scripts/build-fonts.py` rebuilds the full fonts. Both need fontTools and brotli.

## Two build targets for the same app

Both targets render the same `components/PracticeApp.tsx` client component:

1. **GitHub Pages (production).** `index.html` → `tooling/pages/main.tsx` → `createRoot(...).render(<PracticeApp />)`. This is a plain Vite SPA built with `vite.pages.config.ts`. A pre-transform (`tooling/pages/public-assets.ts`) rewrites string literals that start with `/course-art/`, `/fonts/`, or `/listening-audio/` in `.ts`, `.tsx`, and `.json` sources so they carry the Pages base path. `check-pages-build.mjs` fails the build if any unprefixed URL survives or if a `public/` file is missing from `dist-pages/`.
   - Reference public assets as literal absolute paths under those three folders.
   - If you add a new top-level `public/` folder, add it to the regex in both files.
   - `PAGES_BASE_PATH=/` builds for a root or custom domain.
   - A push to `main` deploys through `.github/workflows/pages.yml`, but only after check, the Pages build, and Playwright all pass.
2. **Legacy Sites/Cloudflare build.** `npm run build` uses vinext with `app/` (App Router), `worker/index.ts`, and `tooling/build/sites-vite-plugin.ts` (packages `.openai/hosting.json`). It is kept for compatibility. `tests/rendered-html.test.mjs` imports `dist/server/index.js` and asserts on the server-rendered HTML of the course list, so text changes on the home page can break that test.

`examples/` (inactive D1/auth samples) is excluded from lint, typecheck, and both builds.

## Architecture

**There are no routes; this is a single-page state machine.** `app/page.tsx` and the Pages entry both render only `<PracticeApp />`. The screen is selected by the `View` union in `features/types.ts`. `features/usePracticeApp.ts` is the cross-feature coordinator and keeps a legacy controller interface for components. Each flow owns its own state:

- `useFillSession`: handwriting dictation (默寫)
- `useListeningSession`, `useListeningRound`, `useListeningPlayback`: listening dictation (聽寫), covering full-round drafting, batch review, replay, and timers
- `useNavigationSession`: navigation, leave guards, focus, and scroll

`PracticeList`, `SettingsScreen`, `SymbolChart`, and their heavy sub-panels are `React.lazy` chunks. Keep them out of the initial bundle. `PracticeApp` uses a `useSyncExternalStore` hydration flag so SSR and the first client render match.

Layout: `features/<feature>/` holds feature UI and logic, `components/` holds shared UI (`PageHeading`, `ShowMsg`, `ReviewActions`, `Zhuyin`, `InkTools`), and `lib/` holds infrastructure (ink, audio, storage, loading).

### Content and identity

- Lesson text and teacher-circled vocabulary live in `features/courses/course-data.ts` and `circled-vocabulary.ts`. When you edit them, re-verify the zhuyin, IVS glyphs, and audio.
- Question IDs have the form `類別:朗讀文字`.
- Review 1, 2, and 3 cover lessons 1–3, 4–6, and 7–9, and are listening-only.
- Renaming, reordering, or archiving a material keeps its identity. Editing its content creates a new index and archives the old version, so old ink never attaches to new answers.

### Persistence

- All user data lives in browser `localStorage` behind `lib/storage/persistent-store.ts` (an external store read with `useSyncExternalStore`, not mirrored into React state). Keys are versioned `zhuyin-*`, except the free board's `kid-free-dictation-v1`. Old versions (for example `practice-state` v1–v3) are migrated forward with their original keys preserved.
- Only stores created with `protectUnreadData` (currently materials) refuse to overwrite a value they failed to read; the others overwrite it on the next write. On write failure the store keeps the in-memory state and shows a notice.
- **Full device backup (`lib/storage/device-backup.ts`) only exports and restores keys matched by the `ownsStorageKey` allowlist regex.** Any new storage key must be added there and validated, or it will be silently left out of backups.
- Custom recordings live in IndexedDB (`zhuyin-custom-audio-v1`), stored as raw ArrayBuffer bytes rather than Blobs to work around a WebKit Blob-storage bug. Their identity is the full text plus zhuyin, including tones and `|` syllable separators.
- An unfinished listening round lives in memory only. Fill drafts persist.

### Ink

- Fill and listening canvases share `lib/ink/useInkCanvas` and store paths in 0–100 coordinates.
- The free board stores CSS-pixel coordinates on a fixed 138px/14px grid.
- Only one pointer draws at a time (`PointerLease`). A second touch must not continue the first stroke.
- Long strokes are capped at about 1900 samples, and redraws are batched per animation frame.

### Audio

- The 37 basic symbols use Ministry of Education recordings at normal speed.
- The 22 combined rhymes and lesson readings use static Gemini audio. Most other characters and words use older synthesized files.
- Never borrow audio recorded with a different tone for a known reading.
- A failed custom recording must not fall back to synthesized speech.
- Preloading is cancellable: at most 2 concurrent requests, each with an 8 s timeout.

### Styles

`app/globals.css` imports `styles/00-…css` through `styles/23-…css` in a fixed cascade order, and Tailwind v4 comes first. Order matters. Put new rules in the matching feature file. Shared fonts, size tokens, and tap-target sizes live in `00-foundation.css`. Don't add a parallel font system or override root styles ad hoc.

## Verification conventions

- Release bar: `npm run check`, build, the SSR render test, and all three Playwright projects. For UI changes, also check 320px, 390px, and 1280px widths for horizontal overflow and page errors.
- QA screenshots and measurements go in the git-ignored `outputs/`.
- Record structural-change evidence in `docs/structure-improvements.md`. Visual design QA write-ups follow the format of `design-qa.md`.
- Simulated pointers do not count as validation on real hardware (Redmi tablet with a capacitive stylus). Don't claim they do.
- Dependency advisories are tracked in `docs/security-maintenance.md`. Don't run `npm audit fix --force` or do framework major upgrades as a side task.
