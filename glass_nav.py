import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\FitnessNav.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make inactive tabs actually glassy
old_inactive_bg = "backgroundColor: isActive ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.5)',"
new_inactive_bg = "background: isActive ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',"

old_shadow = "boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.03)',"
new_shadow = "boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 12px 24px rgba(31, 38, 135, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 20px rgba(255,255,255,0.5)',"

old_border = "border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.8)',"
new_border = "border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.6)',"

old_blur = "backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'"
new_blur = "backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', transform: 'translateZ(0)'"

content = content.replace(old_inactive_bg, new_inactive_bg)
content = content.replace(old_shadow, new_shadow)
content = content.replace(old_border, new_border)
content = content.replace(old_blur, new_blur)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FitnessNav")
