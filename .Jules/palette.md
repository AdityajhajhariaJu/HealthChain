## 2024-05-24 - Consistent Accessible Icon Buttons
**Learning:** Found several icon-only buttons (like modal dismiss buttons and file removal buttons) lacking explicit labels in `MDTComponents` and `MedicalActionIsland`. These created silent/unannounced focus stops for screen readers.
**Action:** Always provide an `aria-label` attribute on `<button>` elements when their content is solely a visual icon, ensuring screen readers can correctly announce the button's action.
