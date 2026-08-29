with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<nav className={mobile-tab-bar' in line:
        lines[i] = "          {!location.pathname.startsWith('/app/ava') && (\n            <nav className={mobile-tab-bar }>\n"
    if '</nav>' in line and 'mobile-tab-bar' not in line:
        # Wait, there are two </nav> tags. Let's find the correct one by checking context.
        pass

# Let's use a smarter block replacement for mobile-tab-bar
