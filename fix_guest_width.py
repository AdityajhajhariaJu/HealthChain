with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("margin: '6px 16px',", "margin: '6px auto',")
content = content.replace("width: 'calc(100% - 32px)',", "width: '100%',")

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed GuestStickyBanner width")
