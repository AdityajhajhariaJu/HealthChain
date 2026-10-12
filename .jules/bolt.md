## 2024-10-24 - Memoize Canvas with requestAnimationFrame loops
**Learning:** The MeditationPlayer component uses an internal setInterval to update timeRemaining every second, causing frequent app-wide re-renders. Unmemoized expensive child components (like canvas elements with continuous rendering loops) within its render tree create a severe performance bottleneck.
**Action:** Always wrap HTML5 Canvas components containing requestAnimationFrame loops in React.memo to isolate them from frequent parent component re-renders (like timer updates).
