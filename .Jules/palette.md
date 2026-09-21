## 2024-09-21 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons (like those used for closing modals or refreshing data) frequently lack accessible names in this application's components, causing screen readers to announce them as "button" with no context, leading to an inaccessible experience.
**Action:** Always ensure that icon-only `<button>` elements have a descriptive `aria-label` attribute (e.g., `aria-label="Close modal"` or `aria-label="Reset timer"`) so that their purpose is clear to assistive technologies.
