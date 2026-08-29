import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the outer container transparent on mobile and remove borders
old_container_style = '''          background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRadius: isMobile ? '0' : '32px',
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(244, 63, 94, 0.08)',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.7)','''

new_container_style = '''          background: isMobile ? 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)' : 'rgba(255, 255, 255, 0.45)',
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

content = content.replace(old_container_style, new_container_style)

# Also remove the border-bottom from the header on mobile so it doesn't look like a hard line
old_header_style = '''            padding: isMobile ? '16px 20px' : '20px 32px',
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 255, 255, 0.4)','''
new_header_style = '''            padding: isMobile ? '16px 20px' : '20px 32px',
            background: 'transparent',
            borderBottom: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.4)','''

content = content.replace(old_header_style, new_header_style)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Ava container styles")
