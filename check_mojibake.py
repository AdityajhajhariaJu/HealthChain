import os

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Check for replacement character
                    if '\ufffd' in content:
                        print(f"Found U+FFFD in {path}")
                    
                    # Check for cp1252 weirdness (like â€)
                    if 'â' in content or '€' in content or 'œ' in content or '' in content:
                        print(f"Found Mojibake in {path}")
            except Exception as e:
                pass
print("Scan complete.")
