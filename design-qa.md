# 聽寫開始按鈕 Design QA — 2026-10-01

Scope: only the central start button's artwork and interaction. Preserve existing background, lesson art, typography, layout, summary, and normal-speed audio. The lower CTA in the reference is intentionally omitted per the user's earlier instruction.

source visual truth path: `docs/visual-qa/listening-button-reference.png` (copied from the user attachment `/var/folders/l7/tdmqctxx3_d7fmvk0h6n4r180000gn/T/codex-clipboard-677699bc-e308-4879-9d5b-aded08587f6b.png`)

implementation screenshot path: `docs/visual-qa/listening-button-mobile.png`

viewport: 390 × 844 CSS px; additional checks at 320 × 568 and 1440 × 1000, using Codex In-app Browser.

Density normalization: source 853 × 1844 pixels normalized to 390 × 844 for the full-view comparison; implementation 390 × 844 pixels (1 screenshot pixel per CSS px). Source button crop 425 × 425 and implementation crop 230 × 230 both normalized to 300 × 300, allowing artwork comparison independently of the intentionally retained touch-target size.

state: 第一課「貓咪」→ 第二關聽寫 → 準備聽寫 → 第 1 小題 / 4; playback 2 times, interval 8 seconds, answer time 30 seconds; before activation.

## Findings

No actionable P0/P1/P2 findings remain within the scoped button change.

- [Resolved P1] Inherited grid columns shrank the artwork into a 44 px column. Evidence: `docs/visual-qa/listening-button-initial-mobile.png`. Fix: block button, full-width/full-height image, zero padding, no CSS border/background. Post-fix button and image are both 230 × 230 CSS px.
- [Expected] The reference's second lower CTA, slower-audio wording, different cat scale, and page spacing are deliberately not copied. User preferences require one central button, normal-speed audio, and a reusable background; adjacent content is outside this change.
- [P3] Generated pigment/grain is slightly stronger than the reference. The asset follows the same blue rim, warm ivory paper, and rounded triangle art direction; it is not a pixel-identical extraction.

## Full-view comparison evidence

`docs/visual-qa/listening-button-comparison-full.png` places the normalized reference and rendered mobile implementation together. The circular control retains its central position and existing 230 px hit target; removing inner text allows the triangle to be larger and optically centered. Existing background and summary are unchanged; the lower duplicate CTA is absent.

## Focused region comparison evidence

`docs/visual-qa/listening-button-comparison-focused.png` places both button crops together at equal dimensions. A hand-painted blue rim, warm paper center, and large rounded triangle replace the small geometric icon. Transparent corners blend into the landscape without an opaque box. Runtime artwork: 640 × 640 RGBA lossless WebP, 322,528 bytes, sufficient for the 282 CSS px maximum button at 2x density.

## Required fidelity surfaces

- Fonts/typography: existing project fonts and surrounding text hierarchy retained. The button has only play artwork; accessible name remains「開始聽」.
- Spacing/layout rhythm: central placement and 230–282 px button retained; short screens use 184 px. No horizontal overflow at 320 px. The summary is vertically scrollable on short screens; the primary button remains fully visible. Desktop shows the centered app shell and full control.
- Colors/tokens: watercolor light blue, ivory paper, and blue triangle follow the reference palette. Keyboard focus is a 3 px dark-blue outline. Minor pigment variation is recorded as P3.
- Image quality/asset fidelity: real transparent artwork generated with built-in Image Gen, not CSS/div/handcrafted SVG. Original: `assets/artwork/listening-play-button-watercolor-v1.png`. Exact prompt and provenance: `assets/artwork/listening-play-button-watercolor-v1.md`. Runtime: `public/course-art/listening-play-button-watercolor-v1.webp`. Optimizer reproduces the 640 px output and preserves alpha. No new background or baked-in cat was generated.
- Copy/content: no screenshot text baked into the asset. Accessible name「開始聽」and existing pause-after-playback guidance retained; no slow-play claim or second CTA.

## Comparison history

1. Before: `docs/visual-qa/listening-button-before-mobile.png` shows old CSS ring, small icon, and text inside the circle.
2. First implementation: `docs/visual-qa/listening-button-initial-mobile.png` exposed the P1 inherited-grid sizing issue; result blocked.
3. Fixed: `docs/visual-qa/listening-button-mobile.png` and the two combined comparisons confirm full-size artwork and a prominent rounded play triangle. Scoped QA passed with only the recorded P3 variation.
4. Responsive evidence: `docs/visual-qa/listening-button-small-mobile.png` (320 × 568) and `docs/visual-qa/listening-button-desktop.png` (1440 × 1000). Keyboard: `docs/visual-qa/listening-button-keyboard-focus.png`.

## Interactions and verification

- Exactly one ready-state button named「開始聽」.
- Tab reaches the button with a visible focus outline; Enter starts the countdown and handwriting canvas.
- Audio playback rate verified as 1; exit confirmation pauses the session and returns to the lesson.
- Native browser error/warning log empty after ready-screen and activation checks.
- Lint (zero warnings), TypeScript, 8 unit tests, production build, and server-rendered HTML test passed.
- Regression test extended for one control, loaded 640 px image, full control coverage, keyboard activation, and normal-speed audio. Chromium/WebKit regressions run in existing GitHub CI; no separate Playwright CLI browser used for visual QA.

## Implementation checklist

- [x] Match central watercolor button art direction.
- [x] Retain one semantic, touch-friendly, keyboard-operable button.
- [x] Add hover/press feedback; respect reduced-motion preferences.
- [x] Preserve background, lesson art, layout, and audio speed.
- [x] Compare source and implementation together, fix sizing, and recapture.
- [x] Verify mobile, short viewport, desktop, keyboard activation, and playback.

final result: passed
