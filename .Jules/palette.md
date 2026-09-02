## 2023-10-25 - Inline Styled Modals Accessibility
**Learning:** Custom inline-styled modals and their icon buttons frequently drop standard keyboard accessibility features (like focus indicators) and miss ARIA labels which are critical for screen readers.
**Action:** Add `aria-label` to icon-only buttons and ensure interactive elements have clear focus states (e.g., using Tailwind's `focus-visible:ring-2` or similar custom styling) when building custom UI components.
