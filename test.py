import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'subtitle=\{([^}]+)\} \/>', r'subtitle={`${\1}`} />', content)

# But it's subtitle={${targetProtein}g} right now, which actually got evaluated to subtitle={g} in powershell if it was $targetProtein?
# Let's check what the file actually has.
