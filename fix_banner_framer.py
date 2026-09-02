import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\GuestStickyBanner.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_framer = """        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}"""

replace_framer = """        initial={{ opacity: 0, y: 20, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 20, x: '-50%' }}"""

content = content.replace(find_framer, replace_framer)

# Also remove transform from style just in case
content = content.replace("transform: 'translateX(-50%)',", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Framer Motion transform conflict")
