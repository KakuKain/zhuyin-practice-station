# 全部注音 — 第一版實作 QA

final result: passed

## Comparison target and evidence

- Source visual truth: `/Users/kaoru/.codex/generated_images/01a0fbf5-48fc-7592-8416-00b533a6e8ce/exec-0585aff9-2f85-4158-9623-d591b18f15f4.png` (the user's selected first option).
- Implementation: `http://127.0.0.1:4173/`, 注音 tab.
- Implementation screenshot: `outputs/symbol-redesign/desktop.jpg`.
- Full-view comparison: `outputs/symbol-redesign/comparison.png`, source left / implementation right.
- Focused grid/heading comparison: `outputs/symbol-redesign/comparison-detail.png`.
- Source pixels: 1254 × 1254, normalized to 760 × 760; implementation pixels and CSS viewport: 760 × 760, 1 screenshot pixel per CSS pixel. No device frame or browser toolbar in either input.
- State: chart at top, idle. The reference includes one active tile; active-state behavior was checked separately using real playback rather than fabricating a state.
- Additional captures: `outputs/symbol-redesign/mobile-390.jpg` (390 × 844), `mobile-320.jpg` (320 × 740), `combined-mobile.jpg` (390 × 844 with ㄨㄢ playing), `final.jpg` (1280 × 720 normal desktop viewport).

## Findings and comparison history

No actionable P0/P1/P2 findings remain after the following iterations:

1. **[P2, fixed] Decorative bird cropped on narrow layouts.** The centered cover crop clipped the top-right illustration. Set `.symbol-page-watercolor` to `object-position: 85% top`. Revised desktop and mobile captures show the bird and clear central writing area.
2. **[P2, fixed] Excess top spacing hid the next section heading at the comparison viewport.** Reduced heading minimum height to 104px, adjusted tile aspect ratio to 1.08, and reduced group trailing margin to 28px. The revised 760 × 760 full-view comparison now shows the 韻符 heading above persistent navigation.
3. **[P2, fixed] Group headings too light relative to the selected direction.** Computed heading weight was 400. Set 声/韻 section headings to 800; revised full-view and focused comparisons show the clearer hierarchy.
4. **[P2, fixed] Fresh-load hydration warning from heading focus management.** Existing page-position logic added `tabindex=-1` before hydration. Declaring the same attribute in `PageHeading` makes server and client output deterministic. A fresh tab followed by navigation to 注音 returned no warnings or errors.

Both revised full-view and focused images were opened together with their reference regions in combined comparison inputs before passing.

## Required fidelity surfaces

- **Fonts and typography:** retained the site's shared title/UI families and `--font-syllable` so this chart matches other 注音 views. Combined rhymes retain the dedicated `KidCombinedRhymes` font, each rendered as one vertical glyph. The raster mock's heavier glyph drawing is intentionally not treated as a replacement font. Headings and counts do not wrap at 320px. Idle copy no longer includes the tap-to-listen help panel.
- **Spacing and layout rhythm:** removed enclosing group cards and orange dashed tile borders; added separate pale tiles with 10–12px desktop/phone gaps and 6px at the smallest breakpoint. Original educational RTL column order and empty cells remain. No horizontal overflow at 320px or 390px; the smallest measured tile is 47.5 × 44px. Persistent navigation remains accessible.
- **Colors and tokens:** pale blue tile outlines/washes and dark blue consonants follow the selected direction. Existing green vowels and warm combined rhymes remain intentional semantic distinctions. Playing tiles use a stronger blue border, tinted fill, and speaker icon; keyboard focus has a visible outline.
- **Image quality:** generated watercolor raster art follows the selected margin meadow / blue bird direction. Full image is a 1024 × 1024 WebP, 61,310 bytes, with an inline small preview through the existing progressive-image component. The blur applies only to the decorative image; text and symbol buttons render sharply. No CSS/vector replacement of the watercolor illustration or shared logo.
- **Copy/content:** shortened subtitle to `37 個基本符號・22 個結合韻`, simplified section counts to `21 個` / `16 個`, and retained all 37 basic symbols and 22 rhymes. Existing audio provenance and pronunciation notes below the chart remain. Shared header/logo and navigation are deliberately preserved for consistency with the rest of the site.

## Interaction and implementation checks

- Clicked ㄙ: loading status changed to playback status, active tile and speaker indicator appeared.
- Clicked ㄨㄢ: `aria-pressed=true`, loading completed (`aria-busy=false`), playback status appeared, and the glyph computed font was `KidCombinedRhymes`.
- Verified 59 audio buttons: 21 consonants, 16 vowels, and 10/8/4 combined rhymes; no missing labels or altered group order.
- Fresh browser tab: no console errors or warnings after initial render and chart navigation.
- `npm run lint`, `npm run typecheck`, and `npm run build` passed.
- Temporary responsive viewport override reset; finished 注音 preview left open at normal desktop size.

## Open questions and follow-up polish

- None blocking. Shared logo size, standard font metrics, and semantic group colors differ slightly from the generated mock by design; they preserve the existing site's consistency.
- This pass verifies the visual change and playback controls, not a new assessment of audio pronunciation or network performance.

## Implementation checklist

- [x] First option's watercolor margins and open tile layout.
- [x] Existing symbol/rhyme typography and order preserved.
- [x] Mobile, narrow-screen, and playback checks.
- [x] Post-fix full-view and focused comparisons.
- [x] Lint, type checking, and production build.
