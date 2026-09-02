import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"\s*\{/\*\s*STEP 4: SPECIALTY & GAMING\s*\*/\}\s*<section.*?</section>"
new_content = re.sub(pattern, "", content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Removed Specialty & Gaming section")
