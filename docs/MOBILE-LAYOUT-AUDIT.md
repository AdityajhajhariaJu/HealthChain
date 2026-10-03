# Mobile layout audit

Date: 3 October 2026. Starting revision: `56ae98904323493ad0ce62c7198603b8d533d1c1`.

## What changed

The example screenshots exposed dialogs extending under the status bar and headers competing for too little horizontal space. Layouts now use one visible-viewport contract rather than independent fixed heights and inconsistent safe-area fallbacks.

- `useViewportLayout` measures all four device insets and the visual viewport's height/offset. It responds to keyboard and orientation changes through coalesced animation frames, without React state updates. A 44px top fallback applies to native/standalone mobile contexts when the device supplies zero; ordinary browsers retain their measured inset. Pinch zoom preserves the layout viewport.
- `overlay-layout.css` supplies common safe boundaries, maximum heights, scroll containment, nonshrinking headers/footers, and flexible title space. Existing feature colors and content remain feature-specific. Focus-trap wrappers obey the same width/height limits and center their panels.
- Points reserve space for Close. In short views the explanation and Ava routine action move into the scrolling body. Notification titles, counts, Mark all read, and Close no longer compete in one narrow row. Hydration target choices can wrap; tracker/profile footers reserve the bottom inset.
- Ava's composer uses separate grid cells for the editor, attachments, camera, and Send. The shell follows the visible keyboard height.
- Long profile names and records no longer force intrinsic grid widths beyond the phone. Trophy metrics use shrinkable grid tracks. Garden thumbnail labels wrap; the garden uses the visible viewport while retaining its island art and navigation.
- Gut's duplicate mobile structural rules were removed. Its title/Close occupy a stable first row, with My research on a separate row. Theme colors and outcome styling are retained.
- The article sheet's handle occupies normal flow and closing the sheet restores the prior scroll locks. Closed sheets no longer clear another overlay's locks.
- Meal dialog wrappers fit landscape cutouts. The meal logger title and Close share a flexible header. Feedback can scroll in short views. The public changelog stacks its timeline metadata on narrow screens; calm-card labels and medication summaries wrap.

The shared attributes were applied across tracker, account/conflict, profile, consultation, diet, research, administration, and purchase dialogs. Fullscreen onboarding, meditation, camera, and supporting-detail views were also reviewed for viewport/inset placement.

## Browser coverage

Automated checks use synthetic guest data and blocked external requests, with Chromium and WebKit. They exercise 320x760, 390x844, 390x460, and 844x390 layouts, simulated 59px top/34px bottom phone insets, 44px landscape side cutouts, and a software-keyboard viewport whose visible height changes while the layout viewport remains tall.

Nineteen routes are scanned at the top, middle, and bottom: Today, Profile, My Cases, Case Prep, Clinical, Diet, Ava, Trials, Settings, Trophies, Progress, Health Memory, Onboarding, Pricing, Help, Privacy, Terms, Review Demo, and Changelog. Readable text is checked against clipping ancestors and viewport boundaries; intentional horizontal scrollers and ellipsis are distinguished from accidental clipping.

Direct dialog checks cover Points, Notifications, Hydration, Medication, profile steps, garden Back, Gut History and meal entry, Ava controls, everyday food tools, the meal logger, feedback, profile menu, More Tools, and the article sheet. Assertions include safe bounds, horizontal overflow, title/control intersections, reachable actions, and scroll-lock release.

Existing production journeys check the six-screen Clinical draft and original attachment, persisted case/Ava workspace, Gut concerns/refinement and research-failure recovery, urgent Gut guidance, and garden growth/navigation/persistence.

## Validation and limits

- Production build includes TypeScript and startup/landing JavaScript size budgets.
- Viewport unit tests check native/browser fallback, keyboard height/offset updates, pinch zoom, and listener cleanup. Mounted accessibility regression tests cover focus and Escape behavior.
- Syntax and repository hygiene checks are required before commit; the new production layout suite provides repeatable coverage.
- Browser emulation does not establish physical iPhone/Android WebView behavior, real device keyboard/cutout reporting, every authenticated data state, or administrator-only screens. A packaged-device acceptance pass remains useful. No live clinical/provider verdict was changed or certified by this layout audit.

## Recorded results

The final selected production suite passed **40/40 checks** (20 in Chromium, 20 in WebKit), including all eleven layout regressions per browser. Viewport and mounted accessibility unit suites passed **8/8**. Syntax verification, staged repository hygiene, and diff whitespace checks passed.

The final TypeScript/Vite build passed both JavaScript budgets: startup 306,767 raw / 99,299 gzip bytes, public landing 371,308 raw / 121,286 gzip bytes. Capacitor copied the resulting web assets and configuration successfully to both Android and iOS. These copy operations are not native binary builds or physical-device acceptance tests.
