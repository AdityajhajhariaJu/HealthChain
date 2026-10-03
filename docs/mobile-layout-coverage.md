# Responsive layout audit

The audit uses fresh synthetic guest profiles. Long conditions, medication instructions, allergies, case titles, document filenames and confirmed memories exercise populated views. Network-dependent AI results are mocked; external requests are blocked where fixtures require isolation.

## Coverage

- Public pages and the main app routes are checked for clipped rendered text after scrolling. Populated profile, case, case records, visit preparation, Diet, Ava and memory pages are tested at 320×760, 390×460, 844×390 and 1440×900.
- All three standalone profile steps and all six clinical intake steps are traversed. Clinical story entry and its navigation dock are also checked with a 460px visible viewport while the layout viewport remains 844px tall.
- Dialog checks include profile editing, medications, hydration, notifications, points, meal logging, memory review, timeline entry, day check-in, breathing participation, starter workflows, research details, trophy details, case deletion confirmation, profile reset confirmation, supporting detail, feedback and article sheets. Destructive confirmations are cancelled. Research detail checks use a synthetic registry response with long summary, eligibility and location text; external links and purchases are not submitted.
- Dialogs are opened above a transformed and scrolled page. Tests assert viewport bounds, text width, header/body separation, control hit targets and restored scrolling. Phone and landscape safe-area insets are simulated.
- Existing garden tests cover Back/Escape, growth, counters, thumbnails, atmosphere persistence and unavailable/slow WebGL. Existing Gut tests cover answer sections, clarification, offline restoration and next actions.
- Chromium and WebKit run the production journeys. Unit tests cover focus handling and nested portal scroll locks. The production build enforces startup and public landing JavaScript budgets.

Release verification covered 94 distinct browser scenarios across the broad run and targeted checks. The broad run passed 89/90; the remaining WebKit ledger journey timed out at its final History click after its reward assertions passed. It then passed twice per engine with reduced motion and a 90-second test budget. All four additional dialog checks and 11 focused unit tests passed, along with types, lint, syntax, repository hygiene and production build budgets. Android and iOS web bundles were copied from the final build.

## Changes

Page dialogs use a shared body portal so page transforms and clipping cannot move or cover them. A reference-counted CSS scroll lock preserves page styles and nested dialogs. Only the top focus trap handles keyboard navigation and Escape. Long labels wrap; case containers cannot expand to a filename's intrinsic width. Feedback occupies page space instead of floating over controls. Meal, memory, trophy and starter-workflow dialog headers stay separate from scrolling content. Research details have a header Close control and wrapping mobile footer actions. The clinical dock follows the visible viewport and device insets.

## Limits

Browser simulation does not establish physical iPhone/Android keyboard, status-bar or background-notification behavior. Authenticated account/admin states and live provider responses require separate acceptance checks with appropriate accounts. Synthetic guest tests do not establish medical accuracy or production API reliability.
