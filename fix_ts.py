import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\ContextDistiller.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("let demoStr = [];", "let demoStr: string[] = [];")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed TS error")
