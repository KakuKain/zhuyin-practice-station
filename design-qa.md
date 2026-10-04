# Practice collection design QA — 2026-10-04

Selected target: `/Users/kaoru/.codex/generated_images/01a0fbf5-48fc-7592-8416-00b533a6e8ce/exec-14ac910a-fc0a-4e67-96bf-30379e8e61d6.png`.
Rendered evidence: `/Users/kaoru/Desktop/AppDev/kid/material-management-2026-10-02/practice-course-groups-mobile.png` (390 × 844).

The selected image and rendered screenshot were opened in the same comparison tool result. The mobile implementation retains the watercolor heading, three mode filters, illustrated expandable course groups, flat question rows, independent gold favorite stars, one course retry action, recent records and slim sound-practice entry. Real saved data replaces illustrative mock data; the reference is taller at its generated resolution, so the live viewport scrolls to remaining history.

Verified course expand/collapse, mode filters, course retry opening the intended saved question, history expansion from three to all four existing records, sound-practice entry and return, cancellation of a star without removing its pending question, and undo restoring the original star. Original stored records were preserved. Added tests cover mixed-mode course queues, filtering, empty courses, and excluding mastered favorites from pending work.

No P0/P1/P2 layout or interaction findings remain in the examined states. Existing original artwork is reused instead of substituting newly generated animals. The course illustration scale is intentionally compact for the real mobile viewport.

final result: passed
