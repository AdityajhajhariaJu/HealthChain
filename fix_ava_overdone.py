import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert the "overdone" vanishing gradient back to a clean floating glass card
old_container_style = '''          background: isMobile ? 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)' : 'rgba(255, 255, 255, 0.45)',
          backdropFilter: isMobile ? 'none' : 'blur(32px)', 
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(32px)',
          borderRadius: isMobile ? '0' : '32px',
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(244, 63, 94, 0.08)',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.7)','''

new_container_style = '''          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(32px)', 
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '32px',
          margin: isMobile ? '8px' : '0',
          boxShadow: '0 24px 64px rgba(244, 63, 94, 0.08)',
          maxWidth: isMobile ? 'calc(100% - 16px)' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.4)','''

content = content.replace(old_container_style, new_container_style)

# Add back the subtle borderTop to the input area to keep it clean, since it's a glass card again
old_input = "borderTop: isMobile ? 'none' : '1px solid rgba(255,255,255,0.4)',"
new_input = "borderTop: '1px solid rgba(255, 255, 255, 0.4)',"
content = content.replace(old_input, new_input)

# Also fix the header border
old_header = "borderBottom: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.4)',"
new_header = "borderBottom: '1px solid rgba(255, 255, 255, 0.4)',"
content = content.replace(old_header, new_header)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Reverted to a clean floating glass card")
