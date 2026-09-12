## 2024-05-18 - AuthModal Close Button Aria Label
**Learning:** Icon-only close buttons in modals are a common pattern that frequently lack proper accessibility labels, especially when standard UI components are built quickly. Screen readers cannot interpret a generic "X" icon without a text alternative.
**Action:** Always verify that every `<button>` element containing only icons has an explicit `aria-label` attribute describing its function, particularly in critical user paths like authentication flows.
