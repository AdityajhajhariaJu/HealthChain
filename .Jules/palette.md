## 2025-02-23 - Accessibility of Action Island Dismiss Button
**Learning:** Dismiss buttons on floating/action components (like `MedicalActionIsland`) often lack `aria-label` attributes when using icon-only representations (e.g., `<X />`). Screen readers may not announce their function.
**Action:** Always ensure that icon-only buttons include an explicit `aria-label` attribute (e.g., `aria-label="Dismiss action island"`) to provide context. Furthermore, always explicitly declare `type="button"` for such elements to prevent unintended form submissions within the application.
