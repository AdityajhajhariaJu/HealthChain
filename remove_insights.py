import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the component rendering
content = re.sub(r"<div style=\{\{ padding: '0 24px', marginBottom: '32px' \}\}>\s*<ImmersiveFeatureFeed />\s*</div>", "", content)

# Remove the import
content = re.sub(r"import \{ ImmersiveFeatureFeed \} from './ImmersiveFeatureFeed';\n", "", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed ImmersiveFeatureFeed")
