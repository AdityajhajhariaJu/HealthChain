import re
with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Outer White Card Container height constraints
old_height = '''          height: isMobile ? 'calc(100dvh - 16px)' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'calc(100dvh - 16px)' : 'calc(100dvh - 150px)','''

new_height = '''          height: isMobile ? '100%' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? '100%' : 'calc(100dvh - 150px)','''

# If it was actually the original 'auto' because my earlier script failed:
old_height_2 = '''          height: isMobile ? 'auto' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'none' : 'calc(100dvh - 150px)','''

content = content.replace(old_height, new_height)
content = content.replace(old_height_2, new_height)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Ava height")
