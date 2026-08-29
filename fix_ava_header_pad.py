with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_header_pad = "padding: isMobile ? '16px 20px' : '20px 32px',"
new_header_pad = "padding: isMobile ? 'calc(var(--safe-area-top, 44px) + 16px) 20px 16px 20px' : '20px 32px',"
content = content.replace(old_header_pad, new_header_pad)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added safe area top padding to Ava header")
