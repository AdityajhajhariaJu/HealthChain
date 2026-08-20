import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For completed step props in the stepper, add phase === 'done'
content = content.replace("phase === 'report'", "phase === 'report' || phase === 'done'")

# Fix corrupted state useEffect
# useEffect(() => {
#   if (phase === 'report') {
#      setPhase('dashboard');
#      setDashboardTab('mdt');
#   }
# }, [phase, setPhase, setDashboardTab]);
# Wait, do we even use phase === 'report' anymore? No, it goes from compiling -> done.
# So I should remove that useEffect because it might interfere. Or just leave it, it's a no-op since phase won't be 'report'.

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
