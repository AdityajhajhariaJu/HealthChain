import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change wrapper padding back to 8px instead of 0px
content = content.replace(
    "padding: isMobile ? '0px' : '32px'",
    "padding: isMobile ? '8px' : '32px'"
)

# Restore rounded corners on mobile (looks better with 8px margin)
content = content.replace(
    "borderRadius: isMobile ? '0' : '32px 32px 0 0'",
    "borderRadius: '32px 32px 0 0'"
)
content = content.replace(
    "borderRadius: isMobile ? '0' : '0 0 32px 32px'",
    "borderRadius: '0 0 32px 32px'"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Adjusted to 8px wrapper padding with rounded corners.")
