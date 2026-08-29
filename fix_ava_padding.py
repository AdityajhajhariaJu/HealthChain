import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the height logic so it relies purely on flex layout on mobile
old_card_style = '''          flex: 1,
          minHeight: 0,
          height: isMobile ? 'calc(100% - 16px)' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'calc(100dvh - 128px - 16px)' : 'calc(100dvh - 150px)','''

new_card_style = '''          flex: 1,
          minHeight: 0,
          height: isMobile ? 'auto' : 'calc(100dvh - 150px)',
          maxHeight: isMobile ? 'none' : 'calc(100dvh - 150px)','''
content = content.replace(old_card_style, new_card_style)

# 2. Fix the huge rogue bottom padding on the input container
old_padding = "padding: isMobile ? '10px 14px 76px 14px' : '24px 32px',"
new_padding = "padding: isMobile ? '12px 14px 16px 14px' : '24px 32px',"
content = content.replace(old_padding, new_padding)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed input padding and layout logic")
