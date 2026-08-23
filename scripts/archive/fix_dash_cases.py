import re

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace setCases(getCases()) with setCases(getCases().filter(c => c.reviews && c.reviews.length > 0))
# But only for the state init and refresh.
# Wait, for activeCase workspace rendering, we want to allow rendering EVEN IF it's not complete?
# If the user opens an incomplete case via URL, `getCase(id)` will still return it!
# But in the dashboard view, `cases` is only used for stats and the "Your Cases" list.

content = content.replace('useState(getCases())', 'useState(getCases().filter((c: any) => c.reviews && c.reviews.length > 0))')
content = content.replace('setCases(getCases())', 'setCases(getCases().filter((c: any) => c.reviews && c.reviews.length > 0))')

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
