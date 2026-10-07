## 2024-10-07 - Add missing aria-label to generic dismiss icons
**Learning:** Dismiss buttons utilizing only icon components (e.g. `<X size={14} />`) without explicit `type="button"` and `aria-label` attributes cause accessibility issues because screen readers announce generic content rather than the button's action.
**Action:** When implementing close/dismiss actions as icon-only components in floating action islands or overlay portals, always wrap them with `<button type="button" aria-label="Descriptive action label">`.
