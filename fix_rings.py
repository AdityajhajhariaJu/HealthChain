import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the grid container for the macro rings with a horizontally scrollable flex row
old_style = """            display: 'grid',
            position: 'relative',
            zIndex: 1,
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px 8px',
            justifyItems: 'center'
          }}>"""

new_style = """            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 1,
            gap: '16px',
            paddingBottom: '16px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>"""

content = content.replace(old_style, new_style)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Macro Rings layout")
