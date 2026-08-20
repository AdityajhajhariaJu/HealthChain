import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Case Route Tracker section
pattern = r'\{\s*/\*\s*"?"?"? Case Route Tracker "?"?"?\s*\*/\s*\}.*?<div style=\{\{\s*display: \'flex\', justifyContent: \'center\', gap: \'8px\', marginBottom: \'24px\'\s*\}\}>'

# We replace it by keeping the div below it
content = re.sub(pattern, '<div style={{ display: \'flex\', justifyContent: \'center\', gap: \'8px\', marginBottom: \'24px\' }}>', content, flags=re.DOTALL)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
