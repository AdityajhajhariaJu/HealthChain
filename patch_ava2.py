import sys
import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the root div style
content = re.sub(
    r"(padding: isMobile \? '0' : '0 24px',\s*)height: '100%',\s*flex: 1, minHeight: 0,",
    r"\1position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,",
    content,
    count=1
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
