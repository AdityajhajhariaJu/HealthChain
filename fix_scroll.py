filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="hide-scrollbar"', 'className="hide-scrollbar scrollable-row"')
content = content.replace('className="hide-scrollbar scroll-snap-x"', 'className="hide-scrollbar scrollable-row"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated CaseDashboard.tsx')
