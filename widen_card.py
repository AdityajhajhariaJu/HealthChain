import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Widen the external margin
content = content.replace("margin: '0 16px 40px 16px'", "margin: '0 8px 40px 8px'")

# Widen the internal paddings of the card
content = content.replace("padding: '0 24px', marginBottom: '16px'", "padding: '0 16px', marginBottom: '16px'")
content = content.replace("padding: '0 24px 16px'", "padding: '0 16px 16px'")

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Widened the Calm Space card and increased its internal usable area")
