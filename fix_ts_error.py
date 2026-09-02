import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the JarvisCoreOrange prop error
content = content.replace('<JarvisCoreOrange size={isMobile ? 240 : 320} color="#AA8C2C" />', '<JarvisCoreOrange size={isMobile ? 240 : 320} />')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
