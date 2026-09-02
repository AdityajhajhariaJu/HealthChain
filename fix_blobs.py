import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add side margins to the wrapper so it's a floating card, not full-bleed
content = content.replace("margin: '0 0 40px 0'", "margin: '0 16px 40px 16px'")

# 2. Make the blobs larger and less blurred so they don't fade into nothingness
content = content.replace("width: '130px', height: '130px'", "width: '180px', height: '180px'")
content = content.replace("width: '110px', height: '110px'", "width: '160px', height: '160px'")
content = content.replace("blur(45px)", "blur(35px)")
content = content.replace("blur(40px)", "blur(35px)")

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed margins and blob intensity")
