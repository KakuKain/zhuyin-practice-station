# Sound practice design QA — 2026-10-06

Target: second displayed concept, exec-c03449a4-d7e8-4752-a18c-e35d11935f5e.png.
Viewport: 390 × 844 CSS pixels; browser screenshot at matching dimensions. Reference normalized from generated source to 390 × 844 solely for comparison.
Evidence: ../sound-design-20261006/comparison.png and second-implemented.png.

Initial P2: heading occupied an extra row; playback and symbols were too small. Fixed by placing the heading beside the logo and increasing playback to 150px and choices to 160px. Removed duplicated success copy, reserved next-button space, and positioned choice feedback without increasing card height.

Final comparison: compact header, underline tabs, watercolor replay button, two side-by-side upright symbols, mint successful choice, safe spacing above bottom navigation are present. Uses existing watercolor assets and existing shared fonts instead of generated glyph approximations. Minor P3: existing footer illustration and button texture differ from concept; retained established site assets.

Interaction: preview tested selection, both trial clips, start, repeated rounds, successful choice, next, and wrong choice followed immediately by correct choice without mandatory replay. Wrong-state choices remain enabled. Replay remains available after a correct answer. Typecheck, focused ESLint, build and six existing sound/position tests passed.

final result: passed
