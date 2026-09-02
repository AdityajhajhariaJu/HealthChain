import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("`dY>' HealthChain", "`🛒 HealthChain")
content = content.replace("? '~`' : '~?'", "? '[x]' : '[ ]'")
content = content.replace("? '✅' : '⭕'", "? '[x]' : '[ ]'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed emojis in grocery list copy")
