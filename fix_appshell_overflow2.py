with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "style={{ paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,"
new_str = "style={{ overflowY: isMobile && location.pathname.startsWith('/app/ava') ? 'hidden' : 'auto', paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,"

content = content.replace(old_str, new_str)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell")
