## 2025-02-14 - Add ARIA label and type to MedicalActionIsland close button
**Learning:** Icon-only close buttons in action islands lack contextual information for screen readers and default to `type="submit"`, risking unintended form submissions.
**Action:** Always append an explicit `aria-label` detailing the action, alongside `type="button"`, to icon-only buttons.
