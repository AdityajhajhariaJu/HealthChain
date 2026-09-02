import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"</section>\s*</div>\s*\{\/\* Articles for You \*\/\}", "</section>\n        </div>\n      </div>\n\n      {/* Articles for You */}", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced using regex")
