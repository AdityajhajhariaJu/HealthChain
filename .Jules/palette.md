## 2024-05-18 - Missing ARIA labels in custom media players
**Learning:** Multiple media player components (WorkoutPlayer, MeditationPlayer) consistently omit ARIA labels on custom playback controls (Play, Pause, Skip, Close). This is an accessibility issue pattern in the app's immersive full-screen components.
**Action:** Added semantic `aria-label` attributes to these icon-only buttons. For future immersive components, ensure custom controls have proper screen reader text.
