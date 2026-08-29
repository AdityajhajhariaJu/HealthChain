with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_input_style = '''              style={{
                width: '100%',
                padding: isMobile ? '12px 46px 12px 44px' : '16px 56px 16px 52px',
                borderRadius: '99px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'transparent',
                fontSize: isMobile ? '14px' : '15px',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                color: '#0F172A',
                paddingRight: '60px',
              }}
              onFocus={(e) => (e.target.style.borderColor = theme.primary)}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}'''

new_input_style = '''              style={{
                width: '100%',
                padding: isMobile ? '12px 46px 12px 44px' : '16px 56px 16px 52px',
                borderRadius: '99px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                fontSize: isMobile ? '14px' : '15px',
                outline: 'none',
                boxShadow: '0 8px 32px rgba(244, 63, 94, 0.12)',
                color: '#1E293B',
                paddingRight: '60px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = theme.primary; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.25)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)'; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.12)'; }}'''

content = content.replace(old_input_style, new_input_style)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated input area style")
