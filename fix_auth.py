import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\auth\Auth.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Auth.tsx already uses useNavigate! It has `const navigate = useNavigate();` inside it.
# Let's just replace window.location.replace
content = content.replace("window.location.replace('/app');", "navigate('/app', { replace: true });")
content = content.replace("window.location.replace('/login');", "navigate('/login', { replace: true });")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Auth")
