import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the useEffect calling loadFitnessData
content = re.sub(r"  useEffect\(\(\) => \{\s*loadFitnessData\(\);\s*\}, \[\]\);", "", content)

# Remove loading and error states, keep them initialized to false/null
content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(false);")
content = content.replace("const [error, setError] = useState<string | null>(null);", "const [error, setError] = useState<string | null>(null);")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed loadFitnessData call from CaseDashboard")
