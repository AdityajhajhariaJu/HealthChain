## 2024-05-18 - HTML5 Canvas Render Loop Isolation
**Learning:** HTML5 Canvas components using `requestAnimationFrame` loops can suffer performance bottlenecks if their parent components re-render frequently (e.g., from timer updates in a media player), forcing the canvas component and its hooks to unnecessarily re-evaluate on every tick.
**Action:** Wrap such Canvas components in `React.memo` to isolate them from frequent parent re-renders when their own primitive props (like `theme` or `isPlaying`) have not changed.
