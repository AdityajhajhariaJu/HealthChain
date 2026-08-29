import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_outer = '''      style={{
        padding: isMobile ? '0' : '0 24px',
        height: isMobile ? 'calc(100dvh - 128px)' : '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
        position: 'relative',
      }}'''

new_outer = '''      style={{
        padding: isMobile ? '0' : '0 24px',
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
        position: 'relative',
      }}'''

content = content.replace(old_outer, new_outer)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed outer wrapper height logic")
