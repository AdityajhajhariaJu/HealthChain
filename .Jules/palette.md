## 2026-09-05 - ARIA Labels on Toasts
**Learning:** Dismiss buttons on transient components like toasts often lack textual context and use generic icons (like X), creating a barrier for screen reader users who cannot understand the button's action without a text label.
**Action:** Always ensure that icon-only buttons on temporary overlay components (toasts, snackbars, transient banners) are provided with an explicit `aria-label` (e.g., "Dismiss toast") to clearly communicate their specific function.
