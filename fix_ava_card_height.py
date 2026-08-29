import re
with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("height: isMobile ? 'calc(100% - 16px)' : 'calc(100dvh - 150px)',", "height: isMobile ? '100%' : 'calc(100dvh - 150px)',")
content = content.replace("maxHeight: isMobile ? 'calc(100% - 16px)' : 'calc(100dvh - 150px)',", "maxHeight: isMobile ? '100%' : 'calc(100dvh - 150px)',")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Simplified Outer Card height")
