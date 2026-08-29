import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure root div is relative
old_wrapper = '''        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
      }}
    >'''
new_wrapper = '''        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
        position: 'relative',
      }}
    >'''

content = content.replace(old_wrapper, new_wrapper)

# Update the floral background
old_floral = '''      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'brightness(1.05)' }} />'''
new_floral = '''      <div style={{ position: 'absolute', inset: '-24px -16px', zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'brightness(1.02)' }} />'''

content = content.replace(old_floral, new_floral)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated floral bg positioning")
