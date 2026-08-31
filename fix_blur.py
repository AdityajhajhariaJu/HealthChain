# -*- coding: utf-8 -*-
import sys

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the glassmorphism block with a clean transparent one
old_glass_code = '''          {/* Floating Glass Content at Bottom */}
          <div style={{ position: 'relative', zIndex: 3, padding: '16px', paddingBottom: '16px' }}>
            <div 
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >'''

new_glass_code = '''          {/* Text Content at Bottom */}
          <div style={{ position: 'relative', zIndex: 3, padding: '16px', paddingBottom: '20px' }}>
            <div 
              style={{
                padding: '0px 8px',
              }}
            >'''

content = content.replace(old_glass_code, new_glass_code)

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
