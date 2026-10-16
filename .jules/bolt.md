## 2023-10-27 - [Isolate Canvas requestAnimationFrame loops]
**Learning:** HTML5 Canvas components using requestAnimationFrame loops cause significant performance overhead if placed directly in React render trees that update frequently (like parent countdown timers via setInterval).
**Action:** Always wrap such Canvas components with React.memo so they only re-render when their explicit props (like `theme` or `isPlaying`) change, preventing them from participating in the parent's tick-based renders.
