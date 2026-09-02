import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"awardPoints\(5, 'AI Food Scanned & Logged', 'lifestyle', .*?\);", "awardPoints(5, 'AI Food Scanned & Logged', 'lifestyle', `ar_scan_${Date.now()}`);", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed dietician regex")
