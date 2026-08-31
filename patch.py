import sys
import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove useState for dashboardTab
content = re.sub(r"const \[dashboardTab, setDashboardTab\] = useState<'fitness'\|'meditation'>\('fitness'\);\n?", "", content)

# 2. Remove the Premium Toggle div and the buttons
premium_toggle_pattern = r"      {/\* Premium Toggle \*/}\n      <div style={{ display: 'flex', gap: '24px', padding: '0 24px', borderBottom: '1px solid rgba\(0,0,0,0\.05\)', marginBottom: '24px' }}>.*?</div>\n\n"
content = re.sub(premium_toggle_pattern, "", content, flags=re.DOTALL)

# 3. Remove dashboardTab === 'fitness' conditional
content = content.replace("{dashboardTab === 'fitness' && (", "")

# 4. Find the bridge between fitness and meditation
bridge = '''        </div>
      )}

      {dashboardTab === 'meditation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>'''

content = content.replace(bridge, "")

# 5. Remove the closing brace of dashboardTab === 'meditation'
closing = '''          </div>
        )}'''
content = content.replace(closing, "          </div>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated CaseDashboard.tsx successfully')
