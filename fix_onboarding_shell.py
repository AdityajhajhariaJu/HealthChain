import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\layout\AppShell.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need to disable the padding in the AppShell on mobile for the onboarding route.
target_style = """paddingTop: undefined, paddingBottom: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined, transformOrigin: 'top center' }}"""
replacement_style = """paddingTop: location.pathname.startsWith('/app/onboarding') ? '0px' : undefined, paddingBottom: isMobile && (location.pathname.startsWith('/app/ava') || location.pathname.startsWith('/app/onboarding')) ? '0px' : undefined, transformOrigin: 'top center' }}"""

content = content.replace(target_style, replacement_style)

# 2. We need to disable the inner transform for the onboarding route to allow position: fixed to escape, or just let the container fill the screen.
# Actually, since we're removing padding, inset: 0 will just fill the AppShell content area, which now has no padding and fills the screen.
# But wait, mobile-top-bar is rendered inside AppShell and has a fixed height, leaving a gap?
# We should probably just NOT render the top and bottom bars in AppShell if we are on the onboarding route.
