## 2025-02-14 - React.memo on SensualLineChart

**Learning:** `SensualLineChart` computes SVG path points on every render if not memoized, which happens frequently as check-ins are logged. React.FC component itself wasn't memoized and SVG points, bezier curve, and SVG fill area paths were constructed every render even if input data didn't change.
**Action:** When working with components like `SensualLineChart` that compute math-heavy visual representations (SVG `points`, `pathData`, `areaData`) from an input array (`data`), use `useMemo` for the mathematical processing so they are only recalculated when their dependencies change. Also wrap the component in `React.memo` to avoid re-rendering entirely when props haven't changed.
