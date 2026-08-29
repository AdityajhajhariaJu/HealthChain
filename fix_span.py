with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("<span style={{ maxWidth: '120px', overflow: 'hidden',\n          border: '1px solid rgba(255, 255, 255, 0.7)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>", "<span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed stray border on span")
