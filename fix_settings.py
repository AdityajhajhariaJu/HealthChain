import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onOpenSettings={() => {}}", "onOpenSettings={() => success('Fasting & Diet settings will be available in the next update!')}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx to show toast on settings click")
