## 2023-10-25 - Floating Action Island Icon-Only Buttons
**Learning:** Dismiss/close buttons in floating UI components (like action islands) are often icon-only (e.g., just an X icon). In dynamic React components, these frequently miss `aria-label`s, rendering them invisible or confusing to screen readers.
**Action:** Always add `aria-label` and `type="button"` to icon-only close buttons in new or existing components, specifically focusing on overlays and floating action elements.
