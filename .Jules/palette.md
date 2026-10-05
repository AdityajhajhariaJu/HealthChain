## 2025-02-20 - Ensure Action Island components have type="button" and aria-label
**Learning:** Found an icon-only dismiss button in the `MedicalActionIsland` component without an `aria-label` or explicit `type="button"`, causing unannounced focus stops and potentially unintended form submissions.
**Action:** Always ensure that dynamically generated floating elements and interactive buttons have both `aria-label` attributes and `type="button"`.
