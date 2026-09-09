## 2024-05-18 - Missing ARIA Labels on Floating Modals
**Learning:** Collapsed floating interaction widgets (like `MedicalActionIsland`) often lack screen-reader context for their expand/collapse icons, prioritizing visual space over accessibility.
**Action:** Always verify that "invisible" icon-only interactive components have explicit `aria-label` attributes to ensure they remain functional for screen-reader users, without altering their visual design.
