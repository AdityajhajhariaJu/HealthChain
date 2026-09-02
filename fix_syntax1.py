import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("} catch (err) {", "}\n      } catch (err) {")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Dietician.tsx syntax error")
