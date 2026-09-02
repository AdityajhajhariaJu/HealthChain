import os

# 1. Fix DieticianDashboardTracker.tsx
path1 = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path1, 'r', encoding='utf-8') as f:
    content1 = f.read()

content1 = content1.replace(
    "<button style={{ background: '#0F172A'", 
    "<button onClick={onOpenSettings} style={{ background: '#0F172A'"
)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(content1)


# 2. Fix Dietician.tsx
path2 = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

old_cb = "onOpenSettings={() => toast.success('Coming Soon', 'Fasting & Diet settings will be available in the next update!')}"
new_cb = "onOpenSettings={() => { triggerHapticLight(); toast.success('Coming Soon', 'Fasting & Diet settings will be available in the next update!'); }}"

content2 = content2.replace(old_cb, new_cb)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print("Fixed Fasting Get Started button")
