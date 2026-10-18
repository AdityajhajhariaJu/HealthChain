## $(date +%Y-%m-%d) - Adding aria-labels to icon-only buttons
**Learning:** Found an icon-only dismiss button in the `PaymentRecoveryBanner` component that was missing an `aria-label`, relying solely on a `title`. Titles alone are often insufficient for proper screen reader announcement and accessibility across different contexts and devices.
**Action:** Always add an explicit `aria-label` to interactive icon-only elements (like close or dismiss buttons) to ensure standard and reliable accessibility support for all users, regardless of whether a `title` attribute is present for tooltips.
