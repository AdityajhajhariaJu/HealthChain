## 2026-10-19 - Wrap Canvas loops in React.memo
**Learning:** Found an expensive HTML5 Canvas component (`LivingAtmosphereCanvas`) running a `requestAnimationFrame` loop inside a parent component (`MeditationPlayer`) that re-renders every second due to a countdown timer. This caused significant unnecessary rendering overhead.
**Action:** Always wrap HTML5 Canvas components that manage their own internal rendering loops in `React.memo` to isolate them from frequent parent component state updates, provided their props remain stable.
