## 2024-05-18 - Memoize Derived Data in SnapshotViewer
**Learning:** In React components like `SnapshotViewer`, transforming props (e.g., reversing an array `[...reviews].reverse()`) directly in the render cycle can cause unnecessary re-renders of lists and unneeded object creation. Even if the array is relatively small, this adds continuous overhead when active states (like `activeReviewId` or `elifMode`) change.
**Action:** Use `useMemo` to memoize derived data structures when they depend on props that change infrequently, avoiding redundant re-evaluations during unrelated state updates.
