import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the rogue useEffect
old_use_effect = """  // Fix corrupted state where phase was incorrectly saved as 'report'
  useEffect(() => {
    if (phase === 'report' || phase === 'done') {
      setPhase('dashboard');
      setDashboardTab('mdt');
    }
  }, [phase, setPhase, setDashboardTab]);"""

new_use_effect = """  // Fix corrupted state where phase was incorrectly saved as 'report'
  useEffect(() => {
    if (phase === 'report') {
      setPhase('dashboard');
      setDashboardTab('mdt');
    }
  }, [phase, setPhase, setDashboardTab]);"""

content = content.replace(old_use_effect, new_use_effect)

# 2. Also ensure handleIntakeComplete resets dashboardTab to 'specialists' just to be bulletproof
# find: setPhase('dashboard');
# replace: setDashboardTab('specialists');\n      setPhase('dashboard');
content = content.replace("setPhase('dashboard');\n    } finally", "setDashboardTab('specialists');\n      setPhase('dashboard');\n    } finally")


with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
