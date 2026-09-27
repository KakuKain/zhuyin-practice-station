# Design QA — 一年級注音練習站

final result: passed

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

## Follow-up polish

- Add additional lesson-specific illustration assets for the course list when more lessons are published.
- Replace Web Speech playback with curated lesson audio files once the audio source is available.
