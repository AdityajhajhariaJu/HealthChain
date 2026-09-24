## 2024-05-18 - Avoid unnecessary SVG recalculations
**Learning:** Frequent small state changes (like hovering) in React can trigger continuous recalculations of expensive strings or arrays if un-memoized.
**Action:** Use `useMemo` for non-trivial string manipulations (like creating SVG paths) combined with `React.memo` to guard against redundant recalculations during hover or scrub interactions.
