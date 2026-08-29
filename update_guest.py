with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("maxWidth: '800px',", "maxWidth: '1120px',")

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GuestStickyBanner maxWidth")
