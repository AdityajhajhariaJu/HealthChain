with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if '<nav className={mobile-tab-bar' in line:
        new_lines.append("          {!location.pathname.startsWith('/app/ava') && (\n")
        new_lines.append(line)
        continue
    
    if '</nav>' in line and 'mobile-tab-bar' not in line:
        # Check if it's the closing tag of mobile-tab-bar
        # Look ahead 5 lines to see if it's followed by </>
        is_closing = False
        for j in range(i, min(len(lines), i+6)):
            if '</>' in lines[j]:
                is_closing = True
                break
        
        if is_closing:
            new_lines.append(line)
            new_lines.append("          )}\n")
            continue
            
    new_lines.append(line)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Wrapped bottom nav")
