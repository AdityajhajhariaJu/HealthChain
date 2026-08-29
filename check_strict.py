import os

mojibake_chars = ['â', '€', 'œ', '', '™', '']
found = False

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    for char in mojibake_chars:
                        if char in content:
                            print(f"Found {char.encode('utf-8')} in {path}")
                            found = True
            except Exception:
                pass
if not found:
    print("Clean")
