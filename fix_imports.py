import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { getProfile }\nimport { analyzeFoodImage } from '../../services/geminiService'; from '../../services/ProfileEngine';", "import { getProfile } from '../../services/ProfileEngine';\nimport { analyzeFoodImage } from '../../services/geminiService';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed imports")
