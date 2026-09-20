## 2024-03-24 - Accessibility aria-labels for iterative map components
**Learning:** Found mapped buttons lacking clear screen-reader instructions despite having text values inside.
**Action:** Always verify if a map loop rendering an actionable component (like `<button>`) needs extra explicit context via aria-label for non-sighted users.
