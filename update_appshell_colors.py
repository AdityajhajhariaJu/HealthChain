with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'className="mobile-top-bar__points sparkly-gold-pill"' in line:
        for j in range(i, i+20):
            if '<Trophy' in lines[j]:
                lines[j] = '                      <Trophy size={14} color="#78350F" fill="#FDE047" />\n'
            elif '<span style={{ fontWeight: 900, color: \'#FFFFFF\' }}>' in lines[j]:
                lines[j] = '                      <span style={{ fontWeight: 900, color: \'#78350F\' }}>{points} PTS</span>\n'
                break

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Updated AppShell icon colors")
