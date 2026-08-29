with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
print("Total open:", content.count('{'))
print("Total close:", content.count('}'))
