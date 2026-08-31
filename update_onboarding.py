import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/onboarding/OnboardingFlow.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Background image
content = content.replace('url("https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1200&q=80")', 'url("/ava-floral-bg.jpg")')

# 2. Overlay gradient
content = content.replace('linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(6,78,59,0.75) 100%)', 'rgba(255,255,255,0.4)')
content = content.replace('blur(10px)', 'blur(16px)')

# 3. Text Colors
content = content.replace("color: '#FFF'", "color: '#0F172A'")
content = content.replace("color: 'white'", "color: '#0F172A'")
content = content.replace("color: '#E2E8F0'", "color: '#475569'")
content = content.replace("color: '#94A3B8'", "color: '#64748B'")

# 4. Borders
content = content.replace("border: '1px solid rgba(255,255,255,0.2)'", "border: '1px solid rgba(15,23,42,0.1)'")
content = content.replace("border: '1px solid rgba(255,255,255,0.3)'", "border: '1px solid rgba(15,23,42,0.15)'")
content = content.replace("border: '1px solid rgba(255, 255, 255, 0.12)'", "border: '1px solid rgba(15,23,42,0.12)'")
content = content.replace("border: '1px solid rgba(255,255,255,0.05)'", "border: '1px solid rgba(15,23,42,0.05)'")

# 5. Backgrounds (mostly for buttons/icons)
content = content.replace("background: 'rgba(255,255,255,0.1)'", "background: 'rgba(255,255,255,0.8)'")
content = content.replace("background: 'rgba(255,255,255,0.15)'", "background: 'rgba(255,255,255,0.7)'")
content = content.replace("background: 'rgba(255, 255, 255, 0.08)'", "background: 'rgba(255,255,255,0.6)'")
content = content.replace("background: 'rgba(255, 255, 255, 0.15)'", "background: 'rgba(255,255,255,0.7)'")
content = content.replace("background: 'rgba(255,255,255,0.05)'", "background: 'rgba(255,255,255,0.5)'")
content = content.replace("background: 'rgba(255,255,255,0.25)'", "background: 'rgba(255,255,255,0.9)'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated OnboardingFlow style to Ava style')
