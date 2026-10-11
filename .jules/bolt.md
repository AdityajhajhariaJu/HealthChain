## 2024-05-19 - HTML5 Canvas Memoization in Timer Parents
**Learning:** `MeditationPlayer` has a 1-second countdown interval which forces unmemoized child components (like the expensive `LivingAtmosphereCanvas` rendering loop) to re-render constantly. Wrapping the canvas in `React.memo` isolates the 60fps loop from the parent UI updates.
**Action:** When a parent component manages frequent state updates (like timers or progress bars), evaluate large visual child components for `React.memo` to prevent unnecessary performance degradation, especially those running `requestAnimationFrame` loops.
