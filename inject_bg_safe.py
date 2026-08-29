import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''        background: 'transparent',
      }}
    >
      {/* Outer White Card Container */}'''

new_block = '''        background: 'transparent',
      }}
    >
      {/* Fixed Fullscreen Floral Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'brightness(1.05)' }} />

      {/* Outer White Card Container */}'''

content = content.replace(old_block, new_block)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected fixed floral background")
