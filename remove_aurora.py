import re

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove aurora-bg and aurora-mesh
content = content.replace('<div className="aurora-bg"', '<div')
content = content.replace('<div className="aurora-mesh" />\n', '')
content = content.replace("<div className='aurora-mesh' />\n", "")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove aurora rules
css = re.sub(r'\.aurora-bg::before,\s*\.aurora-bg::after,\s*\.aurora-mesh\s*\{[^}]+\}', '', css)
css = re.sub(r'\.aurora-bg::before\s*\{[^}]+\}', '', css)
css = re.sub(r'\.aurora-bg::after\s*\{[^}]+\}', '', css)
css = re.sub(r'\.aurora-mesh\s*\{[^}]+\}', '', css)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Removed aurora background.")
