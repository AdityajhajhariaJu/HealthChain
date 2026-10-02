## 2024-10-02 - Icon-only Close Buttons Missing ARIA Labels
**Learning:** Found multiple instances where small UI overlay close buttons (like X from lucide-react) lacked proper ARIA labels. In `PaymentRecoveryBanner`, it relied on `title`, and in `WholeHealthRiverModal`, it had nothing. These buttons are often hidden from screen readers or announced poorly.
**Action:** Always verify `aria-label` is present on any `<button>` that contains only an `<Icon />` with no surrounding text.
