## 2024-05-24 - Missing ARIA Labels on Modal Close Buttons
**Learning:** Found a recurring pattern where custom-styled close buttons (using icon components like `<X />`) in custom modal components lack `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Always ensure that any icon-only button, especially those used for critical navigation or modal dismissal, includes a descriptive `aria-label`.
