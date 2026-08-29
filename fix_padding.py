with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}"
new_str = "style={{ maxWidth: 1120, margin: '0 auto', padding: isMobile ? '16px' : '0 24px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}"

content = content.replace(old_str, new_str)

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added padding to CaseDashboard")
