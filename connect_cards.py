import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Modify Top Card Style
content = re.sub(
    r"borderRadius: isMobile \? '0 0 32px 32px' : '32px',",
    r"borderRadius: '32px 32px 0 0',",
    content
)
content = re.sub(
    r"margin: isMobile \? '-16px -16px 10px -16px' : '0 0 10px 0',",
    r"margin: '0',",
    content
)
content = re.sub(
    r"border: '1px solid rgba\(255,255,255,0.5\)'",
    r"border: '1px solid #E2E8F0',\n          borderBottom: 'none'",
    content
)
content = re.sub(
    r"boxShadow: '0 20px 40px rgba\(168,85,247,0.05\), 0 1px 3px rgba\(168,85,247,0.03\), inset 0 1px 0 rgba\(255,255,255,0.6\)',",
    r"boxShadow: 'none',",
    content
)

# Modify Bottom Card Style
content = re.sub(
    r"<div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', padding: isMobile \? '24px' : '40px', boxShadow: '0 20px 40px rgba\(15,23,42,0.06\)' }}>",
    r"<div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderTop: '1px solid rgba(15,23,42,0.05)', borderRadius: '0 0 32px 32px', padding: isMobile ? '24px' : '40px', boxShadow: '0 20px 40px rgba(15,23,42,0.06)' }}>",
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cards connected!")
