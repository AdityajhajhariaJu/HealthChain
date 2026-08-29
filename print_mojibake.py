import os

paths = ['src/components/layout/AppShell.tsx', 'src/services/geminiService.ts']

for path in paths:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if 'â' in line or '€' in line or 'œ' in line or ' ' in line:
                print(f"{path}:{i+1}")
                # print a safe version without causing charmap crash
                safe_line = line.encode('ascii', 'replace').decode('ascii')
                print(safe_line.strip())
