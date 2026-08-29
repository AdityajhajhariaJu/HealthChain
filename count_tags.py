with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = ''.join(lines[127:290])
open_divs = content.count('<div')
close_divs = content.count('</div')
open_sections = content.count('<section')
close_sections = content.count('</section')

print(f"open_divs: {open_divs}, close_divs: {close_divs}")
print(f"open_sections: {open_sections}, close_sections: {close_sections}")
