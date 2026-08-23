import os, re

def replace_in_files(directory):
    count = 0
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Replace colors
                    new_content = re.sub(r'(?i)#14B8A6', '#059669', content)
                    new_content = re.sub(r'(?i)#0D9488', '#10B981', new_content)
                    new_content = re.sub(r'rgba\(20,\s*184,\s*166', 'rgba(5, 150, 105', new_content)
                    
                    # Replace common small border radiuses with var(--radius-lg) (24px)
                    new_content = re.sub(r'borderRadius:\s*[\'\"`]?12px[\'\"`]?', 'borderRadius: \'var(--radius-lg)\'', new_content)
                    new_content = re.sub(r'borderRadius:\s*[\'\"`]?16px[\'\"`]?', 'borderRadius: \'var(--radius-lg)\'', new_content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        count += 1
                        print(f'Updated {filepath}')
                except Exception as e:
                    print(f"Skipping {filepath}: {e}")
    print(f'Total files updated: {count}')

replace_in_files('C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src')
