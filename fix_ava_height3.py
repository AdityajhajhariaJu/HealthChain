import re
with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_height = '''          height: isMobile ? '100%' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? '100%' : 'calc(100dvh - 150px)','''

new_height = '''          height: isMobile ? 'calc(100% - 16px)' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'calc(100% - 16px)' : 'calc(100dvh - 150px)','''

content = content.replace(old_height, new_height)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated height to calc(100% - 16px)")
