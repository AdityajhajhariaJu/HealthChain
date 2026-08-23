import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"// Fix corrupted state where phase was incorrectly saved as 'report'\n\s*useEffect\(\(\) => \{\n\s*if \(phase === 'report'\) \{\n\s*setPhase\('dashboard'\);\n\s*setDashboardTab\('mdt'\);\n\s*\}\n\s*\}, \[phase, setPhase, setDashboardTab\]\);"

content = re.sub(pattern, "", content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
