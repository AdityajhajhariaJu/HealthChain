with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We need to replace the style block for the motion.div
old_style = '''        style={{
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 118, 110, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(20, 184, 166, 0.3)',
          color: '#ffffff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          zIndex: 40,
          position: 'sticky',
          top: 0,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
        }}'''

new_style = '''        style={{
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 118, 110, 0.75) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: '24px',
          margin: '12px 16px',
          alignSelf: 'center',
          width: 'calc(100% - 32px)',
          maxWidth: '800px',
          color: '#ffffff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          zIndex: 40,
          position: 'sticky',
          top: '12px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        }}'''

content = content.replace(old_style, new_style)

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GuestStickyBanner styles to be a floating, rounded, immersive pill.")
