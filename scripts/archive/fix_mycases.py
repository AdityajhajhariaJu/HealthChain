import re

with open('src/features/dashboard/MyCases.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('setCases(getCases())', 'setCases(getCases().filter((c: any) => c.reviews && c.reviews.length > 0))')

with open('src/features/dashboard/MyCases.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
