with open('src/components/ui/Breadcrumbs.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("style={{ \n      padding: '10px 16px',", "style={{ \n      maxWidth: 1120, margin: '0 auto', width: '100%', padding: '10px 16px',")

with open('src/components/ui/Breadcrumbs.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Constrained Breadcrumbs width")
