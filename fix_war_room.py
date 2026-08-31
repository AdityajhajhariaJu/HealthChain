import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add /app/war-room to BrandPulseBanner exclusion
content = content.replace("location.pathname.startsWith('/app/sports')", "location.pathname.startsWith('/app/sports') || location.pathname.startsWith('/app/war-room')")

# Add /app/war-room to ActiveCaseBar exclusion
content = content.replace("'/app/sports']", "'/app/sports', '/app/war-room']")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated AppShell to exclude /app/war-room from layout banners')
