## 2023-11-20 - SVG Path Calculation in Render
**Learning:** SVG paths calculated with reduce inside functional components can be unexpectedly expensive, especially when state (like `activeIndex` during hover) changes frequently.
**Action:** Always wrap heavy data generation and SVG string interpolation in `useMemo` for charting components with interactive hover states.
