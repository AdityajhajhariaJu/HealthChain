import re
with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("borderTop: '1px solid #E2E8F0',", "borderTop: isMobile ? 'none' : '1px solid rgba(255,255,255,0.4)',")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed borderTop from input area on mobile")
