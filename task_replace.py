import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "{/* Task Bento Tiles */}"
end_marker = "{/* Bottom Navigation */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # We only want to replace the map block, not everything up to Bottom Nav!
    # Let's find the closing of the task grid div instead.
    # The parent is `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>`
    pass
