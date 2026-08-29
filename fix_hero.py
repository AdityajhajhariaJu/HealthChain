with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the Hero section opacity so it's solid and doesn't get washed out by the white background
old_hero_bg = "'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(21,61,69,0.85) 65%, rgba(5,150,105,0.85))'"
new_hero_bg = "'linear-gradient(135deg, #0f172a, #153d45 65%, #059669)'"
content = content.replace(old_hero_bg, new_hero_bg)

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Restored solid colors to Hero section")
