import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\{isMobile && \(\s*<>\s*<div className=\"mobile-top-bar\">', 
    r'{isMobile && !location.pathname.startsWith("/app/onboarding") && (\n          <>\n            <div className="mobile-top-bar">', content)

content = content.replace("location.pathname.startsWith('/app/trophies')", "location.pathname.startsWith('/app/trophies') || location.pathname.startsWith('/app/onboarding')")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated AppShell')
