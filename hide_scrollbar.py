import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add className to the container that has flexWrap: 'nowrap'
# We replaced the grid container recently. Let's find it.
old_div = """          <div style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 1,
            gap: '16px',
            paddingBottom: '16px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>"""

new_div = """          <div className="hide-scrollbar scrollable-row" style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 1,
            gap: '16px',
            paddingBottom: '16px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>"""

content = content.replace(old_div, new_div)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added hide-scrollbar to Macro Rings")
