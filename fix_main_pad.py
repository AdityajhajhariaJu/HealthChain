with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_main = "style={{ paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined }}"
new_main = "style={{ paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined, paddingBottom: isMobile && location.pathname.startsWith('/app/ava') ? 'var(--safe-area-bottom, 12px)' : undefined }}"

content = content.replace(old_main, new_main)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main padding")
