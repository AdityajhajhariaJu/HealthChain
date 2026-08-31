import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hide BrandPulseBanner on /app/sports
content = content.replace("location.pathname.startsWith('/app/onboarding')", "location.pathname.startsWith('/app/onboarding') || location.pathname.startsWith('/app/sports')")

# 2. Hide ActiveCaseBar on /app/sports
content = content.replace("'/app/trophies']", "'/app/trophies', '/app/sports']")

# 3. Hide mobile-top-bar on /app/sports
content = content.replace('!location.pathname.startsWith("/app/onboarding")', '(!location.pathname.startsWith("/app/onboarding") && !location.pathname.startsWith("/app/sports"))')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated AppShell for sports')
