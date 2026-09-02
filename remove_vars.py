import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const dailySugarLimit = 36;\s*const scannedSugar = 28; // Example for Sugar Loops\s*const sugarPercentage = Math\.min\(\(scannedSugar \/ dailySugarLimit\) \* 100, 100\);', '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed old vars")
