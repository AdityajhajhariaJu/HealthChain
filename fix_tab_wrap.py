import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the tab container styles
old_container = """                gap: '4px',
                background: '#FFFFFF',
                padding: '4px 6px',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                overflowX: 'auto',
                width: isMobile ? '100%' : 'auto',
                maxWidth: '100%',
                flexWrap: 'nowrap',
                WebkitOverflowScrolling: 'touch',
                alignItems: 'center',"""

new_container = """                gap: '4px',
                background: '#FFFFFF',
                padding: '4px 6px',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                width: isMobile ? '100%' : 'auto',
                maxWidth: '100%',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-start',"""

content = content.replace(old_container, new_container)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated tab selector to wrap")
