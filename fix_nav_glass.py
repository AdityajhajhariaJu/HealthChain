import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\FitnessNav.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "background: isActive ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',",
    "background: isActive ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',"
)
content = content.replace(
    "boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 12px 24px rgba(31, 38, 135, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 20px rgba(255,255,255,0.5)',",
    "boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 8px 24px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(255, 255, 255, 0.3)',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FitnessNav heavy glass")
