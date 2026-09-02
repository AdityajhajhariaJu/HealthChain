import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the empty state cards clickable
empty_state_pattern = r"(<div style=\{\{\s*background: '#FFF',\s*borderRadius: '16px',\s*padding: '24px',\s*display: 'flex',\s*alignItems: 'center',\s*justifyContent: 'center',\s*boxShadow: '0 2px 10px rgba\(0,0,0,0\.03\)',\s*border: '1px dashed\s*#E2E8F0',\s*color: '#94A3B8',\s*fontSize: '13px',\s*fontWeight: 500\s*\}\}>)"
new_empty_state = """<div onClick={() => onLogMeal(meal.name)} style={{ background: '#FFF', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px dashed #E2E8F0', color: '#94A3B8', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s, transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = '#FFF'} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>"""

content = re.sub(empty_state_pattern, new_empty_state, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DieticianDashboardTracker.tsx to make empty states clickable")
