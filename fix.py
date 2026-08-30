import os
file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(
    "{!location.pathname.startsWith('/app/ava') && (",
    "{!(location.pathname.startsWith('/app/ava') || location.pathname.startsWith('/app/war-room')) && ("
)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)
