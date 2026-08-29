with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make it completely solid and vibrant
content = content.replace("background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 118, 110, 0.75) 100%)',", "background: 'linear-gradient(90deg, #0F172A 0%, #0F766E 100%)',")

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GuestStickyBanner background")
