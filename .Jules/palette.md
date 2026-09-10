## 2024-05-24 - Missing ARIA Labels on Icon-Only Modal Close Buttons
**Learning:** The `AuthModal` in this app lacked an `aria-label` on its close button, making it difficult for screen reader users to identify its function.
**Action:** Ensure all icon-only buttons, especially in critical modals and overlays like `AuthModal`, have descriptive `aria-label`s.
