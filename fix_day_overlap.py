import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the Day buttons overlapping
old_day_btn = """                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',"""
new_day_btn = """                          style={{
                            flexShrink: 0,
                            padding: '10px 18px',
                            borderRadius: '12px',"""

if old_day_btn in content:
    content = content.replace(old_day_btn, new_day_btn)
else:
    print("Could not find Day button styling")

# Make the scrollbar hidden for the day selector
old_selector = """<div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>"""
new_selector = """<div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>"""
content = content.replace(old_selector, new_selector)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Day buttons overlap and scrollability in Dietician.tsx")
