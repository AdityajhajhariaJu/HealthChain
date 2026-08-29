import os
for path in ['src/components/layout/AppShell.tsx', 'src/services/geminiService.ts']:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        if 'â' in content or '€' in content or 'œ' in content:
            print(f"Still found Mojibake in {path}")
