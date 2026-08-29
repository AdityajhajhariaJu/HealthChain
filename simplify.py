with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "{profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : ''}.",
    "{profile?.demographics?.name ? ', ' + profile.demographics.name : ''}."
)

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Simplified name block")
