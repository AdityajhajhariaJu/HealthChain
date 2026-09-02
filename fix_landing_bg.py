import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\auth\Landing.module.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  background-color: #F4FBF7;
  background-image: 
    linear-gradient(to right, rgba(16, 185, 129, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 1px, transparent 1px);"""

replacement = """  background-color: #FBF9F6;
  background-image: 
    linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px);"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated landing page background to premium creme")
