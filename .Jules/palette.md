## 2024-05-19 - Missing ARIA labels on Icon-only Close buttons
**Learning:** Found multiple instances where `X` (close/dismiss) buttons missed `aria-label`s, rendering them inaccessible to screen readers. Specifically in floating UI elements like modals and widget popups.
**Action:** Always verify icon-only buttons include an `aria-label` indicating their purpose.
