import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change wrapper padding for the form view (the second match of maxWidth: 800px)
# Actually let's just replace all instances of padding: isMobile ? '16px' : '32px', maxWidth: '800px'
content = content.replace(
    "padding: isMobile ? '16px' : '32px', maxWidth: '800px'",
    "padding: isMobile ? '0px' : '32px', maxWidth: '900px'"
)

# Change top card inner padding
content = re.sub(
    r"padding: isMobile \? '32px 24px' : '48px',",
    r"padding: isMobile ? '32px 16px' : '48px',",
    content
)

# Change bottom card inner padding
content = re.sub(
    r"padding: isMobile \? '24px' : '40px',",
    r"padding: isMobile ? '24px 16px' : '40px',",
    content
)

# Change border radii on mobile to 0 if we are going edge-to-edge
content = re.sub(
    r"borderRadius: '32px 32px 0 0',",
    r"borderRadius: isMobile ? '0' : '32px 32px 0 0',",
    content
)
content = re.sub(
    r"borderRadius: '0 0 32px 32px',",
    r"borderRadius: isMobile ? '0' : '0 0 32px 32px',",
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Card stretched horizontally.")
