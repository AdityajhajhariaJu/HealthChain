import sys

# 1. Update CaseDashboard.tsx
with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("padding: isMobile ? '16px' : '0 24px'", "padding: isMobile ? '0' : '0 24px'")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update GuestStickyBanner.tsx
with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    banner = f.read()

# Tweaks for positioning and sleekness
banner = banner.replace("margin: '12px 16px'", "margin: '6px 16px'")
banner = banner.replace("top: '12px'", "top: '6px'")
banner = banner.replace("padding: '10px 16px'", "padding: '6px 12px'")

# Tweaks for button and overlapping
banner = banner.replace("<span>Save Case & Sign In</span>", "<span>Save & Sign In</span>")
banner = banner.replace("fontSize: '11.5px',", "fontSize: '11px',")
banner = banner.replace("padding: '5px 12px',", "padding: '4px 10px',")
banner = banner.replace("marginLeft: '12px'", "marginLeft: '8px'")

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(banner)

print("Updated padding and banner styles")
