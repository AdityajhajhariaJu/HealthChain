import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\index.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("touch-action: pan-x;", "touch-action: pan-x pan-y;")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed touch-action glitch")
