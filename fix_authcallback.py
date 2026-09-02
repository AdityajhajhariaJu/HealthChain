import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\auth\AuthCallback.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useNavigate
if 'useNavigate' not in content:
    content = content.replace("import { useEffect, useRef } from 'react';", "import { useEffect, useRef } from 'react';\nimport { useNavigate } from 'react-router-dom';")

# Add const navigate = useNavigate();
if 'const navigate = useNavigate();' not in content:
    content = content.replace('const handled = useRef(false);', 'const handled = useRef(false);\n  const navigate = useNavigate();')

# Replace window.location.replace
content = content.replace("window.location.replace('/app');", "navigate('/app', { replace: true });")
content = content.replace("window.location.replace('/login');", "navigate('/login', { replace: true });")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed AuthCallback")
