import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the button
pattern_btn = r'<button\s*onClick=\{\(\) => setActiveTab\(\'grocery\'\)\}.*?<ShoppingCart size=\{15\} /> Grocery List\s*</button>'
content = re.sub(pattern_btn, '', content, flags=re.DOTALL)

# Remove the content block
pattern_content = r'\{\/\*\s*TAB 3: SMART GROCERY LIST\s*\*\/\}.*?\{\/\*\s*TAB 4: MEDICAL GUARDRAILS\s*\*\/\}'
content = re.sub(pattern_content, '{/* TAB 4: MEDICAL GUARDRAILS */}', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed Grocery List UI")
