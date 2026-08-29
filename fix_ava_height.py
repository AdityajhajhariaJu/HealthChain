import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the height and maxHeight of the outer card container
# It currently is:
#           height: isMobile ? 'auto' : 'calc(100dvh - 150px)',
#           maxHeight: isMobile ? 'none' : 'calc(100dvh - 150px)',

old_height_logic = '''          height: isMobile ? 'auto' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'none' : 'calc(100dvh - 150px)','''

new_height_logic = '''          height: isMobile ? 'calc(100dvh - 16px)' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'calc(100dvh - 16px)' : 'calc(100dvh - 150px)','''

content = content.replace(old_height_logic, new_height_logic)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated height logic for Ava outer card container")
