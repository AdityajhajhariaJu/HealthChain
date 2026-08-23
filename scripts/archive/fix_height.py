with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("height: isMobile ? 'calc(100vh - 240px)' : 'auto',", "height: isMobile ? 'calc(100vh - 240px)' : 'calc(100vh - 300px)', minHeight: isMobile ? 'auto' : '600px', maxHeight: isMobile ? 'auto' : '800px',")

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
