## 2023-10-27 - SensualLineChart Re-renders
**Learning:** Found that scrubbing in the SensualLineChart caused full re-renders, recalculating SVG paths and areas on every `activeIndex` change, which is a common anti-pattern for interactive charts.
**Action:** Use `React.memo` for the component and `useMemo` for expensive computations to ensure smooth interaction and reduce unnecessary CPU cycles during chart scrubbing.
