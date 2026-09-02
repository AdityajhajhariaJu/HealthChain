import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\auth\Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure it uses useNavigate if it doesn't already
if 'useNavigate' not in content:
    content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useNavigate } from 'react-router-dom';")

# Ensure navigate is initialized if it's not
if 'const navigate = useNavigate()' not in content:
    content = content.replace('const [isLoggedOut, setIsLoggedOut] = useState(false);', 'const [isLoggedOut, setIsLoggedOut] = useState(false);\n  const navigate = useNavigate();')

content = content.replace("window.location.replace('/app');", "navigate('/app', { replace: true });")
content = content.replace("window.location.replace('/login');", "navigate('/login', { replace: true });")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Landing")
