with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "left: document.documentElement.classList.contains('dark-theme')" in line:
        for j in range(i-2, i+6):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
