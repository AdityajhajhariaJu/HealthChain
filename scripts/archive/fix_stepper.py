import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the stepper active logic
# For Collaboration Board:
# completed={phase === 'conference' || phase === 'assessment' || phase === 'report'}
# Add 'compiling' to completed

content = content.replace("completed={phase === 'conference' || phase === 'assessment' || phase === 'report'}", "completed={phase === 'compiling' || phase === 'conference' || phase === 'assessment' || phase === 'report'}")

# For Expert Correlation:
# active={phase === 'conference' || phase === 'assessment'}
# Add 'compiling' to active
content = content.replace("active={phase === 'conference' || phase === 'assessment'}", "active={phase === 'compiling' || phase === 'conference' || phase === 'assessment'}")

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
