for path in ['src/components/layout/AppShell.tsx', 'src/services/geminiService.ts']:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            for c in ['â', '€', 'œ']:
                if c in line:
                    print(f"{path}:{i+1} : {repr(line)}")
