
## 2024-10-24 - Canvas requestAnimationFrame Performance Bottleneck
**Learning:** HTML5 Canvas components running continuous `requestAnimationFrame` loops are highly susceptible to performance degradation when placed inside parents that re-render frequently (like media players with countdown timers updating every second). The constant parent re-renders interrupt the animation frame loop, causing stuttering and dropped frames on the canvas.
**Action:** Always wrap Canvas components containing internal animation loops in `React.memo` (specifically using `const Component = React.memo<Props>((...)`) to completely isolate them from parent state changes, ensuring smooth 60fps performance regardless of surrounding UI updates.
