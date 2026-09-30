## $(date +%Y-%m-%d) - Prevent unnecessary Canvas re-renders
**Learning:** RequestAnimationFrame loops inside HTML5 Canvas components can become massive performance bottlenecks if the parent React component re-renders frequently (e.g., due to timers or state changes like volume/current time updates).
**Action:** Always consider wrapping Canvas components (or any other heavy DOM-manipulating/animation components) in `React.memo` to isolate them from their parent's render cycle, provided their props are stable or primitives.
