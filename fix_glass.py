import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Health Canvas
content = content.replace(
    "background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 100%)',",
    "background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',"
)
content = content.replace(
    "boxShadow: '0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 0 20px rgba(255,255,255,0.5)',",
    "boxShadow: '0 16px 40px rgba(31,38,135,0.1), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(255,255,255,0.3)',"
)
content = content.replace(
    "border: '1px solid rgba(255,255,255,0.6)',",
    "border: '1px solid rgba(255,255,255,0.5)',"
)

# 2. Update Clinical Lens
content = content.replace(
    "background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',",
    "background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',"
)
content = content.replace(
    "boxShadow: '0 8px 32px rgba(0,0,0,0.08)',",
    "boxShadow: '0 16px 40px rgba(31,38,135,0.1), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(255,255,255,0.3)',"
)

# 3. Update Task Bento Tiles (Complete Health Profile)
content = content.replace(
    "background: '#FFF',",
    "background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',"
)
content = content.replace(
    "boxShadow: '0 8px 24px rgba(0,0,0,0.04)',",
    "boxShadow: '0 16px 40px rgba(31,38,135,0.1), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(255,255,255,0.3)',"
)
content = content.replace(
    "border: '1px solid #F8FAFC',",
    "border: '1px solid rgba(255,255,255,0.5)',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CaseDashboard heavy glass")
