import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/GuestStickyBanner.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("margin: '6px auto',", "margin: '0 auto 12px auto',")
content = content.replace("top: 'calc(56px + var(--safe-area-top, 0px) + 6px)',", "top: 'calc(56px + var(--safe-area-top, 0px))',")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Adjusted GuestStickyBanner top margin and sticky position')
