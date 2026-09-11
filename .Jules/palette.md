## 2024-05-18 - Missing Aria Label on Icon-only Close Buttons
**Learning:** In complex modals like `DigestionCalendarHeatmap`, icon-only buttons (like `X` for close) are frequently missing `aria-label`s, making them invisible to screen readers and causing accessibility regressions.
**Action:** Always ensure any icon-only button without visible text includes an `aria-label` attribute to properly describe its action (e.g. `aria-label="Close details"`).
