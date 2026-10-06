# Sound practice design QA — 2026-10-06

Target: selected second concept with user-requested animated feedback.
Evidence: ../sound-design-20261006/correct-new.png, feedback-new.png, mobile-feedback.png.
Viewports: 1280 × 720 and 390 × 844.

Correct selection displays a green check circle with a pop animation for 1200 ms, then advances automatically and plays the next question. Wrong selection displays a coral X for 650 ms, stays on the same question, and allows another selection. Manual next controls removed. Existing watercolor playback, upright symbols and underline tabs retained. Overlay reserves no additional layout height; phone controls fit above navigation.

Browser verification: wrong selection remained on question 1, retry with correct answer advanced to question 2 automatically. Mobile X overlay stayed centered and within viewport. Switching to records during feedback canceled the pending transition. Feedback has one accessible status announcement and honors reduced motion.

Validation: typecheck, focused ESLint, production build and all six sound/position tests passed before final accessibility-only adjustment; final typecheck and lint also passed.

final result: passed

## Completion page revision
Selected reference: exec-8659801e-723c-4e3d-95a4-e45a4db7f17a.png, with explicit user revision removing all counts and explanatory copy. Implemented watercolor cat, completion heading and two actions. Evidence: ../sound-design-20261006/completion-final.png (390 × 844). No scroll required; illustration, heading, actions and bottom navigation fit. Completed two rounds through browser, verified repeat starts question 1 and change group returns to pair list. Typecheck and focused ESLint passed. final result: passed.

## Pair selection revision
Target: exec-e0c3f988-9769-4395-b5b9-a3bb915b443c.png. Evidence: ../sound-design-20261006/pairs-final.png at 390 × 844. Seven active tiles retain two equal columns, with seventh in left column. Order: zhi-chi, zhi-zi, chi-ci, an-ai, an-ang, ang-eng, tone-2-3. Removed deferred label and repeated six-question copy; added headphone cat and shared paper texture on pastel surfaces. All tiles and navigation fit without scrolling. P3: subtle existing paper texture lacks the concept's individual plant motifs, preserving lightweight established assets. Browser checked chi-ci trial clips and start/return; typecheck, lint, six tests passed. final result: passed.

## Shared practice heading correction
Removed sound-tab-specific heading position, font size and hidden-art overrides. Browser comparison across free, records, sound at 390×844 confirms identical h1 rect (x24,y68), 35.1px font, 900 weight and family. Evidence: ../sound-design-20261006/title-consistent.png. Seven two-column pair buttons remain visible above navigation after compact phone sizing. Typecheck passed. final result: passed.
