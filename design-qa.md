# 聽寫準備畫面 Design QA

source visual truth path: `/Users/kaoru/.codex/generated_images/01a0f21b-d2d2-78a2-a4c1-0503a3500033/exec-f882c9e9-ca83-49bc-8ede-744c443a162a.png`

implementation screenshot path: `inline native Chrome CUA capture from http://localhost:3001/` (the desktop display capture API could not persist a file; the rendered screenshot was captured and reviewed inline at 2774 × 1740 JPEG pixels)

viewport: implementation app shell `max-width: 480px`; source concept normalized from 853 × 1844 pixels to approximately 390 × 844 CSS pixels for comparison; browser chrome and surrounding desktop margins excluded from the visual judgment

state: 第一課「貓咪」→ 第二關聽寫 → 第一大題「注音符號」→ 準備聽寫；未播放、未作答

## Full-view comparison evidence

The source and rendered implementation share the same hierarchy: progress dots at the top, a large preparation title, short listening guidance, one large centered circular start control, watercolor garden art, and one three-column timing summary below. The background asset intentionally contains no cat; the existing lesson cat remains a separate transparent overlay so the background stays reusable and does not duplicate the character. The implementation is a responsive app shell rather than a fixed poster, so the screenshot includes the browser frame; comparison was made against the centered app content only.

## Focused region comparison evidence

The focused region was the central interaction stack: title, instruction copy, circular「開始聽」button, and summary cards. Accessibility capture confirmed exactly one ready-state button named「開始聽」and no second bottom CTA. A follow-up click entered the active listening state with the canvas, countdown, replay, and early-submit controls, then the flow was exited and returned to the ready state.

## Required fidelity surfaces

- Fonts and typography: the implementation preserves the project’s child-friendly Chinese font stack, enlarges「準備聽寫」to the requested readable scale, and keeps the supporting copy smaller without vertical wrapping.
- Spacing and layout rhythm: the ready card is now a single vertical flow; the central button is centered, the illustration sits behind/beside it, and the three summary cards remain aligned below it.
- Colors and visual tokens: the blue action ring, navy text, pale blue background, cream paper, and watercolor footer remain consistent with the selected third direction.
- Image quality and asset fidelity: the generated no-cat watercolor background is stored at `public/course-art/listening-ready-background-v1.webp`; the existing lesson cat remains an independent asset overlay, with no second background variant or duplicated character baked into the background.
- Copy and content: the secondary note now says the audio leaves a short pause after playback and no longer claims that 注音 audio is slowed.

## Findings

No actionable P0/P1/P2 findings remain. P3: the native Chrome capture includes browser chrome because the display capture API could not persist a content-only file; this does not affect the implementation content comparison.

## Comparison history

1. Initial implementation capture: P1 responsive layout drift. The legacy two-column `.focus-content` grid and row-oriented ready card caused the title and copy to collapse into narrow vertical columns on the wide browser preview. Fixes: corrected the responsive `calc()` width declarations and set `.listen-ready-card` to `flex-direction: column`.
2. Post-fix capture: the title, copy, button, artwork, and summaries render as one centered vertical composition. AX capture shows one and only one ready-state「開始聽」button. The flow was tested through the active listening state and returned to ready state; no further P0/P1/P2 issue was found.
3. Background fidelity correction: the cat was removed from the reusable watercolor background asset. A cache-busting version query was added so the preview cannot keep showing the previous cat-bearing background; the cat is rendered only by the existing transparent lesson-art overlay.

## Implementation checklist

- [x] Implement selected third direction.
- [x] Keep only the centered circular「開始聽」button.
- [x] Remove the lower duplicate start button.
- [x] Keep 注音 audio at normal playback rate and remove slow-play wording from the ready screen.
- [x] Verify the button enters the listening canvas state.
- [x] Run production build and rendered HTML tests.

final result: passed
