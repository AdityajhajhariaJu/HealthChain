## 2024-05-18 - AuthModal Close Button Missing Aria Label
**Learning:** Found an icon-only button lacking an aria-label attribute inside the AuthModal component, causing accessibility issues for screen readers. Added a descriptive aria-label.
**Action:** Always ensure that icon-only interactive elements contain a descriptive `aria-label` attribute.
